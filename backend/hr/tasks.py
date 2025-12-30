# hr/tasks.py

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from users.models import CustomUser

from .services import MTNSMSService, EmailService  # service layer for SMS & Email
from celery import shared_task
from django.contrib.auth import get_user_model

User = get_user_model()


@shared_task(bind=True)
def send_email_notification(self, recipient_email, subject, message):
    """
    Sends an email using EmailService.
    """
    try:
        EmailService().send_email(recipient_email, subject, message)
        return f"Email sent to {recipient_email}"
    except Exception as e:
        self.retry(countdown=60 * 2 ** self.request.retries, max_retries=3)
        return f"Email failed for {recipient_email}: {str(e)}"


@shared_task(bind=True)
def send_mtn_sms_notification(self, phone_number, message):
    """
    Sends SMS using MTNSMSService.
    """
    try:
        MTNSMSService().send_sms(phone_number, message)
        return f"SMS sent to {phone_number}"
    except Exception as e:
        self.retry(countdown=60 * 2 ** self.request.retries, max_retries=3)
        return f"SMS failed for {phone_number}: {str(e)}"


@shared_task
def send_notification(notification_id):
    """
    Sends notification based on type (email or SMS) and updates Notification status.
    """
    from notifications.models import Notification
    try:
        notification = Notification.objects.get(id=notification_id)
        if notification.notification_type == 'email':
            result = send_email_notification.delay(
                notification.recipient.email, notification.title, notification.message
            )
        elif notification.notification_type == 'sms':
            result = send_mtn_sms_notification.delay(
                notification.recipient.phone_number, notification.message
            )
        else:
            notification.status = 'failed'
            notification.save()
            return f"Unsupported notification type: {notification.notification_type}"

        notification.status = 'sent'
        notification.save()
        return f"Notification task queued (ID: {result.id})"
    except Notification.DoesNotExist:
        return f"Notification {notification_id} not found"
    except Exception as e:
        try:
            notification.status = 'failed'
            notification.save()
        except:
            pass
        return f"Failed to process notification {notification_id}: {str(e)}"


@shared_task
def send_bulk_notifications(customer_ids, title, message, notification_type):
    """
    Sends bulk notifications to multiple customers.
    """
    from notifications.models import Notification

    for customer_id in customer_ids:
        customer = CustomUser.objects.get(id=customer_id)
        notification = Notification.objects.create(
            recipient=customer,
            title=title,
            message=message,
            notification_type=notification_type
        )
        notification.send()  # this can call send_notification internally
    return f"Queued {len(customer_ids)} notifications"


@shared_task
def send_payment_confirmation_email(user_id, invoice_id, amount, customer_name):
    """
    Sends payment confirmation email using EmailService.
    """
    user = CustomUser.objects.get(id=user_id)
    subject = f'Payment Confirmation for Invoice #{invoice_id}'
    message = f"""
    Dear {customer_name},

    Thank you for your payment of RWF {amount:.2f} for Invoice #{invoice_id}.
    Your payment has been successfully processed on {timezone.now().strftime('%Y-%m-%d')}.
    You can download your receipt from your dashboard.

    Best regards,
    High Prosper Services Ltd
    """
    EmailService().send_email(user.email, subject, message)
    return f"Payment confirmation email sent to {user.email}"
