from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncDay, TruncMonth
from django.utils import timezone
from datetime import timedelta
from .models import StockTransaction, WarehouseStock, StockBatch

class StockAnalytics:
    @staticmethod
    def get_dashboard_metrics(days=30):
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        metrics = {
            # Stock Levels
            'total_items': WarehouseStock.objects.filter(quantity__gt=0).count(),
            'total_value': WarehouseStock.objects.aggregate(
                total=Sum(F('quantity') * F('unit_price'))
            )['total'] or 0,

            # Stock Health
            'critical_stock': WarehouseStock.objects.filter(
                quantity__lte=F('stock__reorder_level')
            ).count(),
            'low_stock': WarehouseStock.objects.filter(
                quantity__gt=F('stock__reorder_level'),
                quantity__lte=F('stock__min_stock_level')
            ).count(),

            # Movement
            'total_in': StockTransaction.objects.filter(
                transaction_type='in',
                created_at__gte=start_date
            ).aggregate(total=Sum('quantity'))['total'] or 0,
            'total_out': abs(StockTransaction.objects.filter(
                transaction_type='out',
                created_at__gte=start_date
            ).aggregate(total=Sum('quantity'))['total'] or 0),
            'turnover_rate': 0,  # Calculate based on period

            # Batch Analytics
            'expiring_soon': StockBatch.objects.filter(
                expiry_date__lte=timezone.now() + timedelta(days=30),
                remaining_quantity__gt=0
            ).count(),

            # Warehouse Performance
            'warehouse_utilization': {},
        }

        return metrics

    @staticmethod
    def get_trending_items(days=7):
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        trending = StockTransaction.objects.filter(
            created_at__gte=start_date,
            transaction_type='out'
        ).values('stock_id', 'stock__name', 'stock__item_code').annotate(
            total_qty=Sum('quantity'),
            transactions=Count('id')
        ).order_by('-total_qty')[:10]

        return list(trending)

    @staticmethod
    def get_inventory_turnover():
        # Complex calculation for turnover rates
        pass