# notifications/views.py — HIGH PROSPER PROFESSIONAL API 2026
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.utils.decorators import method_decorator
from django.utils.http import url_has_allowed_host_and_scheme
from django.views.decorators.cache import never_cache
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from swapper import load_model
from notifications import settings as notification_settings
from .serializers import NotificationSerializer, PushSubscriptionSerializer
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.conf import settings
from django.shortcuts import render, get_object_or_404, redirect
from django.views.generic import View
from django.views.decorators.csrf import csrf_exempt
from .models import PushSubscription, UnsubscribeToken
from .tasks import (
    send_push_to_user,
    send_push_to_all,
    send_push_to_role,
    send_push_to_users,
    send_push_to_phones,
)
from .utils import send_push_to_subscription  # Your direct sync sender
import logging
import re

logger = logging.getLogger(__name__)
User = get_user_model()

Notification = load_model('notifications', 'Notification')

# ========================
# REST API VIEWSET (Modern DRF)
# ========================
class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for user notifications
    GET /api/v1/notifications/ - List all notifications
    GET /api/v1/notifications/<id>/ - Retrieve single notification
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Return only notifications for the current user
        """
        return Notification.objects.filter(recipient=self.request.user).order_by('-timestamp')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ========================
# FUNCTIONAL ENDPOINTS (Legacy + Real-time Helpers)
# ========================
@login_required
def mark_all_as_read(request):
    """
    Mark all notifications as read
    """
    request.user.notifications.mark_all_as_read()

    _next = request.GET.get('next')
    if _next and url_has_allowed_host_and_scheme(_next, request.get_host()):
        return redirect(_next)
    return redirect('notifications:unread')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_as_read(request, pk=None):
    """
    Mark a single notification as read (API version)
    """
    notification = get_object_or_404(Notification, recipient=request.user, pk=pk)
    notification.mark_as_read()
    return Response({"detail": "Notification marked as read"})


@login_required
def delete(request, pk=None):
    """
    Delete a notification (soft delete if configured)
    """
    notification = get_object_or_404(Notification, recipient=request.user, pk=pk)
    if notification_settings.get_config()['SOFT_DELETE']:
        notification.deleted = True
        notification.save()
    else:
        notification.delete()

    _next = request.GET.get('next')
    if _next and url_has_allowed_host_and_scheme(_next, request.get_host()):
        return redirect(_next)
    return redirect('notifications:all')


@never_cache
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def live_unread_count(request):
    """
    Real-time unread count (for bell badge)
    """
    count = request.user.notifications.unread().count()
    return Response({'unread_count': count})


@never_cache
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def live_unread_list(request):
    """
    Real-time unread notifications list
    """
    unread_list = request.user.notifications.unread()
    serializer = NotificationSerializer(unread_list, many=True)
    return Response({
        'unread_count': unread_list.count(),
        'unread_list': serializer.data
    })


@never_cache
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def live_all_list(request):
    """
    Real-time all notifications list
    """
    all_list = request.user.notifications.all()
    serializer = NotificationSerializer(all_list, many=True)
    return Response({
        'all_count': all_list.count(),
        'all_list': serializer.data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_all_as_read(request):
    """
    Mark all notifications as read for the current user
    """
    Notification.objects.filter(recipient=request.user, unread=True).update(unread=False)
    return Response({"detail": "All notifications marked as read"})

# ────────────────────────────────────────────────
# 1. SUBSCRIBE / UPDATE SUBSCRIPTION
# ────────────────────────────────────────────────
@method_decorator(csrf_exempt, name='dispatch')
class SaveSubscriptionView(APIView):
    """
    Register or update a Web Push subscription – now supports WNS (Edge/Windows).

    • Authenticated users → linked to user
    • Anonymous → identified by phone or device_id
    • Accepts WNS, FCM, VAPID endpoints (no rejection)
    • Returns 200/201 even on partial success
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data

        # 1. Basic payload validation
        if not isinstance(data, dict):
            return Response({"error": "Payload must be a JSON object"}, status=400)

        endpoint = data.get("endpoint")
        if not endpoint or not isinstance(endpoint, str):
            return Response({"error": "Valid endpoint URL is required"}, status=400)

        # 2. Optional: Log endpoint type for debugging (no rejection)
        if "wns2-" in endpoint or "windows.com" in endpoint.lower():
            logger.info(f"WNS endpoint accepted: {endpoint[:80]}...")
        elif "fcm.googleapis.com" in endpoint:
            logger.debug(f"FCM endpoint: {endpoint[:80]}...")
        elif "updates.push.services.mozilla.com" in endpoint:
            logger.debug(f"Firefox/VAPID endpoint: {endpoint[:80]}...")
        else:
            logger.info(f"Unknown push endpoint accepted: {endpoint[:80]}...")

        # 3. Validate keys structure
        keys = data.get("keys")
        if not isinstance(keys, dict) or "p256dh" not in keys or "auth" not in keys:
            return Response({"error": "Missing or invalid 'keys' object (p256dh and auth required)"}, status=400)

        p256dh = keys.get("p256dh", "")
        auth = keys.get("auth", "")

        # Basic key format validation (allow WNS which may have different format)
        if not (p256dh and auth):
            return Response({"error": "p256dh and auth keys are required"}, status=400)

        # 4. Serializer validation (business rules)
        serializer = PushSubscriptionSerializer(data=data, context={"request": request})

        if not serializer.is_valid():
            logger.warning(f"Push subscription validation failed: {serializer.errors}")
            return Response({
                "error": "Invalid subscription data",
                "details": serializer.errors
            }, status=400)

        try:
            # 5. Save / update subscription (WNS now allowed)
            subscription, created = PushSubscription.objects.update_or_create(
                endpoint=serializer.validated_data["endpoint"],
                defaults={
                    "user": request.user if request.user.is_authenticated else None,
                    "keys_p256dh": serializer.validated_data["keys_p256dh"],
                    "keys_auth": serializer.validated_data["keys_auth"],
                    "phone": serializer.validated_data.get("phone"),
                    "device_id": serializer.validated_data.get("device_id"),
                    "browser": serializer.validated_data.get("browser", "unknown"),
                    "platform": serializer.validated_data.get("platform", "unknown"),
                    "is_active": True,
                    # Optional: flag WNS for future special handling
                    "is_wns": "wns2-" in endpoint or "windows.com" in endpoint.lower(),
                }
            )

            action = "created" if created else "updated"
            who = (
                request.user.username if request.user.is_authenticated else
                subscription.phone or subscription.device_id or "anonymous"
            )

            logger.info(f"Push subscription {action} → {who} ({subscription.browser}/{subscription.platform}) {'[WNS]' if subscription.is_wns else ''}")

            # 6. Welcome push (async) – will fail silently for WNS until you implement WNS support
            send_push_to_subscription.delay(
                subscription_id=subscription.id,
                template_name="welcome",
                context={
                    "user_name": request.user.get_full_name() if request.user.is_authenticated else "Customer",
                    "browser": subscription.browser,
                }
            )

            return Response({
                "success": True,
                "created": created,
                "subscription_id": subscription.id,
                "browser": subscription.browser,
                "platform": subscription.platform,
                "is_wns": subscription.is_wns,
                "message": "Push subscription registered successfully"
            }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Critical error saving push subscription")
            return Response(
                {"error": "Failed to register subscription – server error"},
                status=500
            )


# ────────────────────────────────────────────────
# 2. LIST USER'S SUBSCRIPTIONS
# ────────────────────────────────────────────────
class UserSubscriptionsView(APIView):
    """
    List all active push subscriptions for the current user.

    • Authenticated → shows user's subscriptions
    • Anonymous → requires phone or device_id query param
    """
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            subs = PushSubscription.objects.filter(user=request.user, is_active=True)
        else:
            phone = request.query_params.get("phone")
            device_id = request.query_params.get("device_id")

            if not phone and not device_id:
                return Response(
                    {"error": "Anonymous users must provide phone or device_id query parameter"},
                    status=400
                )

            query = {}
            if phone:
                query["phone"] = phone
            if device_id:
                query["device_id"] = device_id

            subs = PushSubscription.objects.filter(**query, is_active=True)

        data = [
            {
                "id": s.id,
                "endpoint": s.endpoint,
                "browser": s.browser,
                "platform": s.platform,
                "created_at": s.created_at.isoformat(),
                "is_active": s.is_active,
            }
            for s in subs
        ]

        return Response({
            "success": True,
            "count": len(data),
            "subscriptions": data
        })


# ────────────────────────────────────────────────
# 3. DELETE SUBSCRIPTION
# ────────────────────────────────────────────────
class DeleteSubscriptionView(APIView):
    """
    Delete a specific push subscription.

    • Authenticated users can delete their own
    • Admin can delete any
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        subscription = get_object_or_404(PushSubscription, pk=pk)

        # Authorization
        if request.user.is_staff or request.user.is_superuser:
            pass  # admin can delete any
        elif subscription.user == request.user:
            pass  # owner can delete own
        else:
            return Response({"error": "Not authorized to delete this subscription"}, status=403)

        try:
            subscription.delete()
            logger.info(f"Push subscription {pk} deleted by {request.user}")
            return Response({
                "success": True,
                "message": "Subscription deleted successfully"
            }, status=200)
        except Exception as e:
            logger.error(f"Delete subscription {pk} failed: {e}")
            return Response({"error": "Failed to delete subscription"}, status=500)


# ────────────────────────────────────────────────
# 4. SEND TEST PUSH (ADMIN/DEBUG TOOL)
# ────────────────────────────────────────────────
class SendTestPushView(APIView):
    """
    Send a test push notification to the current authenticated user.
    Useful for debugging and verifying setup.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        title = request.data.get("title", "High Prosper Test Notification")
        message = request.data.get("message", "This is a test push from the backend.")
        url = request.data.get("url", "/dashboard")

        try:
            send_push_to_user.delay(
                user_id=request.user.id,
                title=title,
                message=message,
                url=url
            )
            logger.info(f"Test push queued for user {request.user.username}")
            return Response({
                "success": True,
                "message": "Test notification queued and should arrive shortly"
            })
        except Exception as e:
            logger.error(f"Test push queue failed: {e}")
            return Response({"error": "Failed to queue test notification"}, status=500)


# ────────────────────────────────────────────────
# 5. BROADCAST / TARGETED PUSH (ADMIN ONLY)
# ────────────────────────────────────────────────
class BroadcastPushView(APIView):
    """
    Admin-only endpoint to send push notifications to:
    • all users
    • specific role(s)
    • specific user IDs
    • specific phone numbers
    """
    permission_classes = [IsAdminUser]  # or custom IsAdminOrCEO

    def post(self, request):
        action = request.data.get("action")
        title = request.data.get("title")
        message = request.data.get("message")
        url = request.data.get("url", "/")

        if not title or not message:
            return Response({"error": "title and message are required"}, status=400)

        try:
            if action == "all":
                send_push_to_all.delay(title=title, message=message, url=url)
                count = "all active users"
            elif action == "role":
                role = request.data.get("role")
                if not role:
                    return Response({"error": "role is required for action='role'"}, status=400)
                send_push_to_role.delay(role_name=role, title=title, message=message, url=url)
                count = f"role: {role}"
            elif action == "users":
                user_ids = request.data.get("user_ids", [])
                if not user_ids:
                    return Response({"error": "user_ids list required"}, status=400)
                send_push_to_users.delay(user_ids=user_ids, title=title, message=message, url=url)
                count = f"{len(user_ids)} users"
            elif action == "phones":
                phones = request.data.get("phones", [])
                if not phones:
                    return Response({"error": "phones list required"}, status=400)
                send_push_to_phones.delay(phone_numbers=phones, title=title, message=message, url=url)
                count = f"{len(phones)} phone numbers"
            else:
                return Response({"error": "Invalid action. Use: all, role, users, phones"}, status=400)

            logger.info(f"Push broadcast queued: {action} → {count}")
            return Response({
                "success": True,
                "message": f"Broadcast queued for {count}"
            })

        except Exception as e:
            logger.error(f"Broadcast push failed: {e}")
            return Response({"error": "Failed to queue broadcast"}, status=500)

class UnsubscribeView(View):
    """
    One-click unsubscribe link handler
    GET: Show confirmation page
    POST: Actually unsubscribe
    """
    template_name = "notifications/unsubscribe.html"

    def get(self, request, token):
        token_obj = get_object_or_404(UnsubscribeToken, token=token, is_active=True)

        # Optional: check expiry if set
        if token_obj.expires_at and token_obj.expires_at < timezone.now():
            return render(request, self.template_name, {
                "status": "expired",
                "message": "This unsubscribe link has expired."
            })

        return render(request, self.template_name, {
            "status": "confirm",
            "token": token,
            "channel": token_obj.channel,
            "email": token_obj.email,
            "phone": token_obj.phone,
            "user": token_obj.user,
        })

    def post(self, request, token):
        token_obj = get_object_or_404(UnsubscribeToken, token=token, is_active=True)

        try:
            if token_obj.user:
                # Disable all notifications for this user on this channel
                if token_obj.channel == 'email':
                    token_obj.user.notify_email = False
                elif token_obj.channel == 'sms':
                    token_obj.user.notify_sms = False
                token_obj.user.save(update_fields=[f"notify_{token_obj.channel}"])

            elif token_obj.email:
                # Disable email notifications for this email
                PushSubscription.objects.filter(email=token_obj.email).update(is_active=False)

            elif token_obj.phone:
                PushSubscription.objects.filter(phone=token_obj.phone).update(is_active=False)

            # Mark token as used
            token_obj.is_active = False
            token_obj.used_at = timezone.now()
            token_obj.save()

            messages.success(request, "You have been successfully unsubscribed.")
            return redirect("home")  # or a thank-you page

        except Exception as e:
            logger.error(f"Unsubscribe failed for token {token}: {e}")
            return render(request, self.template_name, {
                "status": "error",
                "message": "An error occurred. Please try again or contact support."
            })