"""
Stock Management Tasks
Safe implementation with lazy Django imports
"""

import logging
from celery import shared_task
from django.apps import apps
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue='stock', max_retries=3)
def process_inventory_adjustment(self, adjustment_id):
    """Process inventory adjustment asynchronously"""
    try:
        InventoryAdjustment = apps.get_model('stock', 'InventoryAdjustment')
        adjustment = InventoryAdjustment.objects.get(id=adjustment_id)

        # Process adjustment logic here
        logger.info(f"Processing adjustment {adjustment_id}")

        # Update stock levels, create transactions, etc.
        return {'status': 'completed', 'adjustment_id': adjustment_id}

    except InventoryAdjustment.DoesNotExist:
        logger.error(f"Adjustment {adjustment_id} not found")
        raise self.retry(countdown=60 * (2 ** self.request.retries))
    except Exception as exc:
        logger.error(f"Adjustment {adjustment_id} failed: {exc}")
        raise self.retry(countdown=300)

@shared_task(queue='reports', time_limit=1800)
def generate_stock_report(report_type, warehouse_id=None):
    """Generate stock report asynchronously"""
    try:
        StockReport = apps.get_model('stock', 'StockReport')
        report = StockReport.objects.create(
            report_type=report_type,
            warehouse_id=warehouse_id,
            status='processing'
        )

        # Report generation logic here
        logger.info(f"Generating {report_type} report {report.id}")

        # Simulate processing
        report.status = 'completed'
        report.save()

        return {'status': 'completed', 'report_id': report.id}
    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return {'status': 'failed', 'error': str(e)}

@shared_task(queue='low_priority')
def cleanup_expired_alerts():
    """Clean up resolved alerts older than 30 days"""
    try:
        StockAlert = apps.get_model('stock', 'StockAlert')
        cutoff_date = timezone.now() - timedelta(days=30)
        deleted_count, _ = StockAlert.objects.filter(
            is_active=False,
            resolved_at__lt=cutoff_date
        ).delete()
        logger.info(f"Cleaned up {deleted_count} expired alerts")
        return {'deleted_alerts': deleted_count}
    except Exception as e:
        logger.error(f"Cleanup failed: {e}")
        return {'status': 'failed', 'error': str(e)}

@shared_task(queue='analytics')
def update_stock_metrics():
    """Update daily stock metrics"""
    try:
        WarehouseStock = apps.get_model('stock', 'WarehouseStock')
        today = timezone.now().date()

        # Update metrics logic here
        logger.info(f"Updated stock metrics for {today}")
        return {'status': 'metrics_updated', 'date': str(today)}
    except Exception as e:
        logger.error(f"Metrics update failed: {e}")
        return {'status': 'failed', 'error': str(e)}

@shared_task(queue='low_priority')
def generate_daily_report():
    """Generate daily summary report"""
    return generate_stock_report.delay('daily_summary')

@shared_task(queue='stock')
def check_low_stock_alerts():
    """Check for low stock alerts"""
    try:
        Stock = apps.get_model('stock', 'Stock')
        WarehouseStock = apps.get_model('stock', 'WarehouseStock')
        StockAlert = apps.get_model('stock', 'StockAlert')

        low_stock_items = WarehouseStock.objects.filter(
            quantity__lte=F('stock__reorder_level')
        )

        for item in low_stock_items:
            # Create alert if not exists
            alert_exists = StockAlert.objects.filter(
                stock=item.stock,
                warehouse=item.warehouse,
                alert_type='low_stock',
                is_active=True
            ).exists()

            if not alert_exists:
                StockAlert.objects.create(
                    stock=item.stock,
                    warehouse=item.warehouse,
                    alert_type='low_stock',
                    severity='high',
                    message=f'Low stock: {item.available_quantity} remaining',
                    value=item.available_quantity
                )

        return {'status': 'completed', 'checked_items': low_stock_items.count()}
    except Exception as e:
        logger.error(f"Low stock check failed: {e}")
        return {'status': 'failed', 'error': str(e)}

# Health check task
@shared_task(queue='low_priority')
def health_check():
    """Health check task"""
    return {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
    }