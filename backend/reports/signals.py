# reports/signals.py
"""
Signal handlers for Reports app
Handles automatic cleanup, notifications, and audit logging
"""

from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from django.utils import timezone
from .models import Report, ReportLog
import logging
import os

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Report)
def log_report_status_change(sender, instance, created, **kwargs):
    """Log report creation and status changes"""
    if created:
        ReportLog.objects.create(
            report=instance,
            level='INFO',
            message=f'Report created: {instance.title}',
            metadata={
                'template': str(instance.template.id) if instance.template else None,
                'format': instance.format,
                'priority': instance.priority
            }
        )
        logger.info(f"New report created: {instance.title} (ID: {instance.id})")

    else:
        # Status changed
        ReportLog.objects.create(
            report=instance,
            level='INFO',
            message=f'Status changed to: {instance.status}',
            metadata={'old_status': kwargs.get('old_status', 'unknown')}
        )

@receiver(pre_delete, sender=Report)
def cleanup_report_files(sender, instance, **kwargs):
    """Clean up report files when deleted"""
    if instance.file:
        try:
            if os.path.exists(instance.file.path):
                os.remove(instance.file.path)
                logger.info(f"Deleted report file: {instance.file.path}")
        except Exception as e:
            logger.error(f"Failed to delete report file {instance.file.path}: {e}")

@receiver(post_delete, sender=Report)
def log_report_deletion(sender, instance, **kwargs):
    """Log report deletion"""
    ReportLog.objects.create(
        report_id=instance.id,  # Will be null but keeps reference
        level='INFO',
        message=f'Report deleted: {instance.title}',
        metadata={'report_id': str(instance.id)}
    )
    logger.info(f"Report deleted: {instance.title} (ID: {instance.id})")

# Optional: Connect signals only when needed
def connect_signals():
    """Explicit signal connection for better performance"""
    post_save.connect(log_report_status_change, sender=Report)
    pre_delete.connect(cleanup_report_files, sender=Report)
    post_delete.connect(log_report_deletion, sender=Report)

# Connect signals when this module is imported
connect_signals()