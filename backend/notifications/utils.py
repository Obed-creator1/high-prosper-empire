# notifications/utils.py — HIGH PROSPER NOTIFICATIONS ENGINE 2026+
import logging
import sys
import json
from typing import Optional, Dict, Any
from urllib.parse import urljoin

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from pywebpush import webpush, WebPushException
from requests.exceptions import RequestException

logger = logging.getLogger(__name__)

# =============================================================================
# EMAIL NOTIFICATIONS — With Unsubscribe Link (passed via context)
# =============================================================================

def send_email_notification(
        recipient_email: str,
        title: str,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        user=None,
        fail_silently: bool = False,
) -> bool:
    """
    Send formatted HTML email.
    Expects 'unsubscribe_url' in context if needed.
    """
    if not recipient_email or not settings.EMAIL_HOST:
        logger.warning("Email skipped: no recipient or SMTP not configured")
        return False

    full_context = {
        "title": title,
        "message": message,
        "timestamp": timezone.now(),
        "company_name": "High Prosper",
        "support_email": settings.SUPPORT_EMAIL,
        "site_url": settings.SITE_URL,
        **(context or {}),
    }

    if user:
        full_context.update({
            "user": user,
            "user_name": user.get_full_name() or user.username,
        })

    html_message = render_to_string("notifications/email.html", full_context)
    plain_message = render_to_string("notifications/email.txt", full_context)

    try:
        send_mail(
            subject=f"High Prosper: {title}",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=fail_silently,
        )
        logger.info(f"Email sent to {recipient_email}")
        return True

    except Exception as e:
        logger.error(f"Email delivery failed to {recipient_email}: {e}", exc_info=True)
        if not fail_silently:
            raise
        return False


# =============================================================================
# SMS NOTIFICATIONS — With Unsubscribe Instruction
# =============================================================================

def send_sms_notification(phone: str, message: str, shorten: bool = True) -> bool:
    """
    Send SMS with short unsubscribe instruction.
    """
    if not phone or not settings.MTN_SMS_API_URL:
        logger.warning("SMS skipped: no phone or API URL")
        return False

    phone = "+" + phone.lstrip("+0")

    text = message[:140] if shorten else message
    sms_text = (
        f"High Prosper: {text}\n\n"
        f"Stop: Reply STOP or visit {settings.SITE_URL}/notifications/unsubscribe"
    )

    payload = {
        "to": phone,
        "text": sms_text,
        "from": settings.MTN_SMS_SENDER_ID or "HighProsper",
    }

    headers = {
        "Authorization": f"Bearer {settings.MTN_SMS_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        import requests
        response = requests.post(
            settings.MTN_SMS_API_URL,
            json=payload,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        logger.info(f"SMS sent to {phone} (with unsubscribe instruction)")
        return True

    except RequestException as e:
        logger.error(f"SMS failed to {phone}: {e}", exc_info=True)
        return False


# =============================================================================
# WEB PUSH NOTIFICATIONS — With Unsubscribe Action (URL passed via data)
# =============================================================================

def send_push_to_subscription(
        subscription,
        title: str,
        message: str,
        url: str = "/",
        data: Optional[Dict[str, Any]] = None,
        ttl: int = 86400,
) -> bool:
    """
    Send Web Push notification.
    Expects 'unsubscribe_url' in data dict if needed.
    """
    if not getattr(subscription, 'is_active', False):
        return False

    unsubscribe_url = data.get('unsubscribe_url') if data else None

    payload = {
        "title": title,
        "body": message,
        "icon": urljoin(settings.SITE_URL, "/static/images/logo-192.png"),
        "badge": urljoin(settings.SITE_URL, "/static/images/badge.png"),
        "data": {
            "url": url,
            **(data or {}),
        },
        "vibrate": [200, 100, 200],
        "actions": [
            {"action": "open", "title": "Open"},
        ],
        "tag": f"high-prosper-{getattr(subscription, 'id', 'unknown')}",
        "renotify": True,
    }

    # Add unsubscribe action only if URL is provided
    if unsubscribe_url:
        payload["actions"].append({"action": "unsubscribe", "title": "Unsubscribe"})
        payload["data"]["unsubscribe_url"] = unsubscribe_url

    try:
        webpush(
            subscription_info={
                "endpoint": getattr(subscription, 'endpoint', ''),
                "keys": {
                    "p256dh": getattr(subscription, 'keys_p256dh', ''),
                    "auth": getattr(subscription, 'keys_auth', ''),
                },
            },
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_EMAIL}"},
            ttl=ttl,
        )
        logger.info(f"Web push sent to subscription {getattr(subscription, 'id', 'unknown')}")
        return True

    except WebPushException as ex:
        status_code = ex.response.status_code if ex.response else None
        if status_code == 410:
            logger.info(f"Subscription expired (410) — marking inactive")
            subscription.is_active = False
            subscription.save(update_fields=["is_active"])
        else:
            logger.warning(f"Web push failed {status_code or 'unknown'}: {ex}")
        return False

    except Exception as e:
        logger.error(f"Unexpected push error: {e}", exc_info=True)
        return False


# =============================================================================
# CONVENIENCE WRAPPERS (no model imports)
# =============================================================================

def send_push_to_user(user, title: str, message: str, url: str = "/", data: Optional[Dict] = None) -> int:
    """
    Send push to all active devices of a user.
    Caller must ensure subscriptions are loaded.
    """
    # Avoid import — expect caller to pass pre-loaded subs if needed
    # For simplicity, we'll keep the query here (safe if models.py doesn't import back)
    from notifications.models import PushSubscription
    subscriptions = PushSubscription.objects.filter(user=user, is_active=True)
    success_count = 0
    for sub in subscriptions:
        if send_push_to_subscription(sub, title, message, url, data):
            success_count += 1
    logger.info(f"Push sent to {success_count}/{subscriptions.count()} devices for user {user}")
    return success_count


def send_push_to_phone(phone_number: str, title: str, message: str, url: str = "/", data: Optional[Dict] = None) -> int:
    from notifications.models import PushSubscription
    subscriptions = PushSubscription.objects.filter(phone=phone_number, is_active=True)
    success_count = 0
    for sub in subscriptions:
        if send_push_to_subscription(sub, title, message, url, data):
            success_count += 1
    logger.info(f"Push sent to {success_count} devices for phone {phone_number}")
    return success_count


# =============================================================================
# SMART MULTI-CHANNEL NOTIFICATION WITH FALLBACK
# =============================================================================

def send_notification_with_fallback(
        user,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        push_data: Optional[Dict] = None,
        priority: str = "normal",
) -> Dict[str, bool]:
    """
    Try best channel first → fallback intelligently.
    Returns delivery status per channel.
    """
    result = {"push": False, "sms": False, "email": False}

    # 1. Web Push (real-time)
    if getattr(user, "notify_browser", True):
        result["push"] = bool(send_push_to_user(user, title, message, action_url or "/", push_data))

    # 2. SMS (fast)
    if not result["push"] and getattr(user, "notify_sms", True) and user.phone:
        result["sms"] = send_sms_notification(user.phone, f"{title}: {message}")

    # 3. Email (archive / last resort)
    if not any(result.values()) and getattr(user, "notify_email", True) and user.email:
        # Pass unsubscribe_url in context
        context = {"action_url": action_url, "priority": priority}
        result["email"] = send_email_notification(user.email, title, message, context, user=user)

    sent_via = [k for k, v in result.items() if v]
    logger.info(f"Notification '{title}' sent to {user} via {sent_via or 'none'}")

    return result


# =============================================================================
# LEGACY SLUG UTILS (compatibility — unchanged)
# =============================================================================

if sys.version_info >= (3,):
    long = int

def slug2id(slug: str) -> int:
    try:
        return long(slug) - 110909
    except ValueError:
        return 0

def id2slug(notification_id: int) -> str:
    return str(notification_id + 110909)