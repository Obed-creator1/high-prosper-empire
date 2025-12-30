# backend/users/models.py
import secrets

from django.conf import settings
from django.contrib.auth.models import AbstractUser, Group, PermissionsMixin
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone
import uuid
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField, SearchVector

class CustomUser(AbstractUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('ceo', 'CEO'), ('admin', 'Admin'), ('hr', 'HR'), ('accounting', 'Accounting'),
        ('manager', 'Field Sector Manager'), ('supervisor', 'Field Site Supervisor'),
        ('collector', 'Collector'), ('staff', 'Staff'), ('driver', 'Driver'),
        ('manpower', 'Manpower'), ('customer', 'Customer'),
    ]

    company = models.ForeignKey('tenants.Company', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    is_global_admin = models.BooleanField(default=False)  # Can see all companies
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True, null=True)
    branch = models.CharField(max_length=100, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    must_change_password = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    is_online = models.BooleanField(default=False)  # Real-time flag
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.CharField(max_length=100, blank=True, null=True)
    is_phone_verified = models.BooleanField(default=False)
    notify_realtime = models.BooleanField(default=True, help_text="Receive real-time WebSocket notifications")
    notify_email = models.BooleanField(default=True, help_text="Receive email notifications")
    notify_sms = models.BooleanField(default=True, help_text="Receive SMS notifications")
    notify_browser = models.BooleanField(default=True, help_text="Receive browser push notifications")
    notify_sound = models.BooleanField(default=True, help_text="Play notification sounds")

    # Per-type toggles (optional)
    notify_payment = models.BooleanField(default=True)
    notify_customer_update = models.BooleanField(default=True)
    notify_chat = models.BooleanField(default=True)
    notify_task = models.BooleanField(default=True)
    notify_leave = models.BooleanField(default=True)
    notify_system = models.BooleanField(default=True)

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

    def update_last_seen(self):
        self.last_seen = timezone.now()
        self.is_online = True
        self.save(update_fields=["last_seen", "is_online"])

    def set_offline(self):
        self.is_online = False
        self.save(update_fields=["is_online"])

    @property
    def status_display(self):
        if self.is_online:
            return "Online"
        if not self.last_seen:
            return "Never"
        return f"Last seen {timezone.localtime(self.last_seen).strftime('%b %d, %I:%M %p')}"

    def __str__(self):
        return f"{self.username} ({self.role})"


class UserProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=50, blank=True, null=True)
    group = models.CharField(max_length=50, blank=True, null=True)
    bio = models.TextField(max_length=500, blank=True)
    receive_email_notifications = models.BooleanField(default=True)
    theme_preference = models.CharField(max_length=20, choices=[('light', 'Light'), ('dark', 'Dark')], default='light')
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        validators=[FileExtensionValidator(['jpg', 'jpeg', 'png', 'gif'])],
        blank=True, null=True,
        default='profile_pictures/default.jpg'
    )

    def __str__(self):
        return f"{self.user.username}'s Profile"

class ChatRoom(models.Model):
    ROOM_TYPES = [
        ('private', 'Private (1-on-1)'),
        ('group', 'Group'),
        ('broadcast', 'Broadcast'),  # Admin → Many (future)
    ]

    name = models.CharField(max_length=100, blank=True, null=True)  # For groups only
    room_id = models.CharField(max_length=100, unique=True, db_index=True)  # e.g. "group_123"
    type = models.CharField(max_length=20, choices=ROOM_TYPES, default='private')
    creator = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, related_name='created_rooms')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    image = models.ImageField(upload_to='group_images/', blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    last_message = models.ForeignKey('ChatMessage', null=True, blank=True, on_delete=models.SET_NULL)
    only_admins_can_send = models.BooleanField(default=False, help_text="Restrict messaging to admins only")
    invite_code = models.CharField(max_length=12, unique=True, blank=True, null=True)
    invite_expires_at = models.DateTimeField(null=True, blank=True)
    invite_max_uses = models.PositiveIntegerField(null=True, blank=True, default=None)  # None = unlimited
    invite_used_count = models.PositiveIntegerField(default=0)

    # Group Settings
    allow_invite_link = models.BooleanField(default=True)
    require_admin_approval = models.BooleanField(default=False)  # New members need approval
    is_public = models.BooleanField(default=False)  # Public groups visible in search

    # NEW: Ban list (banned users can't rejoin unless unbanned)
    banned_users = models.ManyToManyField(
        CustomUser,
        related_name='banned_from_rooms',
        blank=True
    )
    pinned_message = models.OneToOneField(
        'ChatMessage',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='pinned_in_room'
    )
    announcement = models.TextField(blank=True, null=True)  # Simple text announcement at top
    announcement_updated_at = models.DateTimeField(null=True, blank=True)
    announcement_updated_by = models.ForeignKey(
        CustomUser, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='updated_announcements'
    )

    def generate_invite_link(self, expires_in_hours=24*7, max_uses=None):
        """Generate or regenerate invite link"""
        self.invite_code = secrets.token_urlsafe(8)[:12]
        self.invite_expires_at = timezone.now() + timezone.timedelta(hours=expires_in_hours)
        self.invite_max_uses = max_uses
        self.invite_used_count = 0
        self.save(update_fields=[
            'invite_code', 'invite_expires_at',
            'invite_max_uses', 'invite_used_count'
        ])
        return self.invite_code

    @property
    def invite_link(self):
        if not self.invite_code:
            return None
        base = settings.FRONTEND_URL.rstrip("/")
        return f"{base}/join/{self.invite_code}"

    def is_invite_valid(self):
        if not self.invite_code:
            return False
        if self.invite_expires_at and timezone.now() > self.invite_expires_at:
            return False
        if self.invite_max_uses and self.invite_used_count >= self.invite_max_uses:
            return False
        return True

    def clean(self):
        # Prevent creator from being banned
        if self.creator and self.banned_users.filter(id=self.creator.id).exists():
            raise ValidationError("Cannot ban the group creator.")

    def save(self, *args, **kwargs):
        if not self.room_id:
            self.room_id = f"room_{uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name or f"Room {self.room_id}"

    @property
    def member_count(self):
        return self.members.count()

    @property
    def online_count(self):
        return self.members.filter(is_online=True).count()


class RoomMember(models.Model):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('member', 'Member'),
    ]
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    joined_at = models.DateTimeField(auto_now_add=True)
    is_muted = models.BooleanField(default=False)
    unread_count = models.PositiveIntegerField(default=0)
    added_by = models.ForeignKey(CustomUser, null=True, blank=True, on_delete=models.SET_NULL, related_name='added_members')

    class Meta:
        unique_together = ('room', 'user')
        indexes = [models.Index(fields=['room', 'role'])]

    def is_admin(self):
        return self.role == 'admin'


class ChatMessage(models.Model):
    ATTACHMENT_TYPES = [
        ('image', 'Image'), ('video', 'Video'), ('audio', 'Audio'), ('file', 'File')
    ]

    sender = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="sent_messages")
    receiver = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="received_messages", null=True, blank=True)
    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages", null=True, blank=True)
    message = models.TextField(blank=True, null=True)
    attachment = models.FileField(upload_to="chat_attachments/", blank=True, null=True)
    attachment_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES, blank=True, null=True)
    attachment_duration = models.FloatField(null=True, blank=True)  # for audio/video
    reply_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')

    # Status
    delivered_at = models.DateTimeField(null=True, blank=True)
    seen_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    deleted_for_everyone = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Scheduling
    scheduled_for = models.DateTimeField(null=True, blank=True)
    is_scheduled = models.BooleanField(default=False)

    timestamp = models.DateTimeField(auto_now_add=True)
    search_vector = SearchVectorField(null=True)  # For full-text search

    mentioned_users = models.ManyToManyField(
        CustomUser,
        related_name='mentioned_in_messages',
        blank=True
    )
    is_announcement = models.BooleanField(default=False)  # For pinned message

    class Meta:
        indexes = [
            models.Index(fields=['room', '-timestamp']),
            GinIndex(fields=['search_vector']),
            models.Index(fields=['sender']),
            models.Index(fields=['receiver']),
            models.Index(fields=['timestamp']),
        ]
        ordering = ['timestamp']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update search index
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("""
                UPDATE users_chatmessage
                SET search_vector = to_tsvector('english', coalesce(message, ''))
                WHERE id = %s
            """, [self.id])
    def __str__(self):
        return f"{self.sender} → {self.receiver}: {self.message[:30]}"


class MessageReaction(models.Model):
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'emoji')


class BlockedUser(models.Model):
    blocker = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='blocked_users')
    blocked = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='blocked_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('blocker', 'blocked')


class StarredMessage(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE)
    starred_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'message')


class OTP(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name="otps")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    session_id = models.UUIDField(default=uuid.uuid4, editable=False)

    def is_expired(self):
        return timezone.now() > self.expires_at

    def __str__(self):
        return f"{self.user.username} - {self.code} - {'Used' if self.is_used else 'Active'}"

class Sticker(models.Model):
    name = models.CharField(max_length=100)
    file = models.ImageField(upload_to="stickers/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def url(self):
        return self.file.url

class CryptoKeyBundle(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    identity_key = models.TextField()
    signed_pre_key = models.TextField()
    signed_pre_key_signature = models.TextField()
    pre_keys = models.JSONField(default=list)  # list of one-time prekeys

class SearchAnalytics(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='searches')
    query = models.CharField(max_length=255, db_index=True)
    filters = models.JSONField(default=dict)  # {type: "customer", status: "Pending", ...}
    results_count = models.PositiveIntegerField()
    has_results = models.BooleanField()
    clicked_result = models.JSONField(null=True, blank=True)  # {title, type, href}
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['query']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user} searched '{self.query}' → {self.results_count} results"