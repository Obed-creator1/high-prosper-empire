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
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class CustomUser(AbstractUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('ceo', 'CEO'), ('admin', 'Admin'), ('hr', 'HR'), ('accounting', 'Accounting'),
        ('manager', 'Field Sector Manager'), ('supervisor', 'Field Site Supervisor'),
        ('collector', 'Collector'), ('staff', 'Staff'), ('driver', 'Driver'),
        ('manpower', 'Manpower'), ('customer', 'Customer'), ('user', 'Regular User'),  # added default/fallback
    ]

    company = models.ForeignKey('tenants.Company', on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    is_global_admin = models.BooleanField(default=False)  # Can see all companies
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    phone = models.CharField(max_length=20, blank=True, null=True)
    branch = models.ForeignKey(
        'tenants.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users',
        verbose_name="Branch",
        help_text="The branch this user belongs to"
    )
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_users',
        verbose_name="Created by"
    )
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
    is_active = models.BooleanField(default=True)
    is_deleted = models.BooleanField(default=False)  # ← NEW: Soft delete flag
    profile_picture_url = models.URLField(max_length=500, blank=True, null=True)
    date_joined = models.DateTimeField(default=timezone.now)

    # Per-type toggles (optional)
    notify_payment = models.BooleanField(default=True)
    notify_customer_update = models.BooleanField(default=True)
    notify_chat = models.BooleanField(default=True)
    notify_task = models.BooleanField(default=True)
    notify_leave = models.BooleanField(default=True)
    notify_system = models.BooleanField(default=True)

    # Social features like Facebook
    bio = models.TextField(blank=True, null=True)  # User bio
    location = models.CharField(max_length=100, blank=True, null=True)  # User location
    website = models.URLField(blank=True, null=True)  # Personal website
    birth_date = models.DateField(null=True, blank=True)  # Birthday

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

    # Actions like on Facebook
    def add_friend(self, other_user):
        Friendship.objects.get_or_create(from_user=self, to_user=other_user, status='pending')

    def accept_friend(self, other_user):
        friendship = Friendship.objects.filter(from_user=other_user, to_user=self, status='pending').first()
        if friendship:
            friendship.status = 'accepted'
            friendship.save()
            # Create symmetric friendship
            Friendship.objects.create(from_user=self, to_user=other_user, status='accepted')

    def get_friends(self):
        friends_ids = Friendship.objects.filter(
            models.Q(from_user=self) | models.Q(to_user=self),
            status='accepted'
        ).values_list('from_user_id', 'to_user_id')
        all_ids = set()
        for fid, tid in friends_ids:
            all_ids.add(fid)
            all_ids.add(tid)
        all_ids.discard(self.id)
        return CustomUser.objects.filter(id__in=all_ids)


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

# Social Models like Facebook

class Friendship(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
    ]
    from_user = models.ForeignKey(CustomUser, related_name='friend_requests_sent', on_delete=models.CASCADE)
    to_user = models.ForeignKey(CustomUser, related_name='friend_requests_received', on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user} -> {self.to_user} ({self.status})"


class Post(models.Model):
    PRIVACY_CHOICES = [
        ('public', 'Public'),
        ('friends', 'Friends'),
        ('private', 'Private'),
        ('specific', 'Specific Users'),
    ]
    MEDIA_TYPES = [
        ('photo', 'Photo'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(blank=True, null=True)
    media = models.FileField(upload_to='posts/media/', blank=True, null=True)
    media_type = models.CharField(max_length=20, choices=MEDIA_TYPES, blank=True, null=True)
    privacy = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='public')
    allowed_users = models.ManyToManyField(CustomUser, related_name='allowed_posts', blank=True)  # For 'specific'
    is_announcement = models.BooleanField(default=False)  # For admins/ceo/etc.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    views = models.PositiveIntegerField(default=0)
    shares = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username}'s Post #{self.id}"

    def increment_views(self):
        self.views += 1
        self.save(update_fields=['views'])

    def share(self, by_user):
        self.shares += 1
        self.save(update_fields=['shares'])
        # Create activity
        Activity.objects.create(
            user=by_user,
            action_type='shared',
            content_type=ContentType.objects.get_for_model(self),
            object_id=self.id
        )

    def is_visible_to(self, viewer):
        if self.privacy == 'public':
            return True
        if self.privacy == 'friends':
            return viewer in self.user.get_friends()
        if self.privacy == 'private':
            return viewer == self.user
        if self.privacy == 'specific':
            return viewer in self.allowed_users.all()
        return False


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    content = models.TextField()
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')  # For threaded comments
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user.username} on Post #{self.post.id}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Create activity
        Activity.objects.create(
            user=self.user,
            action_type='commented',
            content_type=ContentType.objects.get_for_model(self.post),
            object_id=self.post.id
        )


class Reaction(models.Model):
    REACTION_TYPES = [
        ('like', 'Like'),
        ('love', 'Love'),
        ('haha', 'Haha'),
        ('wow', 'Wow'),
        ('sad', 'Sad'),
        ('angry', 'Angry'),
    ]

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    target = GenericForeignKey('content_type', 'object_id')  # Can react to Post or Comment
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    reaction_type = models.CharField(max_length=20, choices=REACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'content_type', 'object_id', 'reaction_type')

    def __str__(self):
        return f"{self.user.username} {self.reaction_type} on {self.target}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Create activity
        Activity.objects.create(
            user=self.user,
            action_type=f'reacted_{self.reaction_type}',
            content_type=self.content_type,
            object_id=self.object_id
        )


class Activity(models.Model):
    """
    Comprehensive user activity tracking
    """
    ACTION_TYPES = [
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('login_failed', 'Failed Login Attempt'),
        ('password_change', 'Password Changed'),
        ('profile_update', 'Profile Updated'),
        ('posted', 'Posted Content'),
        ('commented', 'Commented'),
        ('shared', 'Shared Content'),
        ('reacted_like', 'Liked'),
        ('reacted_love', 'Loved'),
        ('reacted_other', 'Other Reaction'),
        ('friended', 'Added Friend/Followed'),
        ('unfriended', 'Removed Friend/Unfollowed'),
        ('blocked_user', 'Blocked User'),
        ('unblocked_user', 'Unblocked User'),
        ('joined_group', 'Joined Group'),
        ('left_group', 'Left Group'),
        ('other', 'Other Action'),
    ]

    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    action_type = models.CharField(max_length=50, choices=ACTION_TYPES)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    device_info = models.CharField(max_length=255, blank=True, null=True)  # e.g. "iPhone 14 - iOS 18"
    extra_data = models.JSONField(default=dict, blank=True)  # Flexible: post_id, comment_id, etc.
    target_content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    target_object_id = models.PositiveIntegerField(null=True, blank=True)
    target = GenericForeignKey('target_content_type', 'target_object_id')
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Activity"
        verbose_name_plural = "Activities"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action_type', '-created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action_type} at {self.created_at.strftime('%Y-%m-%d %H:%M')}"


class BlockedUser(models.Model):
    """
    User blocking relationships with expiration support
    """
    blocker = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='blocked_users'
    )
    blocked = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='blocked_by'
    )
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='blocks_performed',
        help_text="Admin/moderator who performed the block (if applicable)"
    )
    expires_at = models.DateTimeField(null=True, blank=True, help_text="When the block expires (optional)")
    is_active = models.BooleanField(default=True, help_text="Soft-unblock support")

    class Meta:
        unique_together = ('blocker', 'blocked')
        verbose_name = "Blocked User"
        verbose_name_plural = "Blocked Users"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['blocker', 'blocked']),
            models.Index(fields=['is_active', 'expires_at']),
        ]

    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        if self.expires_at:
            return f"{self.blocker} blocked {self.blocked} ({status} until {self.expires_at.date()})"
        return f"{self.blocker} blocked {self.blocked} ({status})"

    def is_expired(self):
        return self.expires_at and self.expires_at < timezone.now()

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

class Share(models.Model):
    """
    Tracks when a user shares a post (re-post / share).
    Supports original post attribution and share chain tracking.
    """
    # The user who performed the share
    sharer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='shares_made',
        verbose_name="Who shared"
    )

    # The original post being shared
    original_post = models.ForeignKey(
        'Post',
        on_delete=models.CASCADE,
        related_name='share_instances',   # ← Changed! No longer 'shares'
        verbose_name="Shared Post"
    )

    # Optional: the user's own caption/comment when sharing
    caption = models.TextField(
        blank=True,
        null=True,
        help_text="Optional personal message added by the sharer"
    )

    # When the share happened
    shared_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Shared At"
    )

    # Optional: track if this share is visible to specific audience (extra control)
    privacy = models.CharField(
        max_length=20,
        choices=Post.PRIVACY_CHOICES,  # Reuse same choices as Post
        default='public',
        help_text="Visibility of this share"
    )

    # Optional: number of times this particular share instance was shared further
    share_count = models.PositiveIntegerField(
        default=0,
        help_text="How many times this share was re-shared by others"
    )

    class Meta:
        ordering = ['-shared_at']
        indexes = [
            models.Index(fields=['sharer', '-shared_at']),
            models.Index(fields=['original_post', '-shared_at']),
        ]
        verbose_name = "Share"
        verbose_name_plural = "Shares"

    def __str__(self):
        return f"{self.sharer.username} shared post #{self.original_post.id} at {self.shared_at.strftime('%Y-%m-%d %H:%M')}"

    def save(self, *args, **kwargs):
        """
        When a share is created:
        1. Increment the original post's share count
        2. Create an activity entry
        """
        is_new = self.pk is None

        super().save(*args, **kwargs)

        if is_new:
            # Increment total shares on the original post
            self.original_post.shares += 1
            self.original_post.save(update_fields=['shares'])

            # Create activity log
            Activity.objects.create(
                user=self.sharer,
                action_type='shared',
                content_type=ContentType.objects.get_for_model(self.original_post),
                object_id=self.original_post.id
            )

    def increment_share_count(self):
        """Called when someone shares *this* share"""
        self.share_count += 1
        self.save(update_fields=['share_count'])