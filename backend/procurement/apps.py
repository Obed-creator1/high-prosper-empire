# procurement/apps.py
from django.apps import AppConfig

class ProcurementConfig(AppConfig):
    name = 'procurement'

    def ready(self):
        import procurement.signals  # noqa