# backend/users/serializers.py
from django.db import models
from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.contenttypes.models import ContentType

from .models import (
    CustomUser, UserProfile, ChatRoom, RoomMember, ChatMessage,
    MessageReaction, Sticker, BlockedUser, StarredMessage, OTP,
    Post, Comment, Reaction, Share, Activity, Friendship
)


# ──────────────────────────────────────────────────────────────
# AUTH & USER SERIALIZERS
# ──────────────────────────────────────────────────────────────

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            username=data.get("username"),
            password=data.get("password")
        )
        if user is None:
            raise serializers.ValidationError("Invalid username or password")
        data["user"] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    """
    Full User Serializer for profile, create, update, etc.
    - Accepts first_name + last_name separately (correct fields)
    - Accepts new_password (write-only) → hashes and saves as password
    - Automatically sets created_by on creation
    - Never exposes password or internal fields
    """
    # Write-only field for password input (frontend sends new_password)
    new_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={'input_type': 'password'}
    )

    # Read-only computed fields
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    is_online = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(read_only=True)
    friends_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'username',
            'first_name',          # ← real model field
            'last_name',           # ← real model field
            'full_name',           # computed
            'email',
            'phone',
            'role',
            'branch',
            'company',
            'bio',
            'location',
            'website',
            'birth_date',
            'is_active',
            'is_global_admin',
            'is_verified',
            'last_seen',
            'is_online',
            'status_display',
            'profile_picture',
            'profile_picture_url',
            'notify_realtime',
            'notify_email',
            'notify_sms',
            'notify_browser',
            'notify_sound',
            'friends_count',
            'new_password',        # frontend input only
        ]
        read_only_fields = [
            'id',
            'full_name',
            'is_online',
            'status_display',
            'profile_picture_url',
            'friends_count',
            'created_by',          # protected
            'last_seen',
        ]
        extra_kwargs = {
            'password': {'write_only': True},  # legacy if needed
            'profile_picture': {'required': False},
        }

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            return obj.profile_picture.url
        return "/images/avatar-placeholder.png"

    def get_is_online(self, obj):
        if not obj.last_seen:
            return False
        return (timezone.now() - obj.last_seen).total_seconds() < 120

    def get_friends_count(self, obj):
        return obj.get_friends().count()

    def create(self, validated_data):
        """
        Create user with:
        - first_name & last_name saved directly
        - new_password hashed and set as password
        - created_by auto-set
        """
        # Extract password from frontend (called new_password)
        password = validated_data.pop('new_password', None)

        # Create user with all other validated fields
        user = CustomUser(**validated_data)

        # Handle password
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        # Auto-set created_by (secure – frontend can't override)
        if self.context['request'].user.is_authenticated:
            user.created_by = self.context['request'].user

        user.save()
        return user

    def update(self, instance, validated_data):
        """
        Update user:
        - first_name & last_name updated directly
        - new_password (if sent) hashed and set
        """
        # Extract password
        password = validated_data.pop('new_password', None)
        profile_picture = validated_data.pop('profile_picture', None)

        # Update all normal fields (including first_name, last_name)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Handle password change
        if password is not None:
            instance.set_password(password)

        # Handle profile picture
        if profile_picture is not None:
            instance.profile_picture = profile_picture

        instance.save()
        return instance

class UserListSerializer(serializers.ModelSerializer):
    """
    Lightweight - Used for lists, dropdowns, sidebar
    """
    full_name = serializers.CharField(source='get_full_name', read_only=True)
    is_online = serializers.SerializerMethodField()
    profile_picture_url = serializers.SerializerMethodField()
    company_name = serializers.CharField(source='company.name', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'full_name', 'phone', 'email',
            'role', 'company_id', 'company_name', 'branch_id', 'branch_name', 'is_active', 'is_online'
        ]

    def get_is_online(self, obj):
        if not obj.last_seen:
            return False
        return (timezone.now() - obj.last_seen).total_seconds() < 120

    def get_profile_picture_url(self, obj):
        if obj.profile_picture:
            return obj.profile_picture.url
        return "/images/avatar-placeholder.png"

class SidebarUserSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ["id", "username", "profile_picture", "is_online", "last_message", "last_message_time", "unread_count"]

    def get_last_message(self, obj):
        user_id = self.context.get("current_user_id")
        if not user_id:
            return ""
        last_msg = ChatMessage.objects.filter(
            models.Q(sender=obj, receiver_id=user_id) |
            models.Q(sender_id=user_id, receiver=obj)
        ).order_by("-timestamp").first()
        return last_msg.message if last_msg else ""

    def get_last_message_time(self, obj):
        user_id = self.context.get("current_user_id")
        if not user_id:
            return None
        last_msg = ChatMessage.objects.filter(
            models.Q(sender=obj, receiver_id=user_id) |
            models.Q(sender_id=user_id, receiver=obj)
        ).order_by("-timestamp").first()
        return last_msg.timestamp.isoformat() if last_msg else None

    def get_unread_count(self, obj):
        user_id = self.context.get("current_user_id")
        if not user_id:
            return 0
        return ChatMessage.objects.filter(
            sender=obj, receiver_id=user_id, seen_at__isnull=True
        ).count()


# ──────────────────────────────────────────────────────────────
# SOCIAL FEATURE SERIALIZERS
# ──────────────────────────────────────────────────────────────

class FriendshipSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)

    class Meta:
        model = Friendship
        fields = ['id', 'from_user', 'to_user', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']

class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    comments_count = serializers.IntegerField(read_only=True, source='comments.count')
    reactions_count = serializers.SerializerMethodField()
    is_visible = serializers.SerializerMethodField()
    share_count = serializers.IntegerField(read_only=True)
    likes_count = serializers.SerializerMethodField()
    user_has_liked = serializers.SerializerMethodField()
    media = models.FileField(upload_to='posts/', null=True, blank=True)
    media_type = models.CharField(max_length=10, choices=[('photo','Photo'), ('video','Video'), ('audio','Audio')], null=True, blank=True)

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'content', 'media', 'media_type',
            'privacy', 'allowed_users', 'is_announcement',
            'created_at', 'updated_at', 'views', 'shares',
            'comments_count', 'reactions_count', 'share_count', 'is_visible', 'user_has_liked', 'likes_count'
        ]
        read_only_fields = [
            'user', 'created_at', 'updated_at', 'views', 'shares',
            'comments_count', 'reactions_count', 'share_count', 'user_has_liked', 'likes_count'
        ]

    def get_reactions_count(self, obj):
        # Count all reactions where target is this Post instance
        from django.contrib.contenttypes.models import ContentType
        return Reaction.objects.filter(
            content_type=ContentType.objects.get_for_model(Post),
            object_id=obj.id
        ).count()

    def get_media(self, obj):
        if obj.media:
            return obj.media.url.lstrip('http://127.0.0.1:8000')  # safety net
        return None

    def get_is_visible(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.privacy == 'public'
        return obj.is_visible_to(request.user)

    def get_likes_count(self, obj):
        # Always return integer, never null/None
        from django.contrib.contenttypes.models import ContentType
        return Reaction.objects.filter(
            content_type=ContentType.objects.get_for_model(Post),
            object_id=obj.id,
            reaction_type='like'  # or whatever your like reaction is
        ).count()  # .count() always returns int >= 0

    def get_user_has_liked(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return Reaction.objects.filter(
            content_type=ContentType.objects.get_for_model(Post),
            object_id=obj.id,
            user=request.user,
            reaction_type='like'
        ).exists()

class CommentSerializer(serializers.ModelSerializer):
    """
    Comment Serializer - Optimized for:
    - Nested usage (/posts/<id>/comments/)
    - Auto-assigned user & post in viewset
    - Safe replies count (default 0)
    - Clean output (no nulls, relative paths)
    """
    user = UserSerializer(read_only=True)  # Full user info for display
    replies_count = serializers.IntegerField(
        read_only=True,
        source='replies.count',
        default=0  # Prevent null/undefined in frontend
    )

    class Meta:
        model = Comment
        fields = [
            'id',
            'content',
            'user',
            'post',           # Only needed if you want to return post ID
            'parent',         # For threaded comments
            'created_at',
            'updated_at',
            'replies_count',
        ]
        read_only_fields = [
            'id',
            'user',           # Auto-set in viewset
            'post',           # Auto-set in viewset (if nested)
            'created_at',
            'updated_at',
            'replies_count',
        ]
        extra_kwargs = {
            'content': {'required': True, 'allow_blank': False},
            'parent': {'required': False, 'allow_null': True},
        }

    # ─── Validation ───────────────────────────────────────────────────────────
    def validate_content(self, value):
        """Ensure content is not empty after trimming"""
        if not value.strip():
            raise serializers.ValidationError("Comment cannot be empty.")
        return value.strip()

    def validate_parent(self, value):
        """Optional: Prevent self-parenting or invalid parents"""
        if value and value == self.instance:
            raise serializers.ValidationError("A comment cannot be its own parent.")
        return value

    # ─── Create: Allow post/user to be set from context ───────────────────────
    def create(self, validated_data):
        """
        Allow viewset to pass post & user via context.
        Frontend only needs to send { "content": "...", "parent": optional_id }
        """
        # These are set by viewset, not client
        post = self.context.get('post')
        user = self.context.get('request').user

        if not post:
            raise serializers.ValidationError({"post": "Post is required (set in viewset)."})

        comment = Comment.objects.create(
            post=post,
            user=user,
            **validated_data
        )
        return comment

    # ─── Update: Only allow content & parent changes ──────────────────────────
    def update(self, instance, validated_data):
        instance.content = validated_data.get('content', instance.content)
        instance.parent = validated_data.get('parent', instance.parent)
        instance.save()
        return instance


class ReactionSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    target_type = serializers.CharField(source='content_type.name', read_only=True)

    class Meta:
        model = Reaction
        fields = [
            'id', 'user', 'reaction_type', 'target_type',
            'object_id', 'created_at'
        ]
        read_only_fields = ['user', 'created_at']


class ShareSerializer(serializers.ModelSerializer):
    sharer = UserSerializer(read_only=True)
    original_post = PostSerializer(read_only=True)

    class Meta:
        model = Share
        fields = [
            'id', 'sharer', 'original_post', 'caption',
            'privacy', 'shared_at', 'share_count'
        ]
        read_only_fields = ['sharer', 'shared_at', 'share_count']


class UserMinimalSerializer(serializers.ModelSerializer):
    """Minimal user info for activity logs"""
    full_name = serializers.CharField(source='get_full_name', read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'full_name', 'profile_picture_url', 'role']


class ActivitySerializer(serializers.ModelSerializer):
    """
    Serializer for Activity model - used in real-time feeds, admin logs, notifications
    """
    user = UserMinimalSerializer(read_only=True)
    target_type = serializers.SerializerMethodField()
    target_content = serializers.SerializerMethodField()
    relative_time = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id',
            'user',
            'action_type',
            'target_type',
            'target_content',
            'target_object_id',
            'extra_data',
            'ip_address',
            'user_agent',
            'device_info',
            'created_at',
            'relative_time',
        ]
        read_only_fields = [
            'id', 'created_at', 'relative_time', 'target_type', 'target_content'
        ]

    def get_target_type(self, obj):
        """Human-readable target model name"""
        if obj.target_content_type:
            return obj.target_content_type.model_class().__name__.lower()
        return None

    def get_target_content(self, obj):
        """Optional: serialized target if content_type exists"""
        if not obj.target_content_type or not obj.target:
            return None

        model_class = obj.target_content_type.model_class()
        # You can add specific serializers per target type
        if model_class == Post:
            from .serializers import PostMinimalSerializer
            return PostMinimalSerializer(obj.target).data
        elif model_class == Comment:
            from .serializers import CommentMinimalSerializer
            return CommentMinimalSerializer(obj.target).data
        # Add more cases as needed

        return {
            'id': obj.target_object_id,
            'type': obj.target_content_type.model
        }

    def get_relative_time(self, obj):
        """Human-friendly time ago (e.g. '2 hours ago')"""
        delta = timezone.now() - obj.created_at
        if delta.days >= 1:
            return f"{delta.days} day{'s' if delta.days > 1 else ''} ago"
        elif delta.seconds >= 3600:
            hours = delta.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif delta.seconds >= 60:
            minutes = delta.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"


class ActivityMinimalSerializer(serializers.ModelSerializer):
    """Lightweight version for lists/feed previews"""
    user = UserMinimalSerializer(read_only=True)
    relative_time = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = ['id', 'user', 'action_type', 'relative_time', 'created_at']
        read_only_fields = ['id', 'created_at', 'relative_time']

    def get_relative_time(self, obj):
        """
        Returns human-friendly 'time ago' string (e.g. '2 hours ago')
        """
        delta = timezone.now() - obj.created_at

        if delta.days >= 365:
            years = delta.days // 365
            return f"{years} year{'s' if years > 1 else ''} ago"
        if delta.days >= 30:
            months = delta.days // 30
            return f"{months} month{'s' if months > 1 else ''} ago"
        if delta.days >= 1:
            return f"{delta.days} day{'s' if delta.days > 1 else ''} ago"
        if delta.seconds >= 3600:
            hours = delta.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        if delta.seconds >= 60:
            minutes = delta.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        return "Just now"

class BlockedUserCreateSerializer(serializers.ModelSerializer):
    """
    For creating a new block (POST)
    """
    class Meta:
        model = BlockedUser
        fields = ['blocked', 'reason', 'expires_at']
        extra_kwargs = {
            'blocked': {'required': True},
            'reason': {'required': False, 'allow_blank': True},
            'expires_at': {'required': False, 'allow_null': True},
        }

    def validate_blocked(self, value):
        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError("Request context missing.")
        if value == request.user:
            raise serializers.ValidationError("You cannot block yourself.")
        if BlockedUser.objects.filter(
                blocker=request.user,
                blocked=value,
                is_active=True
        ).exists():
            raise serializers.ValidationError("This user is already blocked.")
        return value

    def create(self, validated_data):
        request = self.context['request']
        return BlockedUser.objects.create(
            blocker=request.user,
            created_by=request.user if request.user.is_staff else None,
            **validated_data
        )


class BlockedUserSerializer(serializers.ModelSerializer):
    """
    Full detail serializer for viewing blocks
    """
    blocker = UserMinimalSerializer(read_only=True)
    blocked = UserMinimalSerializer(read_only=True)
    created_by = UserMinimalSerializer(read_only=True, required=False, allow_null=True)
    expires_in = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = BlockedUser
        fields = [
            'id',
            'blocker',
            'blocked',
            'reason',
            'created_at',
            'created_by',
            'expires_at',
            'expires_in',
            'is_active',
            'status',
        ]
        read_only_fields = [
            'id', 'created_at', 'expires_in', 'status',
            'blocker', 'blocked', 'created_by'
        ]

    def get_expires_in(self, obj):
        if not obj.is_active:
            return "Unblocked"
        if not obj.expires_at:
            return "Permanent"
        delta = obj.expires_at - timezone.now()
        if delta.total_seconds() <= 0:
            return "Expired"
        days = delta.days
        hours = delta.seconds // 3600
        if days > 0:
            return f"{days} day{'s' if days > 1 else ''}"
        elif hours > 0:
            return f"{hours} hour{'s' if hours > 1 else ''}"
        return "Less than an hour"

    def get_status(self, obj):
        if not obj.is_active:
            return "Unblocked"
        if obj.is_expired():
            return "Expired"
        return "Active"

class BlockedUserListSerializer(BlockedUserSerializer):
    """
    Lightweight version for list views
    """
    class Meta(BlockedUserSerializer.Meta):
        fields = ['id', 'blocked', 'reason', 'status', 'created_at', 'expires_in']

# ──────────────────────────────────────────────────────────────
# CHAT SYSTEM SERIALIZERS
# ──────────────────────────────────────────────────────────────

class RoomMemberSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = RoomMember
        fields = ['user', 'role', 'joined_at', 'is_muted']


class ChatRoomSerializer(serializers.ModelSerializer):
    members = RoomMemberSerializer(many=True, read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    online_count = serializers.IntegerField(read_only=True)
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = '__all__'

    def get_last_message_preview(self, obj):
        if obj.last_message:
            return {
                "message": obj.last_message.message or "[Media]",
                "sender": obj.last_message.sender.username,
                "timestamp": obj.last_message.timestamp.isoformat()
            }
        return None


class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    room = ChatRoomSerializer(read_only=True)
    reply_to = serializers.SerializerMethodField()
    reactions = ReactionSerializer(many=True, read_only=True)
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = '__all__'
        read_only_fields = ('sender', 'room', 'timestamp')

    def get_reply_to(self, obj):
        if obj.reply_to and not obj.reply_to.is_deleted:
            return {
                "id": obj.reply_to.id,
                "message": obj.reply_to.message or "[Attachment]",
                "sender": obj.reply_to.sender.username
            }
        return None

    def get_is_mine(self, obj):
        request = self.context.get('request')
        return obj.sender == request.user if request else False


# ──────────────────────────────────────────────────────────────
# UTILITY SERIALIZERS
# ──────────────────────────────────────────────────────────────

class StickerSerializer(serializers.ModelSerializer):
    """
    Simple serializer for stickers with full media URL
    """
    full_url = serializers.SerializerMethodField()

    class Meta:
        model = Sticker
        fields = ["id", "name", "url", "full_url"]
        read_only_fields = ["id", "full_url"]

    def get_full_url(self, obj):
        """
        Returns the absolute URL for the sticker (useful for frontend)
        """
        if obj.url:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.url)
            return f"{settings.MEDIA_URL}{obj.url}"
        return None


class UserProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for UserProfile model (notification & theme preferences)
    """
    class Meta:
        model = UserProfile
        fields = [
            "receive_email_notifications",
            "theme_preference",
            "profile_picture",
        ]
        read_only_fields = ["profile_picture"]  # uploaded separately


class UserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating user profile.
    - Supports partial updates (PATCH)
    - Handles new_password (hashed automatically)
    - Updates nested UserProfile if provided
    """
    profile = UserProfileSerializer(required=False)
    new_password = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        style={'input_type': 'password'}
    )

    class Meta:
        model = CustomUser
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "branch",
            "bio",
            "location",
            "website",
            "birth_date",
            "profile_picture",
            "profile",
            "new_password",
        ]
        read_only_fields = ["role"]  # usually not changeable by user

    def validate_new_password(self, value):
        """
        Optional: add password strength validation here if needed
        """
        if value and len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        return value

    def update(self, instance, validated_data):
        """
        Update user and nested profile
        - Handles password change separately
        - Updates profile via update_or_create
        """
        # Extract special fields
        new_password = validated_data.pop('new_password', None)
        profile_data = validated_data.pop('profile', None)
        profile_picture = validated_data.pop('profile_picture', None)

        # Update main user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Handle password change
        if new_password:
            instance.set_password(new_password)

        # Handle profile picture (if uploaded separately)
        if profile_picture is not None:
            instance.profile_picture = profile_picture

        instance.save()

        # Update or create profile
        if profile_data:
            UserProfile.objects.update_or_create(
                user=instance,
                defaults=profile_data
            )

        return instance

    def to_representation(self, instance):
        """
        After update/create, return full representation (including profile)
        """
        ret = super().to_representation(instance)
        # Add nested profile if exists
        if hasattr(instance, 'userprofile'):
            ret['profile'] = UserProfileSerializer(instance.userprofile).data
        return ret