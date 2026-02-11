# backend/users/signals.py
from django.db.models.signals import post_save, pre_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import CustomUser, UserProfile, Activity, Post, Comment, Reaction, Share, Friendship, BlockedUser
from .serializers import (
    UserSerializer, UserMinimalSerializer, ActivitySerializer,
    PostSerializer, CommentSerializer, ReactionSerializer, ShareSerializer, FriendshipSerializer
)
from .utils import send_push_notification
from payments.models import Payment

User = get_user_model()

# ─── Helper Functions ──────────────────────────────────────────────────────

def is_super_admin_ceo(user):
    """Check if user is superuser, admin, or CEO"""
    return user.is_superuser or user.role in ['admin', 'ceo']


def send_to_user_group(user_id, message_type, data):
    """Send real-time message to a specific user's channel group"""
    if not user_id:
        return
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {"type": message_type, **data}
    )


def send_to_admin_group(message_type, data):
    """Send real-time message to all admins/CEOs/superusers"""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "admin_group",
        {"type": message_type, **data}
    )


def broadcast_model_update(instance, action, serializer_class, extra_data=None):
    """
    Generic real-time broadcast for model changes:
    - To admins always
    - To affected user(s) if applicable
    """
    serializer = serializer_class(instance)
    data = serializer.data
    data['action'] = action
    data['model'] = instance.__class__.__name__.lower()

    if extra_data:
        data.update(extra_data)

    # Always notify admins
    send_to_admin_group("model_update", data)

    # Notify affected users
    if hasattr(instance, 'user') and instance.user:
        send_to_user_group(instance.user.id, "model_update", data)
    if hasattr(instance, 'from_user') and instance.from_user:
        send_to_user_group(instance.from_user.id, "model_update", data)
    if hasattr(instance, 'to_user') and instance.to_user:
        send_to_user_group(instance.to_user.id, "model_update", data)


def log_activity(user, action_type, extra_data=None):
    """Helper to create Activity log entry"""
    if not user or not user.is_authenticated:
        return
    Activity.objects.create(
        user=user,
        action_type=action_type,
        extra_data=extra_data or {},
        ip_address=user.last_login_ip if hasattr(user, 'last_login_ip') else None,
        user_agent=user.last_login_user_agent if hasattr(user, 'last_login_user_agent') else None
    )


# ─── User Online/Offline & Activity Signals ────────────────────────────────

@receiver(user_logged_in)
def handle_user_logged_in(sender, user, request, **kwargs):
    """Update online status and log activity"""
    user.is_online = True
    user.last_seen = timezone.now()
    user.save(update_fields=['is_online', 'last_seen'])

    # Log login activity
    log_activity(user, 'login', {
        'ip': request.META.get('REMOTE_ADDR'),
        'user_agent': request.META.get('HTTP_USER_AGENT')
    })

    # Broadcast online status
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "sidebar_broadcast",
        {"type": "online_status", "user_id": user.id, "is_online": True}
    )


@receiver(user_logged_out)
def handle_user_logged_out(sender, user, request, **kwargs):
    """Update offline status and log activity"""
    user.is_online = False
    user.last_seen = timezone.now()
    user.save(update_fields=['is_online', 'last_seen'])

    # Log logout activity
    log_activity(user, 'logout')

    # Broadcast offline status
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "sidebar_broadcast",
        {"type": "online_status", "user_id": user.id, "is_online": False}
    )


@receiver(pre_save, sender=CustomUser)
def update_last_seen_on_profile_change(sender, instance, **kwargs):
    """Update last_seen on any profile-related change"""
    if instance.pk:
        try:
            old = sender.objects.get(pk=instance.pk)
            if old.profile_picture_url != instance.profile_picture_url or \
                    old.phone != instance.phone or \
                    old.role != instance.role:
                instance.last_seen = timezone.now()
        except sender.DoesNotExist:
            pass


# ─── User Creation/Update/Delete ──────────────────────────────────────────

@receiver(post_save, sender=CustomUser)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """Create profile on new user + broadcast updates"""
    if created:
        # Create default profile
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        # Assign default group based on role
        if instance.role:
            group, _ = Group.objects.get_or_create(name=instance.role.capitalize())
            instance.groups.add(group)

        # Broadcast new user creation
        broadcast_model_update(instance, 'created', UserSerializer)

        # Notify admins
        send_push_notification(
            None,  # or admin group token
            "New User Registered",
            f"New user: {instance.get_full_name()} ({instance.role or 'User'})"
        )
    else:
        # Broadcast update
        broadcast_model_update(instance, 'updated', UserSerializer)


@receiver(pre_delete, sender=CustomUser)
def handle_user_delete(sender, instance, **kwargs):
    """Soft-delete or cleanup on user deletion"""
    # Soft delete instead of hard delete (recommended)
    instance.is_deleted = True
    instance.is_active = False
    instance.save(update_fields=['is_deleted', 'is_active'])

    # Broadcast deletion (soft)
    data = UserSerializer(instance).data
    data['action'] = 'soft_deleted'
    send_to_admin_group("model_delete", data)

    # Optional: hard delete cleanup (if you ever delete permanently)
    # instance.profile.delete()
    # instance.activities.all().delete()


# ─── Activity Logging on Key Events ────────────────────────────────────────

@receiver(post_save, sender=Post)
def log_post_activity(sender, instance, created, **kwargs):
    """Auto-log post creation/update"""
    action = 'posted' if created else 'updated_post'
    log_activity(instance.user, action, {'post_id': instance.id})


@receiver(post_save, sender=Comment)
def log_comment_activity(sender, instance, created, **kwargs):
    action = 'commented' if created else 'updated_comment'
    log_activity(instance.user, action, {'comment_id': instance.id})


@receiver(post_save, sender=Reaction)
def log_reaction_activity(sender, instance, created, **kwargs):
    if not created:
        return

    target_id = getattr(instance, 'object_id', None)
    target_type = (
        instance.content_type.model
        if hasattr(instance, 'content_type') and instance.content_type
        else None
    )

    log_activity(instance.user, f'reacted_{instance.reaction_type}', {
        'target_id': target_id,
        'target_type': target_type
    })


@receiver(post_save, sender=Share)
def log_share_activity(sender, instance, created, **kwargs):
    if created:
        log_activity(instance.sharer, 'shared', {'shared_content_id': instance.content_object.id})


# ─── Payment & Other Signals ───────────────────────────────────────────────

@receiver(post_save, sender=Payment)
def handle_payment_completion(sender, instance, created, **kwargs):
    if not created and instance.status == 'completed':
        customer = instance.customer
        if customer and customer.device_token:
            send_push_notification(
                customer.device_token,
                "Payment Confirmed!",
                f"Thank you {customer.name}! Your payment of {instance.amount} RWF was successful."
            )
        log_activity(customer, 'payment_completed', {'amount': instance.amount})


# ─── Friendship / Block Signals ────────────────────────────────────────────

@receiver(post_save, sender=Friendship)
def handle_friendship_change(sender, instance, created, **kwargs):
    """Real-time notifications for friend requests & acceptances"""
    if created:
        # New friend request
        send_to_user_group(
            instance.to_user.id,
            "friend_request",
            {
                "from_user": UserSerializer(instance.from_user).data,
                "friendship_id": instance.id,
                "status": instance.status
            }
        )
        send_push_notification(
            instance.to_user.id,
            "New Friend Request",
            f"{instance.from_user.get_full_name()} sent you a friend request!"
        )
        log_activity(instance.from_user, 'friend_request_sent', {'to_user': instance.to_user.id})

    elif instance.status == 'accepted':
        send_to_user_group(instance.from_user.id, "friendship_accepted", {
            "friend": UserSerializer(instance.to_user).data
        })
        send_to_user_group(instance.to_user.id, "friendship_accepted", {
            "friend": UserSerializer(instance.from_user).data
        })
        send_push_notification(
            instance.from_user.id,
            "Friend Request Accepted",
            f"{instance.to_user.get_full_name()} accepted your friend request!"
        )
        log_activity(instance.from_user, 'friendship_accepted', {'with_user': instance.to_user.id})

    elif instance.status == 'rejected':
        send_to_user_group(instance.from_user.id, "friend_request_rejected", {
            "from_user": UserSerializer(instance.to_user).data
        })
        send_push_notification(
            instance.from_user.id,
            "Friend Request Rejected",
            f"{instance.to_user.get_full_name()} declined your friend request."
        )


@receiver(post_save, sender=BlockedUser)
def handle_block_event(sender, instance, created, **kwargs):
    if created:
        # User blocked
        send_to_user_group(
            instance.blocked.id,
            "user_blocked",
            {"blocked_by": UserSerializer(instance.blocker).data}
        )
        log_activity(instance.blocker, 'blocked_user', {'blocked': instance.blocked.id})


# ─── Generic Model Update Broadcast (for other models if needed) ───────────

@receiver(post_save)
def generic_model_update(sender, instance, created, **kwargs):
    """Catch-all for broadcasting model changes (optional - can be disabled)"""
    if hasattr(sender, '_meta') and sender._meta.app_label == 'users':
        serializer_class = globals().get(f"{sender.__name__}Serializer")
        if not serializer_class:
            return  # No serializer, skip broadcasting
        action = 'created' if created else 'updated'
        broadcast_model_update(instance, action, serializer_class)


@receiver(post_save, sender=BlockedUser)
def notify_on_block(sender, instance, created, **kwargs):
    if created:
        send_to_user_group(
            instance.blocked.id,
            "user_blocked",
            {
                "blocked_by": UserMinimalSerializer(instance.blocker).data,
                "reason": instance.reason,
                "expires_at": instance.expires_at
            }
        )
        send_push_notification(
            instance.blocked.id,
            "You have been blocked",
            f"You are now blocked by {instance.blocker.get_full_name()}"
        )

@receiver(post_save, sender=Activity)
def broadcast_new_activity(sender, instance, created, **kwargs):
    """
    When a new Activity is created:
    1. Send real-time update to the affected user
    2. Send to all admins/CEOs/superusers
    3. Optionally trigger push notification
    """
    if not created:
        return  # Only broadcast on creation

    channel_layer = get_channel_layer()
    if not channel_layer:
        return  # Channels not configured

    # Serialize the activity (use minimal version for speed)
    activity_data = ActivitySerializer(instance).data

    # 1. Send to the user who performed the action
    if instance.user and instance.user.id:
        async_to_sync(channel_layer.group_send)(
            f"user_{instance.user.id}",
            {
                "type": "new_activity",
                "activity": activity_data
            }
        )

    # 2. Send to admin group (admins, CEOs, superusers)
    async_to_sync(channel_layer.group_send)(
        "admin_group",
        {
            "type": "new_activity",
            "activity": activity_data
        }
    )

    # 3. Optional: Push notification (via your existing util)
    # Only for certain action types if desired
    important_actions = {'login_failed', 'blocked_user', 'password_change'}
    if instance.action_type in important_actions:
        from .utils import send_push_notification  # your push util
        send_push_notification(
            instance.user.id,
            f"Activity Alert: {instance.action_type}",
            f"{instance.action_type} detected at {instance.created_at.strftime('%H:%M')}"
        )

# In your mark_read view or signal
@receiver(post_save, sender=Activity)
def update_unread_count_on_read(sender, instance, **kwargs):
    if instance.is_read and kwargs.get('update_fields') and 'is_read' in kwargs['update_fields']:
        channel_layer = get_channel_layer()
        if channel_layer and instance.user:
            unread = Activity.objects.filter(user=instance.user, is_read=False).count()
            async_to_sync(channel_layer.group_send)(
                f"user_{instance.user.id}",
                {
                    "type": "unread_count",
                    "count": unread
                }
            )