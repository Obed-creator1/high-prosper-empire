"""
High Prosper Services - Project Initialization
"""

import django.db.models.options as options

# ✅ Patch for Django 5.2+ — allow legacy "index_together" Meta attribute
# (used by django-notifications and other old libraries)
if 'index_together' not in options.DEFAULT_NAMES:
    options.DEFAULT_NAMES = (*options.DEFAULT_NAMES, 'index_together')

# Import Celery app safely
default_app_config = 'high_prosper.apps.HighProsperConfig'

try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError as exc:
    print(f"⚠ Celery import warning: {exc}")
    __all__ = ()
