from django.contrib.humanize.templatetags.humanize import intcomma
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.urls import reverse
from payments.models import Invoice, Payment
from .models import Payroll
from users.models import CustomUser
from django.db import transaction
from notifications.models import Notification


def create_notification(recipient, title, message, notification_type, related_object=None):
    if not recipient:
        return  # Skip silently

    try:
        Notification.objects.create(
            recipient=recipient,
            title=title,
            message=message,
            notification_type=notification_type,
            related_object_id=related_object.id if related_object else None,
            related_object_type=related_object.__class__.__name__.lower() if related_object else None
        )
    except Exception as e:
        print(f"Notification create failed: {e}")



@receiver(post_save, sender=Invoice)
def notify_invoice_change(sender, instance, created, **kwargs):
    # Only run outside atomic blocks (admin uses atomic)
    if transaction.get_connection().in_atomic_block:
        transaction.on_commit(lambda: _send_invoice_notification(instance, created))
    else:
        _send_invoice_notification(instance, created)

def _send_invoice_notification(invoice, created):
    """Actual notification logic — safe to run after commit"""
    if not invoice.customer or not invoice.customer.user:
        return  # No user to notify

    user = invoice.customer.user

    if created:
        try:
            payment_url = reverse('payments:pay_invoice', kwargs={'uid': invoice.uid})
            full_url = f"https://app.highprosper.africa{payment_url}"

            message = (
                f"New invoice generated: RWF {intcomma(invoice.amount)} due by {invoice.due_date.strftime('%d %B %Y')}.\n"
                f"Pay now: {full_url}\n"
                f"Thank you!"
            )

            Notification.objects.create(
                recipient=user,
                title="New Invoice Generated",
                message=message,
                notification_type='invoice',
                related_object_id=invoice.id,
                related_object_type='invoice'
            )
        except Exception as e:
            print(f"Invoice notification failed: {e}")

    if invoice.status == 'Suspended':
        try:
            Notification.objects.create(
                recipient=user,
                title="Service Suspended",
                message=f"Your service has been suspended due to overdue invoice of RWF {intcomma(invoice.amount)}.\n"
                        f"Please pay immediately to restore service.",
                notification_type='invoice',
                related_object_id=invoice.id,
                related_object_type='invoice'
            )
        except Exception as e:
            print(f"Suspension notification failed: {e}")


@receiver(post_save, sender=Payment)
def notify_payment_change(sender, instance, created, **kwargs):
    if created and instance.status == 'Initiated':
        create_notification(
            recipient=instance.customer.user,
            title=f"Payment {instance.id} Initiated",
            message=f"Payment of {instance.amount} RWF initiated via {instance.method}.",
            notification_type='payment',
            related_object=instance
        )
    if instance.status == 'Paid':
        # Update outstanding balance
        customer = instance.customer
        invoice = instance.invoice
        if invoice:
            total_paid = Payment.objects.filter(
                customer=customer, status='Paid', invoice__isnull=False
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            expected_paid = customer.monthly_fee * (
                    (invoice.created_at.year - customer.created_at.year) * 12 +
                    (invoice.created_at.month - customer.created_at.month)
            )
            unpaid_months = int(
                (expected_paid - total_paid) / customer.monthly_fee) if total_paid < expected_paid else 0
            overpaid_months = int(
                (total_paid - expected_paid) / customer.monthly_fee) if total_paid > expected_paid else 0
            customer.calculate_outstanding(unpaid_months=unpaid_months, overpaid_months=overpaid_months)

        # Notify customer
        create_notification(
            recipient=instance.customer.user,
            title=f"Payment {instance.id} Confirmed",
            message=f"Payment of {instance.amount} RWF confirmed. Outstanding: {instance.customer.outstanding} RWF.",
            notification_type='payment',
            related_object=instance
        )
        # Notify admin
        admin = CustomUser.objects.filter(role='Admin').first()
        if admin:
            create_notification(
                recipient=admin,
                title=f"New Payment {instance.id} Received",
                message=f"Payment of {instance.amount} RWF received from {instance.customer.name}.",
                notification_type='payment',
                related_object=instance
            )
        # Notify collector
        if instance.customer.collector:
            create_notification(
                recipient=instance.customer.collector,
                title=f"Payment {instance.id} Received",
                message=f"Payment of {instance.amount} RWF received from {instance.customer.name}.",
                notification_type='payment',
                related_object=instance
            )

@receiver(post_save, sender=Payroll)
def notify_payroll(sender, instance, created, **kwargs):
    if created:
        Notification.objects.create(
            recipient=instance.staff.user,
            title=f"Payroll Processed for {instance.staff.user.username}",
            message=f"Your payroll for {instance.month}/{instance.year} is {instance.total} RWF.",
            notification_type='email',
            related_object_id=instance.id,
            related_object_type='Payroll'
        )