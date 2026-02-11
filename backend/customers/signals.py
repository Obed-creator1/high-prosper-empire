# customers/signals.py — HIGH PROSPER NOTIFICATIONS ENGINE 2026
from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.core.cache import cache

from users.models import CustomUser
from notifications.signals import notify
from notifications.utils import send_notification_with_fallback
from .models import Sector, Cell, Village, Customer
from .utils import send_sms
from high_prosper import settings
from datetime import datetime
timestamp = datetime.now().strftime("%d %b %Y")

# Cache invalidation
def invalidate_village_cache(village):
    if village:
        cache.delete_pattern(f"village_metrics_{village.id}_*")
        cache.delete_pattern("village_metrics_list_*")

# Get recipients based on role and object scope
def get_recipients_for_object(obj):
    recipients = set()

    # CEO & Admin see everything
    admins = CustomUser.objects.filter(role__in=['ceo', 'admin'])
    recipients.update(admins)

    # Sector Manager: objects in their sector
    sector = getattr(obj, 'sector', None)
    if not sector:
        if hasattr(obj, 'cell') and obj.cell:
            sector = obj.cell.sector
        elif hasattr(obj, 'village') and obj.village:
            sector = obj.village.cell.sector if obj.village.cell else None

    if sector:
        managers = sector.managers.all()
        recipients.update(managers)

    # Collectors: objects in their village
    village = getattr(obj, 'village', None)
    if village and village.collectors.exists():
        recipients.update(village.collectors.all())

    return recipients

# Send unified notification
def send_event_notification(obj, action, title, message, action_url=None):
    recipients = get_recipients_for_object(obj)
    if not recipients:
        return

    # Django-notifications
    notify.send(
        sender=obj,
        recipient=list(recipients),
        verb=action,
        description=message,
        target=obj,
    )

    # Fallback notifications
    for user in recipients:
        send_notification_with_fallback(user, title, message, action_url=action_url)

    # Direct SMS to collectors + admins
    collector_phones = [u.phone for u in recipients if u.role == 'collector' and u.phone]
    admin_phones = getattr(settings, 'ADMIN_SMS_PHONES', [])
    all_phones = list(set(collector_phones + admin_phones))

    if all_phones:
        sms_body = f"High Prosper Alert\n{title}\n{message}"
        if action_url:
            sms_body += f"\nView: {action_url}"
        send_sms(
            all_phones,
            title=title,
            message=message,
            action_url=action_url,
            timestamp=timestamp
        )

    # Real-time WebSocket
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            "dashboard_notifications",
            {
                "type": "notification.event",
                "event": {
                    "title": title,
                    "message": message,
                    "action": action,
                    "object_type": ContentType.objects.get_for_model(obj.__class__).model,
                    "object_id": obj.id,
                    "timestamp": timezone.now().isoformat(),
                    "url": action_url
                }
            }
        )

# === SECTOR ===
@receiver(post_save, sender=Sector)
def sector_changed(sender, instance, created, **kwargs):
    action = "created" if created else "updated"
    title = f"Sector {action.capitalize()}"
    message = f"Sector '{instance.name}' was {action} by admin."
    send_event_notification(instance, action, title, message, "/dashboard/sectors/")

@receiver(post_delete, sender=Sector)
def sector_deleted(sender, instance, **kwargs):
    title = "Sector Deleted"
    message = f"CRITICAL: Sector '{instance.name}' was permanently deleted."
    send_event_notification(instance, "deleted", title, message)

# === CELL ===
@receiver(post_save, sender=Cell)
def cell_changed(sender, instance, created, **kwargs):
    action = "created" if created else "updated"
    title = f"Cell {action.capitalize()}"
    message = f"Cell '{instance.name}' in sector '{instance.sector.name}' was {action}."
    send_event_notification(instance, action, title, message, "/dashboard/cells/")

@receiver(post_delete, sender=Cell)
def cell_deleted(sender, instance, **kwargs):
    title = "Cell Deleted"
    message = f"Cell '{instance.name}' in sector '{instance.sector.name}' was deleted."
    send_event_notification(instance, "deleted", title, message)

# === VILLAGE ===
@receiver(post_save, sender=Village)
def village_changed(sender, instance, created, **kwargs):
    # Prevent notification spam on metric refresh
    if kwargs.get('raw') or not hasattr(instance, '_metrics_updated'):
        return
    action = "created" if created else "updated"
    title = f"Village {action.capitalize()}"
    cell_name = instance.cell.name if instance.cell else "Unassigned"
    message = (
        f"Village: {instance.name}\n"
        f"Cell: {cell_name}\n"
        f"Revenue Target: RWF {instance.monthly_revenue_target:,}\n"
        f"New Customers Target: +{instance.monthly_new_customers_target}"
    )
    if not created:
        message = f"Targets/performance updated:\n{message}"

    send_event_notification(instance, action, title, message, f"/dashboard/villages/{instance.id}")
    invalidate_village_cache(instance)

@receiver(post_delete, sender=Village)
def village_deleted(sender, instance, **kwargs):
    title = "Village Deleted — URGENT"
    message = f"Village '{instance.name}' was permanently deleted.\nAll data lost. Contact admin immediately."
    send_event_notification(instance, "deleted", title, message)

# === COLLECTOR ASSIGNMENT CHANGES ===
@receiver(m2m_changed, sender=Village.collectors.through)
def village_collectors_changed(sender, instance, action, reverse, pk_set, **kwargs):
    if action in ['post_add', 'post_remove', 'post_clear']:
        added = removed = ""
        if action == 'post_add':
            added_users = CustomUser.objects.filter(pk__in=pk_set)
            added = ", ".join([u.get_full_name() or u.username for u in added_users])
            title = "Collectors Assigned"
            message = f"New collectors assigned to {instance.name}: {added}"
        elif action == 'post_remove':
            removed_users = CustomUser.objects.filter(pk__in=pk_set)
            removed = ", ".join([u.get_full_name() or u.username for u in removed_users])
            title = "Collectors Removed"
            message = f"Collectors removed from {instance.name}: {removed}"
        else:
            title = "All Collectors Cleared"
            message = f"All collectors removed from village {instance.name}"

        send_event_notification(instance, "collectors_changed", title, message, f"/dashboard/villages/{instance.id}")

# === CUSTOMER ===
@receiver(post_save, sender=Customer)
def customer_changed(sender, instance, created, **kwargs):
    action = "created" if created else "updated"
    title = "Customer " + ("Added" if created else "Updated")
    village_name = instance.village.name if instance.village else "Unassigned"
    message = f"Customer: {instance.name}\nPhone: {instance.phone}\nVillage: {village_name}"

    send_event_notification(instance, action, title, message, f"/dashboard/customers/{instance.id}")
    invalidate_village_cache(instance.village)

@receiver(post_delete, sender=Customer)
def customer_deleted(sender, instance, **kwargs):
    title = "Customer Deleted"
    village_name = instance.village.name if instance.village else "Unassigned"
    message = f"Customer removed:\n{instance.name} ({instance.phone})\nFrom village: {village_name}"
    send_event_notification(instance, "deleted", title, message)
    invalidate_village_cache(instance.village)