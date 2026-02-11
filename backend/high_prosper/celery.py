# high_prosper/celery.py — FINAL 2026-PROOF (All Apps + Global Push Notifications)
import os
import sys
from datetime import timedelta
from pathlib import Path
from celery import Celery
from celery.signals import worker_process_init
from celery.schedules import crontab
import logging

# =============================================================================
# 🔧 SAFE DJANGO SETTINGS LOADING
# =============================================================================

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'high_prosper.settings')
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# =============================================================================
# 🐳 CELERY APP CREATION
# =============================================================================

app = Celery('high_prosper')
app.config_from_object('django.conf:settings', namespace='CELERY', silent=True)

# =============================================================================
# 🔄 SAFE TASK AUTODISCOVERY
# =============================================================================

def safe_autodiscover_tasks():
    """Safe task autodiscovery across all apps"""
    TASK_MODULES = [
        'stock.tasks',
        'reports.tasks',
        'hr.tasks',
        'erp.tasks',
        'procurement.tasks',
        'users.tasks',
        'notifications.tasks',  # ← ADDED: Global push tasks
    ]

    for module in TASK_MODULES:
        try:
            app.autodiscover_tasks([module])
            print(f"✓ Discovered tasks in {module}")
        except ImportError as e:
            print(f"⚠ Could not import tasks from {module}: {e}")

safe_autodiscover_tasks()

# =============================================================================
# 🐛 DEBUG TASK
# =============================================================================

@app.task(bind=True, ignore_result=True, name='debug_task')
def debug_task(self):
    """Debug task"""
    print(f'Celery Debug Task: {self.request.id}')
    return {'status': 'debug_completed'}

# =============================================================================
# 📊 COMPREHENSIVE BEAT SCHEDULE
# =============================================================================

app.conf.beat_schedule = {
    # 🚀 ERP & STOCK SYNC
    'sync-erp-inventory': {
        'task': 'stock.tasks.sync_from_erp',
        'schedule': 3600.0,  # Every hour
    },
    'cleanup-expired-batches': {
        'task': 'stock.tasks.cleanup_expired_batches',
        'schedule': 86400.0,  # Daily
    },
    'check-stock-alerts': {
        'task': 'stock.tasks.check_stock_alerts',
        'schedule': crontab(minute=0, hour=2),  # 2:00 AM daily
    },
    'update-dashboard-metrics': {
        'task': 'stock.tasks.update_dashboard_metrics',
        'schedule': 60.0,  # Every minute
    },
    'process-pending-transfers': {
        'task': 'stock.tasks.process_pending_transfers',
        'schedule': crontab(minute=0, hour=0),  # Midnight daily
    },

    # 📈 HR & REPORTS
    'send-daily-notifications': {
        'task': 'hr.tasks.send_daily_notifications',
        'schedule': crontab(hour=9, minute=0),  # 9 AM daily
    },
    'generate-daily-reports': {
        'task': 'stock.tasks.generate_stock_report',
        'schedule': crontab(hour=23, minute=0),  # 11 PM daily
        'args': ('daily_summary', None),
    },
    'send-weekly-pdf-report': {
        'task': 'users.tasks.send_weekly_pdf_report',
        'schedule': crontab(day_of_week=1, hour=8, minute=0),  # Monday 8 AM
    },
    'send-weekly-report-every-monday': {
        'task': 'users.tasks.send_weekly_analytics_report',
        'schedule': crontab(day_of_week=1, hour=8, minute=0),
    },

    # 🔔 GLOBAL PUSH NOTIFICATIONS (NEW!)
    'daily-push-reminder-collectors': {
        'task': 'notifications.tasks.send_push_to_role',
        'schedule': crontab(hour=7, minute=30),  # 7:30 AM daily
        'kwargs': {
            'role_name': 'collector',
            'title': 'Good Morning!',
            'message': 'Check your schedule and tasks for today.',
            'url': '/collector/dashboard'
        }
    },
    'weekly-push-announcement': {
        'task': 'notifications.tasks.send_push_to_all',
        'schedule': crontab(day_of_week=1, hour=9, minute=0),  # Monday 9 AM
        'kwargs': {
            'title': 'Weekly Update',
            'message': 'New features and performance report available!',
            'url': '/dashboard'
        }
    },
    'cleanup-inactive-push-subscriptions': {
        'task': 'notifications.tasks.cleanup_inactive_subscriptions',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    'flag-suspicious-posts-every-hour': {
        'task': 'users.tasks.flag_suspicious_posts',
        'schedule': crontab(minute=0, hour='*'),  # every hour
    },
    'auto-flag-spam-every-30-minutes': {
        'task': 'users.tasks.auto_flag_spam_posts',
        'schedule': crontab(minute='*/30'),  # every 30 minutes
        # 'schedule': crontab(minute=0, hour='*'),  # every hour
    },
    'clean-online-every-5-minutes': {
        'task': 'users.tasks.clean_online_status',
        'schedule': timedelta(minutes=5),
    },
    'cleanup-push-subscriptions-nightly': {
        'task': 'notifications.tasks.cleanup_inactive_subscriptions',
        'schedule': crontab(hour=3, minute=15),  # 3:15 AM daily
        'options': {'queue': 'low-priority'}
    },
}

# =============================================================================
# 🎛️ WORKER PROCESS INITIALIZATION
# =============================================================================

@worker_process_init.connect
def init_worker(**kwargs):
    """Initialize worker process with Django context"""
    try:
        import django
        django.setup(set_prefix=False)
        print("✓ Worker initialized with Django context")
    except Exception as e:
        print(f"⚠ Worker init warning: {e}")

# =============================================================================
# 🔧 ADVANCED CONFIGURATION
# =============================================================================

app.conf.update(
    TASK_SERIALIZER='json',
    ACCEPT_CONTENT=['json'],
    RESULT_SERIALIZER='json',
    TASK_TIME_LIMIT=7200,      # 2 hours max (for ERP sync)
    TASK_SOFT_TIME_LIMIT=3600, # 1 hour warning
    WORKER_PREFETCH_MULTIPLIER=1,
    WORKER_CONCURRENCY=4,

    # Queue routing
    TASK_ROUTES={
        'stock.*': {'queue': 'stock'},
        'reports.*': {'queue': 'reports'},
        'hr.*': {'queue': 'hr'},
        'erp.*': {'queue': 'erp'},
        'analytics.*': {'queue': 'analytics'},
        'warehouse.*': {'queue': 'warehouse'},
        'notifications.*': {'queue': 'notifications'},  # ← Dedicated queue for push
        'low_priority.*': {'queue': 'low_priority'},
    },

    # Result backend (optional - for monitoring)
    RESULT_BACKEND='django-db',
)

# =============================================================================
# 📊 UTILITY TASKS
# =============================================================================

@app.task(name='celery.health_check', queue='low_priority')
def health_check():
    """Health check task"""
    from django.utils import timezone
    return {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'celery_version': app.version,
        'scheduled_tasks': len(app.conf.beat_schedule)
    }

# =============================================================================
# EXPORT
# =============================================================================

__all__ = ['app', 'debug_task', 'health_check']