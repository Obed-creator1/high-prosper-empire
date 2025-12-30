# reports/tasks.py
import uuid

from celery import shared_task
from celery.result import AsyncResult
import logging
from django.utils import timezone
from .models import Report, ReportLog, ReportTemplate
import pandas as pd
import json
from io import BytesIO
import os

logger = logging.getLogger(__name__)

@shared_task(bind=True, queue='reports', max_retries=3)
def generate_report_task(self, report_id, template_id, parameters, format, priority):
    """Main report generation task"""
    try:
        report = Report.objects.get(id=report_id)
        template = ReportTemplate.objects.get(id=template_id)

        # Log start
        ReportLog.objects.create(
            report=report,
            level='INFO',
            message=f'Starting report generation: {template.name}',
            metadata={'parameters': parameters, 'format': format}
        )

        # Update status
        report.status = 'generating'
        report.save()

        # Generate data based on template
        data = generate_report_data(template.report_type, parameters)

        # Create file
        file_path = create_report_file(data, format, report.title)

        # Update report
        report.file.name = file_path
        report.status = 'completed'
        report.row_count = len(data) if isinstance(data, list) else 1
        report.completed_at = timezone.now()
        report.duration_seconds = int((timezone.now() - report.created_at).total_seconds())
        report.save()

        # Log success
        ReportLog.objects.create(
            report=report,
            level='INFO',
            message='Report generation completed successfully',
            metadata={'rows': report.row_count, 'duration': report.duration_seconds}
        )

        return {
            'status': 'success',
            'report_id': str(report.id),
            'file_path': file_path,
            'rows': report.row_count
        }

    except Exception as exc:
        logger.error(f"Report generation failed: {exc}")
        ReportLog.objects.create(
            report=report,
            level='ERROR',
            message=str(exc),
            metadata={'traceback': str(exc)}
        )
        report.status = 'failed'
        report.error_message = str(exc)
        report.save()
        raise self.retry(countdown=60 * (self.request.retries + 1))

def generate_report_data(report_type, parameters):
    """Generate report data based on type"""
    from stock.models import Stock, WarehouseStock, StockTransaction

    if report_type == 'inventory_valuation':
        stocks = WarehouseStock.objects.select_related('stock', 'warehouse')
        return [{
            'stock_code': ws.stock.item_code,
            'stock_name': ws.stock.name,
            'warehouse': ws.warehouse.name,
            'quantity': ws.quantity,
            'unit_price': ws.unit_price,
            'total_value': ws.quantity * ws.unit_price
        } for ws in stocks]

    elif report_type == 'stock_movement':
        transactions = StockTransaction.objects.filter(
            created_at__gte=parameters.get('start_date'),
            created_at__lte=parameters.get('end_date')
        )
        return [{
            'transaction_id': t.id,
            'stock': t.stock.name,
            'type': t.transaction_type,
            'quantity': t.quantity,
            'warehouse': t.warehouse.name,
            'date': t.created_at
        } for t in transactions]

    # Add more report types...
    return []

def create_report_file(data, format, title):
    """Create report file in specified format"""
    if format == 'excel':
        df = pd.DataFrame(data)
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Report', index=False)
            # Add summary sheet
            summary = pd.DataFrame({
                'Metric': ['Total Items', 'Total Value'],
                'Value': [len(data), df.get('total_value', [0]).sum()]
            })
            summary.to_excel(writer, sheet_name='Summary', index=False)
        output.seek(0)

        filename = f"reports/{timezone.now().strftime('%Y/%m/%d')}/{title}_{uuid.uuid4().hex[:8]}.xlsx"
        with open(filename, 'wb') as f:
            f.write(output.getvalue())
        return filename

    # Add PDF, CSV formats
    return None