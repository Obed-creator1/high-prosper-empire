# customers/signals.py — FIXED & FULLY OPTIMIZED FOR MULTIPLE COLLECTORS
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Customer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from users.models import CustomUser
from notifications.signals import notify
from notifications.utils import send_notification_with_fallback

@receiver(post_save, sender=Customer)
def customer_updated(sender, instance, created, **kwargs):
    action = "create" if created else "update"
    title = "New Customer Added" if created else "Customer Updated"
    message = f"{instance.name} ({instance.phone})"

    # Notify admins & managers (bulk)
    admins = CustomUser.objects.filter(role__in=['admin', 'ceo', 'manager'])
    if admins.exists():
        notify.send(
            sender=instance,
            recipient=admins,
            verb=action,
            description=message,
            target=instance,
        )
        # Also send via fallback (email/SMS/WhatsApp)
        for admin in admins:
            send_notification_with_fallback(
                admin,
                title,
                message,
                action_url=f"/dashboard/customers/{instance.id}"
            )

    # Notify all collectors assigned to the village
    if instance.village and instance.village.collectors.exists():
        for collector in instance.village.collectors.all():
            send_notification_with_fallback(
                collector,
                title,
                message,
                action_url=f"/dashboard/customers/{instance.id}"
            )

    # Notify customer (if profile updated)
    if instance.user and not created:
        send_notification_with_fallback(
            instance.user,
            "Profile Updated",
            "Your High Prosper profile was updated",
            action_url="/dashboard/profile"
        )

    # Real-time broadcast to dashboard (customer list update)
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "customers_list",
        {
            "type": "customer_event",
            "event": {
                "action": action,
                "customer": {
                    "id": instance.id,
                    "name": instance.name,
                    "phone": instance.phone,
                    "village_name": instance.village.name if instance.village else None,
                    "status": instance.status,
                }
            }
        }
    )


@receiver(post_delete, sender=Customer)
def customer_deleted(sender, instance, **kwargs):
    title = "Customer Deleted"
    message = f"{instance.name} ({instance.phone}) was removed"

    # Notify admins & managers (bulk)
    admins = CustomUser.objects.filter(role__in=['admin', 'ceo', 'manager'])
    if admins.exists():
        notify.send(
            sender=instance,
            recipient=admins,
            verb="delete",
            description=message,
            target=instance,
        )

    # Notify all collectors assigned to the village
    if instance.village and instance.village.collectors.exists():
        for collector in instance.village.collectors.all():
            send_notification_with_fallback(
                collector,
                title,
                message,
                action_url=None
            )

    # Real-time broadcast to dashboard
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "customers_list",
        {
            "type": "customer_event",
            "event": {
                "action": "delete",
                "customer_id": instance.id
            }
        }
    )