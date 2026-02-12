# notifications/tasks.py — HIGH PROSPER GLOBAL PUSH NOTIFICATIONS 2026+
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError, Retry
from django.contrib.auth import get_user_model
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from django.db.models import Q
from .models import PushSubscription
from .utils import send_push_to_subscription
import logging
from typing import List, Optional, Dict, Any, Union

logger = logging.getLogger(__name__)
User = get_user_model()

# ────────────────────────────────────────────────
# SHARED HELPERS
# ────────────────────────────────────────────────
def _log_send_result(sub: PushSubscription, success: bool, exc: Optional[Exception] = None):
    """Centralized logging helper — consistent format across all tasks"""
    identifier = (
        sub.user.username if sub.user else
        sub.phone or sub.device_id or "anonymous"
    )
    browser_platform = f"{sub.browser or 'unknown'}/{sub.platform or 'unknown'}"

    if success:
        logger.info(f"Push delivered → {identifier} ({browser_platform}) [sub:{sub.id}]")
    else:
        error_msg = str(exc) if exc else "unknown error"
        logger.warning(f"Push failed → {identifier} ({browser_platform}) [sub:{sub.id}]: {error_msg}")


def _chunked_queryset(qs, chunk_size: int = 50):
    """Generator to iterate queryset in chunks — prevents memory explosion on broadcast"""
    offset = 0
    while True:
        chunk = qs[offset:offset + chunk_size]
        if not chunk.exists():
            break
        yield chunk
        offset += chunk_size


# ────────────────────────────────────────────────
# 1. SEND TO SINGLE USER (ALL DEVICES)
# ────────────────────────────────────────────────
@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    retry_backoff=True,
    retry_jitter=True,
    autoretry_for=(Exception,),
    retry_backoff_max=600,  # cap at 10 min
    name="notifications.send_to_user"
)
def send_push_to_user(
        self,
        user_id: int,
        title: str,
        message: str,
        url: str = "/",
        data: Optional[Dict[str, Any]] = None
) -> str:
    """
    Send push to all active devices of one user.
    Retries on transient failures.
    Logs per-device result.
    """
    try:
        user = User.objects.select_related().get(id=user_id)
    except User.DoesNotExist:
        logger.error(f"Cannot send push: User {user_id} does not exist")
        return f"User {user_id} not found"

    subscriptions = PushSubscription.objects.filter(
        user=user,
        is_active=True
    ).select_related()

    total = subscriptions.count()
    if total == 0:
        logger.info(f"No active push subscriptions for user {user.username}")
        return f"No active subscriptions for {user.username}"

    success_count = 0
    for sub in subscriptions:
        try:
            send_push_to_subscription(
                subscription=sub,
                title=title,
                message=message,
                url=url,
                data=data or {}
            )
            success_count += 1
            _log_send_result(sub, success=True)
        except Exception as exc:
            _log_send_result(sub, success=False, exc=exc)
            # Continue — don't crash the whole task

    result_msg = f"Push sent to {success_count}/{total} devices for {user.username}"
    logger.info(result_msg)
    return result_msg


# ────────────────────────────────────────────────
# 2. BROADCAST TO ALL ACTIVE SUBSCRIPTIONS
# ────────────────────────────────────────────────
@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    retry_backoff=True,
    name="notifications.broadcast_to_all"
)
def send_push_to_all(
        self,
        title: str,
        message: str,
        url: str = "/",
        data: Optional[Dict[str, Any]] = None
) -> str:
    """
    Broadcast to ALL active subscriptions (users + anonymous customers).
    Processes in chunks to respect rate limits and memory.
    """
    subscriptions = PushSubscription.objects.filter(is_active=True).only(
        'id', 'endpoint', 'keys_p256dh', 'keys_auth', 'browser', 'platform'
    )

    total = subscriptions.count()
    if total == 0:
        logger.info("No active push subscriptions for global broadcast")
        return "No active subscriptions"

    success_count = 0
    chunk_size = 50  # safe default — adjust based on push provider rate limits

    for chunk in _chunked_queryset(subscriptions, chunk_size):
        for sub in chunk:
            try:
                send_push_to_subscription(
                    subscription=sub,
                    title=title,
                    message=message,
                    url=url,
                    data=data or {}
                )
                success_count += 1
                _log_send_result(sub, success=True)
            except Exception as exc:
                _log_send_result(sub, success=False, exc=exc)

    result_msg = f"Global broadcast completed: {success_count}/{total} successful"
    logger.info(result_msg)
    return result_msg


# ────────────────────────────────────────────────
# 3. SEND TO USERS WITH SPECIFIC ROLE
# ────────────────────────────────────────────────
@shared_task(bind=True, max_retries=3, default_retry_delay=60, name="notifications.send_to_role")
def send_push_to_role(
        self,
        role_name: str,
        title: str,
        message: str,
        url: str = "/",
        data: Optional[Dict[str, Any]] = None
) -> str:
    """Send push to all active users with a given role"""
    try:
        users = User.objects.filter(role=role_name).values_list('id', flat=True)
        user_ids = list(users)

        if not user_ids:
            logger.info(f"No users found with role '{role_name}'")
            return f"No users with role {role_name}"

        result = send_push_to_users.delay(user_ids, title, message, url, data)
        return f"Queued push to {len(user_ids)} {role_name}s (task ID: {result.id})"

    except Exception as exc:
        logger.error(f"Role push queue failed for '{role_name}': {exc}")
        raise self.retry(exc=exc)


# ────────────────────────────────────────────────
# 4. SEND TO MULTIPLE SPECIFIC USERS
# ────────────────────────────────────────────────
@shared_task(bind=True, max_retries=3, default_retry_delay=60, name="notifications.send_to_users")
def send_push_to_users(
        self,
        user_ids: List[int],
        title: str,
        message: str,
        url: str = "/",
        data: Optional[Dict[str, Any]] = None
) -> str:
    """Send push to multiple specific user IDs"""
    subscriptions = PushSubscription.objects.filter(
        user_id__in=user_ids,
        is_active=True
    ).select_related()

    total = subscriptions.count()
    if total == 0:
        return f"No active subscriptions for {len(user_ids)} users"

    success_count = 0
    for sub in subscriptions:
        try:
            send_push_to_subscription(
                subscription=sub,
                title=title,
                message=message,
                url=url,
                data=data or {}
            )
            success_count += 1
            _log_send_result(sub, success=True)
        except Exception as exc:
            _log_send_result(sub, success=False, exc=exc)

    result_msg = f"Targeted push completed: {success_count}/{total} successful"
    logger.info(result_msg)
    return result_msg


# ────────────────────────────────────────────────
# 5. SEND TO CUSTOMERS BY PHONE NUMBER
# ────────────────────────────────────────────────
@shared_task(bind=True, max_retries=3, default_retry_delay=60, name="notifications.send_to_phones")
def send_push_to_phones(
        self,
        phone_numbers: List[str],
        title: str,
        message: str,
        url: str = "/",
        data: Optional[Dict[str, Any]] = None
) -> str:
    """Send push to anonymous customers identified by phone"""
    subscriptions = PushSubscription.objects.filter(
        phone__in=phone_numbers,
        is_active=True
    ).select_related()

    total = subscriptions.count()
    if total == 0:
        return f"No active subscriptions for {len(phone_numbers)} phones"

    success_count = 0
    for sub in subscriptions:
        try:
            send_push_to_subscription(
                subscription=sub,
                title=title,
                message=message,
                url=url,
                data=data or {}
            )
            success_count += 1
            _log_send_result(sub, success=True)
        except Exception as exc:
            _log_send_result(sub, success=False, exc=exc)

    result_msg = f"Phone-based push completed: {success_count}/{total} successful"
    logger.info(result_msg)
    return result_msg


# ────────────────────────────────────────────────
# 6. SCHEDULED CLEANUP TASK
# ────────────────────────────────────────────────
@shared_task(bind=True, name="notifications.cleanup_inactive_subscriptions")
def cleanup_inactive_subscriptions(self):
    """
    Scheduled task: remove inactive or stale subscriptions.
    Recommended: run daily via Celery Beat.
    """
    try:
        threshold = timezone.now() - timezone.timedelta(days=30)

        # Two conditions: explicitly inactive OR stale (no update in 30 days)
        qs = PushSubscription.objects.filter(
            Q(is_active=False) | Q(updated_at__lt=threshold)
        )

        deleted_count, _ = qs.delete()
        logger.info(f"Cleaned up {deleted_count} inactive/stale push subscriptions")
        return f"Cleanup complete: {deleted_count} removed"

    except Exception as e:
        logger.error(f"Cleanup task failed: {e}", exc_info=True)
        raise self.retry(countdown=3600)  # retry in 1 hour