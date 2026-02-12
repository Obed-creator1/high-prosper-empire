# notifications/models.py — UNIFIED NOTIFICATION MODEL (FIXED)
from django.db import models
from django.utils import timezone
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from swapper import swappable_setting
from notifications.base.models import AbstractNotification
from django.conf import settings
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .utils import send_push_to_subscription  # Your existing push sender
from django.utils.crypto import get_random_string
from django.urls import reverse
import uuid

User = get_user_model()

class UnsubscribeToken(models.Model):
    """
    One-time or long-lived token for unsubscribe links.
    - Single-use by default (can be made reusable)
    - Tied to user or anonymous channel (email/phone/subscription)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="unsubscribe_tokens"
    )
    email = models.EmailField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    push_subscription = models.ForeignKey(
        'PushSubscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="unsubscribe_tokens"
    )

    token = models.CharField(max_length=64, unique=True, default=get_random_string(64))
    channel = models.CharField(
        max_length=20,
        choices=[('email', 'Email'), ('sms', 'SMS'), ('push', 'Web Push')],
        default='email'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)  # optional expiry
    used_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['email', 'channel']),
            models.Index(fields=['phone', 'channel']),
        ]
        unique_together = [('user', 'channel'), ('email', 'channel'), ('phone', 'channel')]

    def __str__(self):
        return f"Unsub token {self.token[:12]}... ({self.channel})"

    def get_unsubscribe_url(self):
        """Absolute URL for unsubscribe link"""
        return settings.SITE_URL + reverse(
            'notifications:unsubscribe',
            kwargs={'token': self.token}
        )

    @classmethod
    def create_for_user(cls, user, channel='email'):
        """Create or get active token for user/channel"""
        token, created = cls.objects.get_or_create(
            user=user,
            channel=channel,
            defaults={'is_active': True}
        )
        return token

    @classmethod
    def create_for_email(cls, email, channel='email'):
        token, _ = cls.objects.get_or_create(
            email=email,
            channel=channel,
            defaults={'is_active': True}
        )
        return token


class Notification(AbstractNotification):
    """
    Unified Notification Model for High Prosper
    Extends django-notifications with all fields from HR, Customers, Users
    """
    # Core fields from django-notifications (already in AbstractNotification)
    # recipient, actor, verb, description, target, unread, timestamp, etc.

    # === SHARED / COMMON FIELDS ===
    title = models.CharField(max_length=200, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    notification_type = models.CharField(
        max_length=50,
        choices=[
            # From HR
            ('activity', 'Activity Change'),
            ('message', 'Direct Message'),
            ('task', 'Task Assignment'),
            ('leave', 'Leave Update'),
            ('complaint', 'Complaint Response'),
            ('loan', 'Loan Status'),
            ('payment', 'Payment Update'),
            ('invoice', 'Invoice Update'),
            ('payroll', 'Payroll Processed'),
            # From Users
            ('info', 'Info'),
            ('success', 'Success'),
            ('warning', 'Warning'),
            ('error', 'Error'),
            ('chat', 'Chat Message'),
            ('group', 'Group Activity'),
            ('admin', 'Admin Action'),
            ('system', 'System'),
            # From Customers
            ('create', 'New Customer'),
            ('update', 'Customer Updated'),
            ('delete', 'Customer Deleted'),
        ],
        default='info',
    )

    # === HR-SPECIFIC FIELDS ===
    task_id = models.CharField(max_length=36, null=True, blank=True)  # Celery task ID
    status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed')],
        default='pending'
    )

    # === USERS-SPECIFIC FIELDS ===
    action_url = models.URLField(blank=True, null=True)
    image = models.URLField(blank=True, null=True)
    created_at_time = models.DateTimeField(auto_now_add=True)  # Precise timestamp

    # === CUSTOMERS-SPECIFIC FIELDS ===
    related_customer = models.ForeignKey(
        'customers.Customer',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='notifications'
    )

    # === SHARED ADVANCED FIELDS ===
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object_type = models.ForeignKey(
        ContentType,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='related_notifications'
    )
    related_object = GenericForeignKey('related_object_type', 'related_object_id')

    # Indexes for performance
    class Meta(AbstractNotification.Meta):
        abstract = False
        swappable = swappable_setting('notifications', 'Notification')
        ordering = ['-created_at_time']
        indexes = [
            models.Index(fields=['recipient', '-created_at_time']),
            models.Index(fields=['unread']),  # Use 'unread' from base
            models.Index(fields=['notification_type']),
        ]

    def __str__(self):
        return f"{self.title or self.verb} to {self.recipient.username} ({'unread' if self.unread else 'read'})"

    def naturalday(self):
        from django.contrib.humanize.templatetags.humanize import naturalday
        return naturalday(self.timestamp)

    def naturaltime(self):
        from django.contrib.humanize.templatetags.humanize import naturaltime
        return naturaltime(self.timestamp)

    def send_email(self):
        """Send email notification (HR-style)"""
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings

        subject = f"High Prosper: {self.title or self.verb}"
        html_message = render_to_string('notifications/email.html', {'notification': self})
        send_mail(
            subject=subject,
            message=self.message or self.description,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[self.recipient.email],
            html_message=html_message,
            fail_silently=True,
        )

    def send_sms(self):
        """Send SMS notification (HR-style)"""
        try:
            from hr.services import MTNSMSService
            mtn_sms = MTNSMSService()
            mtn_sms.send_sms(
                to=self.recipient.phone_number,
                message=f"High Prosper: {self.title or self.verb} - {self.message[:160]}"
            )
        except Exception as e:
            print(f"SMS send failed: {e}")



class PushSubscription(models.Model):
    """
    Global Push Subscription — Works for authenticated users AND anonymous customers
    """
    # Optional: Link to authenticated user (admin, staff, collector)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='push_subscriptions'
    )

    # For customers or guests: identify by phone or device ID
    phone = models.CharField(max_length=20, blank=True, null=True, db_index=True)
    device_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    # Web Push standard fields
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()

    # Metadata
    browser = models.CharField(max_length=100, blank=True)
    platform = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    last_push_success = models.BooleanField(default=False, help_text="Was the most recent push attempt successful?")
    last_push_attempt = models.DateTimeField(null=True, blank=True, help_text="Timestamp of the most recent push attempt")
    last_successful_push = models.DateTimeField(null=True, blank=True, help_text="Timestamp of the last confirmed successful push")
    push_success_count = models.PositiveIntegerField(default=0, help_text="Total successful pushes")
    push_failure_count = models.PositiveIntegerField(default=0, help_text="Total failed pushes")
    last_push_sent = models.DateTimeField(null=True, blank=True)
    push_count = models.PositiveIntegerField(default=0)

    class Meta:
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['phone']),
            models.Index(fields=['device_id']),
            models.Index(fields=['is_active']),
            models.Index(fields=['endpoint']),
            models.Index(fields=['updated_at']),
            models.Index(fields=['last_successful_push']),
            models.Index(fields=['last_push_attempt']),
        ]
        verbose_name = "Push Subscription"
        verbose_name_plural = "Push Subscriptions"

    def __str__(self):
        identifier = self.user.username if self.user else (self.phone or self.device_id or "Anonymous")
        return f"Push for {identifier} ({self.browser})"

    def save(self, *args, **kwargs):
        created = self.pk is None
        super().save(*args, **kwargs)

        if created:
            # Notify via WebSocket (if user is online)
            self.notify_registration_success()

            # Optional: Send welcome push
            try:
                send_push_to_subscription(
                    subscription=self,
                    title="High Prosper Notifications",
                    message="You're now connected! You'll receive real-time updates.",
                    url="/"
                )
            except Exception as e:
                print(f"Welcome push failed: {e}")

    def notify_registration_success(self):
        """Send WebSocket confirmation to the user (if authenticated)"""
        if not self.user:
            return

        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f"notifications_{self.user.id}",
                {
                    "type": "notify_user",
                    "title": "Push Enabled",
                    "message": "Browser notifications are now active.",
                    "notification_type": "success",
                    "id": self.id
                }
            )

    @classmethod
    def broadcast_to_all(cls, title, message, url="/", notification_type="info"):
        """Send push to ALL active subscriptions"""
        subscriptions = cls.objects.filter(is_active=True)
        for sub in subscriptions:
            try:
                send_push_to_subscription(
                    subscription=sub,
                    title=title,
                    message=message,
                    url=url,
                    notification_type=notification_type
                )
            except Exception as e:
                print(f"Push failed for {sub}: {e}")

    @classmethod
    def broadcast_to_users(cls, user_ids, title, message, url="/"):
        """Send to specific users"""
        subscriptions = cls.objects.filter(user_id__in=user_ids, is_active=True)
        for sub in subscriptions:
            try:
                send_push_to_subscription(subscription=sub, title=title, message=message, url=url)
            except Exception as e:
                print(f"Push failed: {e}")

    @classmethod
    def broadcast_to_customers_by_phone(cls, phones, title, message, url="/"):
        """Send to customers by phone number"""
        subscriptions = cls.objects.filter(phone__in=phones, is_active=True)
        for sub in subscriptions:
            try:
                send_push_to_subscription(subscription=sub, title=title, message=message, url=url)
            except Exception as e:
                print(f"Push failed: {e}")

    def health_score(self):
        """
        0–100 health score based on recent activity & success rate
        """
        if not self.is_active:
            return 0

        if not self.last_successful_push:
            return 10  # Never succeeded → very low

        days_since_success = (timezone.now() - self.last_successful_push).days

        # Base score from recency
        recency_score = 100
        if days_since_success > 3:
            recency_score = max(20, 100 - days_since_success * 5)
        if days_since_success > 30:
            recency_score = 10

        # Success rate adjustment (if we have attempts)
        total_attempts = self.push_success_count + self.push_failure_count
        if total_attempts > 0:
            success_rate = (self.push_success_count / total_attempts) * 100
            recency_score = (recency_score * 0.7) + (success_rate * 0.3)

        return int(max(0, min(100, recency_score)))