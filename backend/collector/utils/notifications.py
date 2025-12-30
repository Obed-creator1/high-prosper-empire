# collector/utils/notifications.py — FULL NOTIFICATION SYSTEM WITH PUSH
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from notifications.signals import notify
from pywebpush import webpush
import requests
import json
import logging

logger = logging.getLogger(__name__)

def send_in_app_notification(sender, recipient, verb, description=None, target=None):
    notify.send(
        sender=sender,
        recipient=recipient,
        verb=verb,
        description=description,
        target=target
    )

def send_email_notification(recipient, subject, template_name, context):
    html_message = render_to_string(f'notifications/email/{template_name}.html', context)
    plain_message = render_to_string(f'notifications/email/{template_name}.txt', context) if template_name in ['general_update', 'task_assigned'] else None

    try:
        send_mail(
            subject=subject,
            message=plain_message or html_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        logger.error(f"Email failed: {e}")
        return False

def send_mtn_sms(phone_number, message):
    # ... (existing MTN SMS logic)
    pass

def send_whatsapp_notification(phone_number, message):
    # ... (existing WhatsApp logic)
    pass

def send_push_notification(subscription_info, payload):
    """
    Send Web Push notification
    """
    try:
        webpush(
            subscription_info=subscription_info,
            data=json.dumps(payload),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": "mailto:admin@highprosper.com"}
        )
        return True
    except Exception as e:
        logger.error(f"Push failed: {e}")
        return False

def notify_collector(collector, title, message, notification_type='info', template_name=None, context=None, target=None):
    user = collector.user

    # Prepare full context
    full_context = {
        'user': user,
        'message': message,
        'title': title,
        'year': timezone.now().year,
        'dashboard_url': settings.FRONTEND_URL + '/dashboard',
        **(context or {})
    }

    # In-app
    send_in_app_notification(
        sender=user,
        recipient=user,
        verb=notification_type,
        description=message,
        target=target
    )

    # Email
    if user.email:
        send_email_notification(user, title, template_name or 'general_update', full_context)

    # SMS
    if user.phone:
        sms_template = template_name or 'general_update'
        sms_message = render_to_string(f'notifications/sms/{sms_template}.txt', full_context)
        send_mtn_sms(user.phone, sms_message.strip())

    # WhatsApp
    if user.phone:
        whatsapp_template = template_name or 'general_update'
        whatsapp_message = render_to_string(f'notifications/whatsapp/{whatsapp_template}.txt', full_context)
        send_whatsapp_notification(user.phone, whatsapp_message.strip())

    # Push Notification
    if hasattr(user, 'push_subscription') and user.push_subscription:
        push_template = template_name or 'general_update'
        push_payload = render_to_string(f'notifications/push/{push_template}.json', full_context)
        push_data = json.loads(push_payload)
        push_data['title'] = title
        push_data['body'] = message
        send_push_notification(user.push_subscription, push_data)