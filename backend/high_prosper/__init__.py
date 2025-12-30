"""
High Prosper Services - Project Initialization
"""

# Import Celery app (safe import)
default_app_config = 'high_prosper.apps.HighProsperConfig'

try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError as exc:
    print(f"⚠ Celery import warning: {exc}")
    __all__ = ()