from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.db.models import F
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import StockTransaction, WarehouseTransfer, StockAlert
from .consumers import broadcast_stock_transaction, broadcast_transfer_status

@receiver(post_save, sender=StockTransaction)
def stock_transaction_handler(sender, instance, created, **kwargs):
    if created:
        broadcast_stock_transaction(instance)

@receiver(post_save, sender=WarehouseTransfer)
def transfer_status_handler(sender, instance, **kwargs):
    if instance.status in ['in_transit', 'completed', 'cancelled']:
        broadcast_transfer_status(instance)

@receiver(post_save, sender=StockAlert)
def stock_alert_handler(sender, instance, created, **kwargs):
    if created:
        # Broadcast to notification consumer
        pass

@receiver(post_save, sender=StockTransaction)
def broadcast_stock_transaction(sender, instance, created, **kwargs):
    if created:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'stock_updates',
            {
                'type': 'stock_transaction_update',
                'transaction': {
                    'id': instance.id,
                    'stock_id': str(instance.stock.id),
                    'stock_name': instance.stock.name,
                    'quantity': instance.quantity,
                    'type': instance.transaction_type,
                    'warehouse': instance.to_warehouse.name if instance.to_warehouse else None
                },
                'timestamp': instance.created_at.isoformat()
            }
        )

        # Check for low stock after transaction
        if instance.transaction_type in ['out', 'adjustment']:
            async_to_sync(check_and_broadcast_low_stock)(instance.stock)

@async_to_sync
async def check_and_broadcast_low_stock(stock):
    from .models import WarehouseStock
    low_stock_items = WarehouseStock.objects.filter(
        stock=stock,
        quantity__lte=F('stock__reorder_level')
    )

    if low_stock_items.exists():
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            'low_stock_alerts',
            {
                'type': 'low_stock_alert',
                'items': [{
                    'stock_id': str(item.stock.id),
                    'name': item.stock.name,
                    'available': item.available_quantity,
                    'reorder_level': item.stock.reorder_level
                } for item in low_stock_items],
                'timestamp': timezone.now().isoformat()
            }
        )