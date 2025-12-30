# erp/tasks.py
from celery import shared_task

from . import models
from .models import KPI, ERPNotification
from django.utils import timezone

@shared_task(queue='erp')
def update_kpi_task(kpi_id):
    """Update KPI values asynchronously"""
    from .models import KPI
    kpi = KPI.objects.get(id=kpi_id)
    # Add KPI calculation logic
    kpi.updated_at = timezone.now()
    kpi.save()
    return f"KPI {kpi.name} updated"

@shared_task(queue='erp')
def send_kpi_alerts():
    """Send KPI alert notifications"""
    critical_kpis = KPI.objects.filter(
        current_value__lt=models.F('target_value') * 0.8,
        is_active=True
    )

    for kpi in critical_kpis:
        ERPNotification.objects.create(
            title=f"Critical KPI Alert: {kpi.name}",
            message=f"KPI {kpi.name} is at {kpi.current_value:.1f} vs target {kpi.target_value}",
            notification_type='kpi_alert',
            module=kpi.module,
            business_unit=kpi.business_unit,
            priority='high'
        )

    return f"Sent {critical_kpis.count()} KPI alerts"