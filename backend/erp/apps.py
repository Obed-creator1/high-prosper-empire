# erp/apps.py
from django.apps import AppConfig

class ErpConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'erp'

    def ready(self):
        try:
            import erp.signals  # noqa
            print("✅ ERP signals connected")
        except ImportError:
            print("⚠️  ERP signals not loaded")