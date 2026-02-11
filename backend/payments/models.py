# payments/models.py — HIGH PROSPER PAYMENTS 2026
from django.contrib.humanize.templatetags.humanize import intcomma
from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from stripe import Invoice
from users.models import CustomUser
from decimal import Decimal
import uuid
from django.db.models.signals import post_save
from django.dispatch import receiver
import requests
from django.conf import settings
from customers.models import Customer

class PaymentMethod(models.Model):
    METHOD_TYPES = (
        ('momo', 'Mobile Money'),
        ('irembo', 'Irembo Pay'),
        ('hpc', 'High Prosper Coin'),
        ('ussd', 'USSD Push'),
        ('qr', 'QR Code'),
        ('card', 'Visa/Mastercard'),
        ('bank', 'Bank Transfer'),
    )
    name = models.CharField(max_length=50, choices=METHOD_TYPES, unique=True)
    is_active = models.BooleanField(default=True)
    fee_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    supports_offline = models.BooleanField(default=False)

    def __str__(self):
        return self.get_name_display()


class Invoice(models.Model):
    STATUS_CHOICES = (('Pending', 'Pending'), ('Paid', 'Paid'), ('Overdue', 'Overdue'), ('Waived', 'Waived'))

    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=14, decimal_places=2, validators=[MinValueValidator(0)])
    due_date = models.DateField()
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    period_month = models.PositiveIntegerField()
    period_year = models.PositiveIntegerField()
    pdf_file = models.FileField(upload_to='invoices/pdfs/', null=True, blank=True)
    sent_via = models.JSONField(default=list)  # ['sms', 'push', 'whatsapp', 'ussd']
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('customer', 'period_month', 'period_year')
        indexes = [models.Index(fields=['due_date']), models.Index(fields=['status'])]

    def __str__(self):
        return f"INV-{self.period_year}{self.period_month:02d}-{self.customer}"

    @property
    def remaining(self):
        """Safe remaining balance — handles None values gracefully"""
        amount = self.amount or Decimal('0')
        paid = self.paid_amount or Decimal('0')
        return amount - paid

    @property
    def is_overdue(self):
        if self.status == 'Paid':
            return False
        return timezone.now().date() > self.due_date

    @property
    def balance_status(self):
        remaining = self.remaining
        if remaining > 0:
            return "Owes"
        elif remaining < 0:
            return "Overpaid"
        return "Up to date"

    def mark_paid(self, amount=None, method=None):
        amount = amount or self.remaining
        self.paid_amount += amount
        if self.paid_amount >= self.amount:
            self.status = 'Paid'
        self.save()
        return self

    @receiver(post_save, sender=Invoice)
    def send_invoice_via_whatsapp(sender, instance, created, **kwargs):
        if created and instance.pdf_file and instance.customer.phone:
            phone = instance.customer.phone.lstrip('+')  # WhatsApp needs no +

            url = f"https://graph.facebook.com/v19.0/{settings.WHATSAPP_PHONE_ID}/messages"
            headers = {"Authorization": f"Bearer {settings.WHATSAPP_TOKEN}"}

            pdf_url = instance.pdf_file.url  # Full URL (make sure media is public or use signed)

            payload = {
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "template",
                "template": {
                    "name": "monthly_invoice",
                    "language": {"code": "en_US"},
                    "components": [
                        {
                            "type": "header",
                            "parameters": [{"type": "document", "document": {"link": pdf_url, "filename": f"Invoice_{instance.period_month}_{instance.period_year}.pdf"}}]
                        },
                        {
                            "type": "body",
                            "parameters": [
                                {"type": "text", "text": instance.customer.name},
                                {"type": "text", "text": f"RWF {intcomma(instance.amount)}"},
                                {"type": "text", "text": instance.due_date.strftime("%d %B %Y")},
                            ]
                        },
                        {
                            "type": "button",
                            "sub_type": "url",
                            "index": 0,
                            "parameters": [{"type": "text", "text": instance.uid}]
                        }
                    ]
                }
            }

            try:
                requests.post(url, json=payload, headers=headers, timeout=10)
            except Exception as e:
                print(f"WhatsApp delivery failed: {e}")


class Payment(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Initiated', 'Initiated'),
        ('Successful', 'Successful'),
        ('Failed', 'Failed'),
        ('Refunded', 'Refunded'),
    )
    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    customer = models.ForeignKey(
        'customers.Customer',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='payments'
    )
    service_request = models.ForeignKey(
        'customers.ServiceRequest',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='payments'
    )
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.SET_NULL)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    method = models.ForeignKey(PaymentMethod, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    reference = models.CharField(
        max_length=100,
        unique=True,
        blank=True,  # Allow blank in form
        default=None,
        null=True  # Temporary for migration
    )
    payer_phone = models.CharField(max_length=20, blank=True)
    payer_name = models.CharField(max_length=200, blank=True)
    metadata = models.JSONField(default=dict)  # For HPC tx hash, QR ID, etc.
    initiated_at = models.DateTimeField(null=True)
    completed_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.reference:
            # Generate unique reference
            prefix = "PAY"
            while True:
                new_ref = f"{prefix}-{uuid.uuid4().hex[:12].upper()}"
                if not Payment.objects.filter(reference=new_ref).exists():
                    self.reference = new_ref
                    break
        super().save(*args, **kwargs)

    class Meta:
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
            models.Index(fields=['reference']),
        ]

    def __str__(self):
        return f"{self.method} {self.amount} → {self.customer}"

    def finalize_success(self):
        self.status = 'Successful'
        self.completed_at = timezone.now()
        self.save()

        # Update invoice
        if self.invoice:
            self.invoice.mark_paid(self.amount, self.method)

        # Update customer balance
        self.customer.outstanding = max(0, self.customer.outstanding - self.amount)
        self.customer.save()

        # Mint HPC (Vision 2026)
        from blockchain.hpc import mint_hpc_for_payment
        mint_hpc_for_payment(self)

class PayoutLog(models.Model):
    collector = models.ForeignKey('users.CustomUser', on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    reference = models.CharField(max_length=50, unique=True)
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=20, default='Initiated')  # Initiated, Success, Failed
    response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payout {self.reference} - {self.collector}"

class WebhookRetry(models.Model):
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE)
    payload = models.JSONField()
    attempts = models.PositiveIntegerField(default=0)
    last_attempt = models.DateTimeField(null=True)
    next_attempt = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Retry {self.payment.reference} - attempt {self.attempts}"