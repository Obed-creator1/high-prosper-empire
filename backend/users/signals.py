from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from .models import UserProfile
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .utils import send_push_notification
from payments.models import Payment

User = get_user_model()

@receiver(post_save, sender=Payment)
def handle_payment_completion(sender, instance, created, **kwargs):
    """
    Send push notification when a payment is marked as completed
    """
    if not created and instance.status == 'completed':
        # instance is the Payment object
        customer = instance.customer  # Assuming Payment has a ForeignKey to Customer
        if customer and customer.device_token:  # Make sure device_token exists
            send_push_notification(
                customer.device_token,
                "Payment Confirmed!",
                f"Thank you {customer.name}! Your payment of {instance.amount} RWF was successful."
            )


@receiver(user_logged_in)
def user_online(sender, user, request, **kwargs):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        f"sidebar_{user.id}",
        {
            "type": "online_status",
            "user_id": user.id,
            "is_online": True
        }
    )

@receiver(user_logged_out)
def user_offline(sender, user, request, **kwargs):
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        f"sidebar_{user.id}",
        {
            "type": "online_status",
            "user_id": user.id,
            "is_online": False
        }
    )

@receiver(user_logged_in)
def handle_user_logged_in(sender, user, request, **kwargs):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "sidebar_broadcast",
        {"type": "online_status", "user_id": user.id, "is_online": True},
    )

@receiver(user_logged_out)
def handle_user_logged_out(sender, user, request, **kwargs):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "sidebar_broadcast",
        {"type": "online_status", "user_id": user.id, "is_online": False},
    )




@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        # Default role = Staff
        role = "Staff"
        group, _ = Group.objects.get_or_create(name=role)

        profile = UserProfile.objects.create(user=instance, role=role, group=group)
        instance.groups.add(group)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, "userprofile"):
        instance.userprofile.save()

# signals.py
@receiver(user_logged_in)
def user_came_online(sender, user, **kwargs):
    user.is_online = True
    user.save(update_fields=['is_online'])

@receiver(user_logged_out)
def user_went_offline(sender, user, **kwargs):
    user.is_online = False
    user.save(update_fields=['is_online'])