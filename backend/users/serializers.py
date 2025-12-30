from django.utils import timezone
from rest_framework import serializers
from django.contrib.auth import authenticate

from .models import CustomUser, UserProfile, ChatMessage, Sticker, MessageReaction, ChatRoom, RoomMember


# -----------------------------------
# LOGIN SERIALIZER
# -----------------------------------
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


# -----------------------------------
# USER SERIALIZER
# -----------------------------------
class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            "id", "username", "email", "role", "branch",
            "is_active", "password", "profile_picture",
            "last_seen", "is_online"
        )
        read_only_fields = ("id",)

    # FIX: This must be included as a field
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj):
        try:
            if obj.profile.profile_picture:
                return obj.profile.profile_picture.url
            return "/static/images/avatar-placeholder.png"
        except UserProfile.DoesNotExist:
            return "/static/images/avatar-placeholder.png"

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = CustomUser(**validated_data)

        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)

        for key, value in validated_data.items():
            setattr(instance, key, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance

    def get_is_online(self, obj):
        if not obj.last_seen:
            return False

        return (timezone.now() - obj.last_seen).total_seconds() < 120


# -----------------------------------
# SIMPLE MESSAGE SERIALIZER
# -----------------------------------
class MessageSerializer(serializers.Serializer):
    sender = serializers.IntegerField()
    receiver = serializers.IntegerField()
    content = serializers.CharField()
    timestamp = serializers.DateTimeField()


# -----------------------------------
# CHAT MESSAGE SERIALIZER
# -----------------------------------
# serializers.py
class ReactionSerializer(serializers.ModelSerializer):
    user = serializers.ReadOnlyField(source='user.username')
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'emoji', 'created_at']

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
    pinned_message = serializers.IntegerField(read_only=True)
    announcement = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = ChatRoom
        fields = '__all__'

    def get_last_message_preview(self, obj):
        if obj.last_message:
            return {
                "message": obj.last_message.message or "[Media]",
                "sender": obj.last_message.sender.username,
                "timestamp": obj.last_message.timestamp
            }
        return None

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    room = ChatRoomSerializer(read_only=True)
    reply_to = serializers.SerializerMethodField()
    reactions = ReactionSerializer(many=True, read_only=True)
    is_mine = serializers.SerializerMethodField()
    mentioned_users = UserSerializer(many=True, read_only=True)
    is_pinned = serializers.SerializerMethodField()

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
        return obj.sender == self.context['request'].user

    def get_is_pinned(self, obj):
        return obj.room.pinned_message == obj if obj.room else False

    def create(self, validated_data):
        request = self.context.get("request")
        sender = request.user if request else None

        receiver_id = validated_data.pop("receiver_id", None)
        if receiver_id is None:
            raise serializers.ValidationError({"receiver_id": "This field is required."})

        receiver = CustomUser.objects.get(id=receiver_id)

        # Auto-generate room ID (sorted by user id)
        room = validated_data.get("room") or f"chat_{min(sender.id, receiver.id)}_{max(sender.id, receiver.id)}"

        chat = ChatMessage.objects.create(
            sender=sender,
            receiver=receiver,
            room=room,
            message=validated_data.get("message", "")
        )
        return chat


# -----------------------------------
# STICKER SERIALIZER
# -----------------------------------
class StickerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sticker
        fields = ["id", "name", "url"]


# -----------------------------------
# USER PROFILE SERIALIZER
# -----------------------------------
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            "receive_email_notifications",
            "theme_preference",
            "profile_picture",
        ]


# -----------------------------------
# USER UPDATE SERIALIZER
# -----------------------------------
class UserUpdateSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)

    class Meta:
        model = CustomUser
        fields = [
            "username", "email", "first_name", "last_name",
            "role", "branch", "profile_picture", "profile"
        ]

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        for key, value in validated_data.items():
            setattr(instance, key, value)

        instance.save()

        if profile_data:
            UserProfile.objects.update_or_create(
                user=instance,
                defaults=profile_data
            )

        return instance

class SidebarUserSerializer(serializers.ModelSerializer):
    last_message = serializers.SerializerMethodField()
    last_message_time = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ["id", "username", "profile_picture", "is_online", "last_message", "last_message_time", "unread_count"]

    def get_last_message(self, obj):
        user_id = self.context.get("current_user_id")
        last_msg = ChatMessage.objects.filter(
            sender=obj, receiver_id=user_id
        ).union(
            ChatMessage.objects.filter(sender_id=user_id, receiver=obj)
        ).order_by("-timestamp").first()
        return last_msg.message if last_msg else ""

    def get_last_message_time(self, obj):
        user_id = self.context.get("current_user_id")
        last_msg = ChatMessage.objects.filter(
            sender=obj, receiver_id=user_id
        ).union(
            ChatMessage.objects.filter(sender_id=user_id, receiver=obj)
        ).order_by("-timestamp").first()
        return last_msg.timestamp.isoformat() if last_msg else None

    def get_unread_count(self, obj):
        user_id = self.context.get("current_user_id")
        return ChatMessage.objects.filter(sender=obj, receiver_id=user_id, seen_at__isnull=True).count()