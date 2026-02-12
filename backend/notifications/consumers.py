# notifications/consumers.py — REAL-TIME NOTIFICATIONS CONSUMER (2026-PROOF)
import json
import logging
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_from_token(token):
    """Authenticate user from JWT token (or your custom token logic)"""
    try:
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

        UntypedToken(token)  # Validates token
        from rest_framework_simplejwt.authentication import JWTAuthentication
        jwt_auth = JWTAuthentication()
        validated_token = jwt_auth.get_validated_token(token)
        user = jwt_auth.get_user(validated_token)
        return user
    except (InvalidToken, TokenError, ObjectDoesNotExist):
        return None
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return None

@database_sync_to_async
def get_unread_count(user):
    """Get unread notification count (using django-notifications or your model)"""
    try:
        from notifications.models import Notification
        return Notification.objects.unread().filter(recipient=user).count()
    except Exception:
        return 0

@database_sync_to_async
def mark_notification_read(user, notification_id):
    """Mark single notification as read"""
    try:
        from notifications.models import Notification
        notification = Notification.objects.get(id=notification_id, recipient=user)
        notification.mark_as_read()
        return True
    except Notification.DoesNotExist:
        return False

@database_sync_to_async
def mark_all_notifications_read(user):
    """Mark all notifications as read"""
    try:
        from notifications.models import Notification
        Notification.objects.unread().filter(recipient=user).mark_all_as_read()
    except Exception:
        pass


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Parse query string for token
        query_string = self.scope.get("query_string", b"").decode("utf-8")
        params = parse_qs(query_string)
        token_list = params.get("token", [])
        token = token_list[0] if token_list else None

        logger.info(f"NOTIFICATION WS CONNECT ATTEMPT - Token: {token[:10] + '...' if token else 'NONE'}")

        if not token:
            logger.warning("NOTIFICATION WS REJECTED: No token provided")
            await self.close(code=4001)  # Close with custom code
            return

        # Authenticate user
        user = await get_user_from_token(token)
        if not user or not user.is_active:
            logger.warning(f"NOTIFICATION WS REJECTED: Invalid or inactive token/user")
            await self.close(code=4002)
            return

        # Attach user to scope
        self.scope["user"] = user
        self.group_name = f"notify_user_{user.id}"

        # Join user-specific group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        logger.info(f"NOTIFICATION WS ACCEPTED: User {user.username} (ID: {user.id})")

        # Send initial unread count
        await self.send_unread_count()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            logger.info(f"User {self.scope.get('user', 'Unknown')} disconnected from notifications")

    async def receive(self, text_data=None, bytes_data=None):
        """Handle incoming messages from client"""
        if text_data is None:
            return

        try:
            data = json.loads(text_data)
            action = data.get("action")

            user = self.scope["user"]

            if action == "mark_read":
                notification_id = data.get("notification_id")
                if notification_id:
                    success = await mark_notification_read(user, notification_id)
                    if success:
                        await self.send(text_data=json.dumps({
                            "type": "mark_read_success",
                            "notification_id": notification_id
                        }))
                        await self.send_unread_count()

            elif action == "mark_all_read":
                await mark_all_notifications_read(user)
                await self.send(text_data=json.dumps({
                    "type": "mark_all_read_success"
                }))
                await self.send_unread_count()

            elif action == "ping":
                await self.send(text_data=json.dumps({
                    "type": "pong",
                    "timestamp": timezone.now().isoformat()
                }))

            else:
                logger.warning(f"Unknown action from {user.username}: {action}")

        except json.JSONDecodeError:
            logger.warning("Invalid JSON received in NotificationConsumer")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON"
            }))
        except Exception as e:
            logger.error(f"Error in NotificationConsumer.receive: {e}")
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Server error"
            }))

    # =============== OUTGOING MESSAGES ===============

    async def send_notification(self, event):
        """Send new notification to client"""
        await self.send(text_data=json.dumps({
            "type": "notification",
            "id": event.get("id"),
            "title": event.get("title", "New Notification"),
            "message": event.get("message", ""),
            "notification_type": event.get("notification_type", "info"),
            "action_url": event.get("action_url"),
            "image": event.get("image"),
            "created_at": event.get("created_at"),
            "is_read": event.get("is_read", False),
            "verb": event.get("verb"),
            "actor": event.get("actor"),
        }))

        # Refresh unread count
        await self.send_unread_count()

    async def send_unread_count(self):
        """Send current unread count"""
        count = await get_unread_count(self.scope["user"])
        await self.send(text_data=json.dumps({
            "type": "unread_count",
            "count": count
        }))