import requests
from django.conf import settings
import json
from celery import shared_task
from .models import StockTransaction, Stock

class ERPIntegration:
    @staticmethod
    def sync_to_erp(transaction):
        """Sync stock transactions to external ERP"""
        if not settings.ERP_ENABLED:
            return

        payload = {
            'transaction_id': transaction.id,
            'stock_id': str(transaction.stock.id),
            'item_code': transaction.stock.item_code,
            'quantity': transaction.quantity,
            'transaction_type': transaction.transaction_type,
            'unit_price': float(transaction.unit_price),
            'warehouse': transaction.to_warehouse.name if transaction.to_warehouse else None,
            'timestamp': transaction.created_at.isoformat(),
        }

        try:
            response = requests.post(
                settings.ERP_WEBHOOK_URL,
                json=payload,
                headers={'Authorization': f'Bearer {settings.ERP_API_KEY}'},
                timeout=10
            )
            response.raise_for_status()
        except Exception as e:
            # Log error and retry later
            sync_to_erp_delayed.apply_async(args=[transaction.id], countdown=300)

    @staticmethod
    def import_from_erp():
        """Import stock data from ERP system"""
        if not settings.ERP_ENABLED:
            return

        try:
            response = requests.get(
                f"{settings.ERP_API_URL}/inventory",
                headers={'Authorization': f'Bearer {settings.ERP_API_KEY}'},
                timeout=30
            )
            response.raise_for_status()
            erp_data = response.json()

            # Process and import
            for item in erp_data.get('items', []):
                stock, created = Stock.objects.update_or_create(
                    erp_sync_id=item['id'],
                    defaults={
                        'item_code': item['sku'],
                        'name': item['name'],
                        'quantity': item['quantity'],
                        # ... other fields
                    }
                )

        except Exception as e:
            # Log error
            pass

# Celery Tasks
@shared_task(bind=True)
def sync_to_erp_delayed(self, transaction_id):
    try:
        transaction = StockTransaction.objects.get(id=transaction_id)
        ERPIntegration.sync_to_erp(transaction)
    except StockTransaction.DoesNotExist:
        pass
    except Exception as exc:
        # Retry up to 3 times
        raise self.retry(exc=exc, countdown=60 * 2 ** self.request.retries, max_retries=3)