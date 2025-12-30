# reports/apps.py
"""
Reports App Configuration
Handles signal connections and app initialization
"""

from django.apps import AppConfig
from django.conf import settings

class ReportsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'reports'

    def ready(self):
        """
        App ready method - initializes signals safely
        """
        try:
            # ✅ SAFE SIGNAL IMPORT
            from reports import signals
            self._connect_signals()
        except ImportError as e:
            # ✅ GRACEFUL FALLBACK
            if 'signals' in str(e):
                print("⚠️  reports/signals.py not found - signals disabled")
            else:
                # Re-raise other import errors
                raise e
        except Exception as e:
            # ✅ LOG BUT DON'T CRASH
            print(f"⚠️  Reports app initialization warning: {e}")

    def _connect_signals(self):
        """Safely connect all signals"""
        try:
            # Import signals to connect them
            import reports.signals  # noqa: F401
            print("✅ Reports signals connected successfully")
        except Exception as e:
            print(f"⚠️  Failed to connect reports signals: {e}")