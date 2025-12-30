# erp/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import ERPDashboard
from reports.models import Report

User = get_user_model()

@receiver(post_save, sender=User)
def create_erp_dashboard(sender, instance, created, **kwargs):
    """Auto-create ERP dashboard for new users"""
    if created:
        ERPDashboard.objects.create(user=instance)

@receiver(post_save, sender=Report)
def update_kpis_on_report(sender, instance, created, **kwargs):
    """Update relevant KPIs when reports are completed"""
    if created and instance.status == 'completed':
        # Example: Update inventory KPIs
        pass  # Add KPI update logic here