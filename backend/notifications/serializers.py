# notifications/serializers.py — FIXED SERIALIZATION FOR ANY ACTOR/TARGET
from rest_framework import serializers
from notifications.models import Notification
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError
from urllib.parse import urlparse
from .models import PushSubscription
import re

User = get_user_model()

class NotificationSerializer(serializers.ModelSerializer):
    """
    Unified Notification Serializer for django-notifications
    Safely handles any actor/target type (User, Customer, etc.)
    """
    # Core fields
    unread = serializers.BooleanField(read_only=True)
    timestamp = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M:%S')

    # Custom fields
    title = serializers.CharField(read_only=True, allow_null=True)
    message = serializers.CharField(source='description', read_only=True, allow_null=True)
    notification_type = serializers.CharField(read_only=True, allow_null=True)
    action_url = serializers.CharField(read_only=True, allow_null=True)
    image = serializers.CharField(read_only=True, allow_null=True)

    # HR fields
    task_id = serializers.CharField(read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True, allow_null=True)

    # Customers fields
    related_customer_name = serializers.CharField(source='target.name', read_only=True, allow_null=True)
    related_customer_id = serializers.IntegerField(source='target.id', read_only=True, allow_null=True)

    # Users fields
    created_at_time = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M:%S.%f')

    # Recipient details
    recipient_username = serializers.CharField(source='recipient.username', read_only=True)
    recipient_full_name = serializers.CharField(source='recipient.get_full_name', read_only=True, allow_null=True)

    # Actor & Target — FIXED: safe handling for any type
    actor = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',
            'recipient_username',
            'recipient_full_name',
            'actor',
            'verb',
            'title',
            'message',
            'description',
            'notification_type',
            'action_url',
            'image',
            'unread',
            'timestamp',
            'created_at_time',
            'task_id',
            'status',
            'related_customer_id',
            'related_customer_name',
            'target',
        ]
        read_only_fields = fields

    def get_actor(self, obj):
        """Safe actor extraction — works with any actor type"""
        if not obj.actor:
            return None

        actor = obj.actor
        actor_type = actor.__class__.__name__

        if actor_type == 'CustomUser':
            return {
                'id': actor.id,
                'type': 'user',
                'username': actor.username,
                'name': actor.get_full_name() or actor.username,
            }
        elif actor_type == 'Customer':
            return {
                'id': actor.id,
                'type': 'customer',
                'name': actor.name,
                'phone': actor.phone,
            }
        # Add more types if needed
        else:
            return {
                'id': actor.id,
                'type': actor_type.lower(),
                'name': str(actor),
            }

    def get_target(self, obj):
        """Safe target extraction"""
        if not obj.target:
            return None

        target = obj.target
        target_type = target.__class__.__name__

        if target_type == 'Customer':
            return {
                'id': target.id,
                'name': target.name,
                'phone': target.phone,
                'type': 'customer',
            }
        elif target_type == 'CustomUser':
            return {
                'id': target.id,
                'username': target.username,
                'name': target.get_full_name() or target.username,
                'type': 'user',
            }
        else:
            return {
                'id': target.id,
                'type': target_type.lower(),
                'name': str(target),
            }

    def to_representation(self, instance):
        ret = super().to_representation(instance)

        # Human-readable time ago
        time_diff = relativedelta(timezone.now(), instance.timestamp)
        if time_diff.years > 0:
            ret['time_ago'] = f"{time_diff.years} year{'s' if time_diff.years > 1 else ''} ago"
        elif time_diff.months > 0:
            ret['time_ago'] = f"{time_diff.months} month{'s' if time_diff.months > 1 else ''} ago"
        elif time_diff.days > 0:
            ret['time_ago'] = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
        elif time_diff.hours > 0:
            ret['time_ago'] = f"{time_diff.hours} hour{'s' if time_diff.hours > 1 else ''} ago"
        elif time_diff.minutes > 0:
            ret['time_ago'] = f"{time_diff.minutes} minute{'s' if time_diff.minutes > 1 else ''} ago"
        else:
            ret['time_ago'] = "Just now"

        # Icon based on verb or type
        icons = {
            'create': 'Sparkles',
            'update': 'Edit2',
            'delete': 'Trash2',
            'payment_success': 'DollarSign',
            'payment_pending': 'Clock',
            'payment_failed': 'AlertTriangle',
            'info': 'Info',
            'success': 'CheckCircle',
            'warning': 'AlertTriangle',
            'error': 'XCircle',
            'chat': 'MessageSquare',
            'group': 'Users',
            'admin': 'Crown',
            'task': 'ListTodo',
            'leave': 'CalendarX',
            'payroll': 'DollarSign',
        }
        ret['icon'] = icons.get(instance.verb, icons.get(instance.notification_type, 'Bell'))

        return ret

class PushSubscriptionSerializer(serializers.ModelSerializer):
    """
    Modern Web Push Subscription Serializer (2026+)

    Features:
    - Accepts WNS (Edge/Windows), FCM (Chrome/Android), VAPID (Firefox)
    - p256dh/auth optional for WNS, required for others
    - Auto-detects & flags WNS endpoints
    - Enriches browser/platform from User-Agent
    - Requires strong identifier (user/phone/device_id)
    - Deduplicates by endpoint
    """
    # Read-only fields
    id = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True, allow_null=True)
    user_username = serializers.CharField(source="user.username", read_only=True, allow_null=True)
    user_full_name = serializers.CharField(source="user.get_full_name", read_only=True, allow_null=True)
    is_wns = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    # Core fields
    endpoint = serializers.URLField(required=True)
    p256dh = serializers.CharField(max_length=512, required=False, source="keys_p256dh", allow_blank=True)
    auth = serializers.CharField(max_length=512, required=False, source="keys_auth", allow_blank=True)

    # Identifiers — at least one required
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    device_id = serializers.CharField(max_length=255, required=False, allow_blank=True)

    # Enriched metadata
    browser = serializers.CharField(max_length=100, read_only=True)
    platform = serializers.CharField(max_length=100, read_only=True)
    is_active = serializers.BooleanField(default=True, read_only=True)

    class Meta:
        model = PushSubscription
        fields = [
            "id", "user_id", "user_username", "user_full_name",
            "endpoint", "p256dh", "auth",
            "phone", "device_id",
            "browser", "platform", "is_wns", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "user_id", "user_username", "user_full_name",
            "browser", "platform", "is_wns", "is_active",
            "created_at", "updated_at",
        ]

    def validate_endpoint(self, value):
        """Strict but inclusive endpoint validation"""
        if not value or not isinstance(value, str):
            raise ValidationError("Valid HTTPS URL required")

        parsed = urlparse(value)
        if parsed.scheme != "https":
            raise ValidationError("Endpoint must use HTTPS")

        # Optional: block localhost in production
        if "localhost" in value or "127.0.0.1" in value:
            if not settings.DEBUG:
                raise ValidationError("Localhost endpoints not allowed in production")

        return value

    def validate(self, data):
        """Core business rules"""
        endpoint = data.get("endpoint", "")
        is_wns = "wns2-" in endpoint.lower() or "windows.com" in endpoint.lower()

        # WNS does NOT send p256dh/auth — make optional
        if is_wns:
            data["p256dh"] = ""
            data["auth"] = ""
        else:
            # Non-WNS (Chrome/Firefox) MUST have keys
            if not data.get("p256dh") or not data.get("auth"):
                raise ValidationError({
                    "keys": "p256dh and auth keys are required for this browser (Chrome/Firefox/Android)"
                })

        # Require strong identifier
        user = self.context["request"].user if "request" in self.context else None
        phone = data.get("phone", "").strip()
        device_id = data.get("device_id", "").strip()

        if not (user and user.is_authenticated) and not (phone or device_id):
            raise ValidationError(
                "Anonymous subscriptions must provide phone or device_id"
            )

        # Optional phone format
        if phone and not re.match(r"^\+?[1-9]\d{1,14}$", phone):
            raise ValidationError({"phone": "Invalid phone format (E.164 recommended)"})

        return data

    def create(self, validated_data):
        """Create with auto-enrichment"""
        request = self.context.get("request")
        endpoint = validated_data["endpoint"]

        # Deduplicate by endpoint
        subscription = PushSubscription.objects.filter(endpoint=endpoint).first()

        if subscription:
            # Update existing
            for attr, value in validated_data.items():
                if attr not in ["id", "created_at", "updated_at"]:
                    setattr(subscription, attr, value)
            subscription.is_active = True
        else:
            subscription = PushSubscription(**validated_data)

        # Auto-detect WNS flag
        subscription.is_wns = "wns2-" in endpoint.lower() or "windows.com" in endpoint.lower()

        # Safe UA enrichment
        if request:
            ua = request.META.get("HTTP_USER_AGENT", "Unknown").lower()
            subscription.browser = self._detect_browser(ua)
            subscription.platform = self._detect_platform(ua)

        subscription.save()
        return subscription

    def _detect_browser(self, ua: str) -> str:
        if "firefox" in ua: return "Firefox"
        if "edg/" in ua or "edge" in ua: return "Edge"
        if "chrome" in ua: return "Chrome"
        if "safari" in ua and "chrome" not in ua: return "Safari"
        if "opera" in ua or "opr/" in ua: return "Opera"
        return "Other"

    def _detect_platform(self, ua: str) -> str:
        if "android" in ua: return "Android"
        if "iphone" in ua or "ipad" in ua: return "iOS"
        if "windows" in ua: return "Windows"
        if "macintosh" in ua or "mac os" in ua: return "macOS"
        if "linux" in ua: return "Linux"
        return "Other"