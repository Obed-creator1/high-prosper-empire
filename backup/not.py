let's go step by step
hr/models.py
 
```
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('activity', 'Activity Change'),
        ('message', 'Direct Message'),
        ('task', 'Task Assignment'),
        ('leave', 'Leave Update'),
        ('complaint', 'Complaint Response'),
        ('loan', 'Loan Status'),
        ('payment', 'Payment Update'),
        ('invoice', 'Invoice Update'),
        ('payroll', 'Payroll Processed'), # Added for Payroll
    ]
    recipient = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=[('email', 'Email'), ('sms', 'SMS')])
    related_object_id = models.PositiveIntegerField(null=True, blank=True)
    related_object_type = models.CharField(max_length=100, null=True, blank=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    task_id = models.CharField(max_length=36, null=True, blank=True) # Store Celery task ID
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', 'Pending'), ('sent', 'Sent'), ('failed', 'Failed')
    ])
    class Meta:
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.title} - {self.recipient.username}"
    def send_email(self):
        from django.core.mail import send_mail
        from django.template.loader import render_to_string
        from django.conf import settings
        subject = f"High Prosper Services: {self.title}"
        html_message = render_to_string('hr/emails/notification.html', {'notification': self})
        send_mail(
            subject=subject,
            message=self.message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[self.recipient.email],
            html_message=html_message,
            fail_silently=False,
        )
    def send_sms(self):
        try:
            from .services import MTNSMSService
            mtn_sms = MTNSMSService()
            mtn_sms.send_sms(
                to=self.recipient.phone_number,
                message=f"High Prosper: {self.title} - {self.message[:160]}"
            )
        except Exception as e:
            print(f"SMS send failed: {e}")
    def send(self):
        from hr.tasks import send_notification
        task = send_notification.delay(self.id)
        self.task_id = task.id
        self.save()
        return task.id
    def __str__(self):
        return f"{self.title} to {self.recipient} ({self.status})"
    def save(self, *args, **kwargs):
        created = self.pk is None
        super().save(*args, **kwargs)
        if created:
            self.broadcast_to_user()
    def broadcast_to_user(self):
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'notifications_{self.recipient.id}',
            {
                'type': 'notify_user',
                'title': self.title,
                'message': self.message,
                'notification_type': self.notification_type,
                'id': self.id
            }
        )
```
 
customers/models.py
 
```
class Notification(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='customer_notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    action = models.CharField(max_length=20, choices=[('create', 'New Customer'), ('update', 'Updated'), ('delete', 'Deleted')])
    related_customer = models.ForeignKey('Customer', null=True, blank=True, on_delete=models.SET_NULL)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        ordering = ['-created_at']
    def __str__(self):
        return f"{self.user} - {self.title}"
```
users/models.py
 
```
class Notification(models.Model):
    NOTIFICATION_TYPES = [
        ('info', 'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('error', 'Error'),
        ('chat', 'Chat Message'),
        ('group', 'Group Activity'),
        ('admin', 'Admin Action'),
        ('system', 'System'),
        ('leave', 'Leave Request'),
        ('payroll', 'Payroll'),
        ('task', 'Task'),
    ]
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='user_notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES, default='info')
    action_url = models.URLField(blank=True, null=True)
    image = models.URLField(blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    created_at_time = models.DateTimeField(auto_now_add=True) # For precise timing
    class Meta:
        ordering = ['-created_at_time']
        indexes = [
            models.Index(fields=['user', '-created_at_time']),
            models.Index(fields=['is_read']),
        ]
    def __str__(self):
        return f"{self.user.username} - {self.title}"
```
i have three different structured differently notifications models, what i have to do? do have to delete it and update django/notifications/models.py
 
```
from swapper import swappable_setting
from .base.models import AbstractNotification, notify_handler # noqa
class Notification(AbstractNotification):
    class Meta(AbstractNotification.Meta):
        abstract = False
        swappable = swappable_setting('notifications', 'Notification')

    def naturalday(self):
        """
        Shortcut for the ``humanize``.
        Take a parameter humanize_type. This parameter control the which humanize method use.
        Return ``today``, ``yesterday`` ,``now``, ``2 seconds ago``etc.
        """
        from django.contrib.humanize.templatetags.humanize import naturalday
        return naturalday(self.timestamp)
    def naturaltime(self):
        from django.contrib.humanize.templatetags.humanize import naturaltime
        return naturaltime(self.timestamp)
```
rewrite for me full django/notifications/models.py
have all field of customer.notifications, hr.notifications and user.notifications