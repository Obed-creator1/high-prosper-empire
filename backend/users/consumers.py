# users/consumers.py
import json
import re
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import (
    CustomUser, ChatMessage, ChatRoom, RoomMember,
    MessageReaction, BlockedUser
)
from .serializers import ChatMessageSerializer, UserSerializer, ChatRoomSerializer
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework.authtoken.models import Token


# ============================================================
# 1-ON-1 CHAT: Stable room name
# ============================================================
def get_private_room_name(user1_id, user2_id):
    uid1, uid2 = int(user1_id), int(user2_id)
    return f"chat_{min(uid1, uid2)}_{max(uid1, uid2)}"


# ============================================================
# HELPER: Get user from token in query string
# ============================================================
@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return AnonymousUser()


# ============================================================
# PRIVATE CHAT CONSUMER (1-on-1) — FULLY WORKING
# ============================================================
class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract token from query string: ?token=abc123...
        query_string = self.scope["query_string"].decode("utf-8")
        token_key = None
        for param in query_string.split("&"):
            if param.startswith("token="):
                token_key = param.split("=", 1)[1]
                break

        # Authenticate user via token
        self.user = await get_user_from_token(token_key) if token_key else AnonymousUser()

        if not self.user or self.user.is_anonymous:
            # Reject connection silently (no error message)
            await self.close(code=4003)  # Custom close code: Invalid token
            return

        # Store authenticated user in scope
        self.scope["user"] = self.user

        # Get the other user ID from URL: /ws/chat/2/
        self.other_user_id = self.scope["url_route"]["kwargs"]["user_id"]

        # Generate unique room name (sorted IDs to avoid duplicates)
        user_id = str(self.user.id)
        other_id = str(self.other_user_id)
        self.room_group_name = f"chat_{min(user_id, other_id)}_{max(user_id, other_id)}"

        # Join room group
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # Optional: Update last seen
        await self.update_last_seen()

        # Optional: Notify the other user you're online
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_online",
                "user_id": self.user.id,
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get("type")

            if msg_type == "chat.message":
                message = await self.create_message(
                    text=data["message"],
                    reply_to_id=data.get("reply_to_id")
                )

                payload = {
                    "id": message.id,
                    "sender_id": message.sender.id,
                    "message": message.message,
                    "attachment": message.attachment.url if message.attachment else None,
                    "attachment_type": message.attachment_type,
                    "timestamp": message.timestamp.isoformat(),
                    "delivered": False,
                    "seen": False,
                    "type": "chat.message"
                }

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "chat_message",
                        "payload": payload
                    }
                )

            elif msg_type == "typing":
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        "type": "typing_indicator",
                        "user_id": self.user.id,
                        "is_typing": data["is_typing"]
                    }
                )

            elif msg_type == "delivered":
                await self.mark_delivered(data["message_id"])

            elif msg_type == "seen":
                await self.mark_seen(data["message_id"])

        except Exception as e:
            print(f"Error in receive: {e}")

    # ============================================================
    # MESSAGE HANDLERS
    # ============================================================
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "user_id": event["user_id"],
            "is_typing": event["is_typing"]
        }))

    async def user_online(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_online",
            "user_id": event["user_id"]
        }))

    async def message_deleted(self, event):
        await self.send(text_data=json.dumps({
            "type": "message_deleted",
            "message_id": event["message_id"],
            "deleted_by": event["deleted_by"],
            "action": event["action"]
        }))

    # ============================================================
    # DATABASE OPERATIONS
    # ============================================================
    @database_sync_to_async
    def create_message(self, text, reply_to_id=None):
        receiver = CustomUser.objects.get(id=self.other_user_id)
        reply_to = ChatMessage.objects.filter(id=reply_to_id).first() if reply_to_id else None

        return ChatMessage.objects.create(
            sender=self.user,
            receiver=receiver,
            message=text,
            reply_to=reply_to
        )

    @database_sync_to_async
    def mark_delivered(self, msg_id):
        try:
            msg = ChatMessage.objects.get(id=msg_id, receiver=self.user)
            if msg.delivered_at is None:
                msg.delivered_at = timezone.now()
                msg.save(update_fields=["delivered_at"])
        except ChatMessage.DoesNotExist:
            pass

    @database_sync_to_async
    def mark_seen(self, msg_id):
        try:
            msg = ChatMessage.objects.get(id=msg_id, receiver=self.user)
            if msg.seen_at is None:
                msg.seen_at = timezone.now()
                msg.save(update_fields=["seen_at"])
        except ChatMessage.DoesNotExist:
            pass

    @database_sync_to_async
    def update_last_seen(self):
        self.user.last_seen = timezone.now()
        self.user.is_online = True
        self.user.save(update_fields=["last_seen", "is_online"])


# ============================================================
# GROUP CHAT CONSUMER (Full WhatsApp-like)
# ============================================================
class GroupChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return

        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        try:
            self.room = await database_sync_to_async(ChatRoom.objects.get)(room_id=self.room_id)
        except ChatRoom.DoesNotExist:
            await self.close(code=4001)
            return

        # Check membership
        is_member = await database_sync_to_async(
            RoomMember.objects.filter(room=self.room, user=user).exists()
        )()
        if not is_member:
            await self.close(code=4003)
            return

        self.room_group_name = f"chat_{self.room.room_id}"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # System: User joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_joined",
                "user_id": user.id,
                "username": user.username
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get("type")

        user = self.scope["user"]

        # === SEND MESSAGE ===
        if msg_type == "chat.message":
            # Admin-only messaging check
            if self.room.only_admins_can_send:
                is_admin = await database_sync_to_async(
                    RoomMember.objects.filter(room=self.room, user=user, role='admin').exists()
                )()
                if not is_admin:
                    await self.send(text_data=json.dumps({
                        "type": "error",
                        "message": "Only admins can send messages in this group"
                    }))
                    return

            message = await self.create_message(
                text=data["message"],
                reply_to_id=data.get("reply_to_id")
            )
            await self.broadcast_message(message)

        # === TYPING INDICATOR ===
        elif msg_type == "typing":
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "typing_indicator",
                    "user_id": user.id,
                    "username": user.username,
                    "is_typing": data["is_typing"]
                }
            )

    # === BROADCAST MESSAGE ===
    async def broadcast_message(self, message):
        serializer = ChatMessageSerializer(message, context={'request': None})
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": serializer.data
            }
        )

    # === MESSAGE CREATION WITH MENTIONS ===
    @database_sync_to_async
    def create_message(self, text, reply_to_id=None):
        reply_to = ChatMessage.objects.filter(id=reply_to_id).first() if reply_to_id else None
        message = ChatMessage.objects.create(
            sender=self.scope["user"],
            room=self.room,
            message=text,
            reply_to=reply_to
        )

        # === MENTIONS (@username & @everyone) ===
        mentioned_names = re.findall(r'@(\w+)', text)
        for name in mentioned_names:
            try:
                mentioned_user = CustomUser.objects.get(username__iexact=name)
                if self.room.memberships.filter(user=mentioned_user).exists():
                    message.mentioned_users.add(mentioned_user)
            except CustomUser.DoesNotExist:
                pass

        if "@everyone" in text.lower():
            for member in self.room.memberships.exclude(user=self.scope["user"]):
                message.mentioned_users.add(member.user)

        return message

    # === EVENT HANDLERS ===
    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event["message"]))

    async def typing_indicator(self, event):
        await self.send(text_data=json.dumps({
            "type": "typing",
            "user_id": event["user_id"],
            "username": event["username"],
            "is_typing": event["is_typing"]
        }))

    async def user_joined(self, event):
        await self.send(text_data=json.dumps({
            "type": "system_message",
            "message": f"{event['username']} joined the group"
        }))

    async def member_added(self, event):
        await self.send(text_data=json.dumps({
            "type": "member_added",
            "user": event["user"],
            "added_by": event["added_by"],
            "message": f"{event['user']['username']} was added"
        }))

    async def member_removed(self, event):
        await self.send(text_data=json.dumps({
            "type": "member_removed",
            "message": f"A member was removed"
        }))

    async def announcement_updated(self, event):
        await self.send(text_data=json.dumps({
            "type": "announcement_updated",
            "announcement": event["announcement"],
            "updated_by": event["updated_by"]
        }))

    async def message_pinned(self, event):
        await self.send(text_data=json.dumps({
            "type": "message_pinned",
            "message": event["message"]
        }))

    async def message_unpinned(self, event):
        await self.send(text_data=json.dumps({"type": "message_unpinned"}))

    async def member_joined_via_link(self, event):
        await self.send(text_data=json.dumps({
            "type": "system_message",
            "message": event["message"]
        }))


# ============================================================
# WEBRTC CALL SIGNALING CONSUMER
# ============================================================
class CallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return

        self.call_id = self.scope["url_route"]["kwargs"]["call_id"]
        self.room_group_name = f"call_{self.call_id}"

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "user_joined_call",
                "user_id": user.id,
                "username": user.username
            }
        )

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "webrtc_signal",
                "signal": data,
                "from_user": self.scope["user"].username
            }
        )

    async def webrtc_signal(self, event):
        await self.send(text_data=json.dumps({
            "type": "webrtc_signal",
            "signal": event["signal"],
            "from_user": event["from_user"]
        }))

    async def user_joined_call(self, event):
        await self.send(text_data=json.dumps({
            "type": "user_joined_call",
            "user_id": event["user_id"],
            "username": event["username"]
        }))


class UsersSidebarConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        if not user.is_authenticated:
            await self.close()
            return

        await self.accept()
        await self.channel_layer.group_add("sidebar_users", self.channel_name)
        await self.broadcast_sidebar(user)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("sidebar_users", self.channel_name)

    async def broadcast_sidebar(self, user):
        payload = await self.get_sidebar_payload(user)
        await self.channel_layer.group_send(
            "sidebar_users",
            {"type": "sidebar_update", "payload": payload}
        )

    async def sidebar_update(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    @database_sync_to_async
    def get_sidebar_payload(self, current_user):
        users = CustomUser.objects.exclude(id=current_user.id)
        payload = []
        for u in users:
            last_msg = ChatMessage.objects.filter(
                sender=u, receiver=current_user
            ).union(
                ChatMessage.objects.filter(sender=current_user, receiver=u)
            ).order_by("-timestamp").first()

            unread = ChatMessage.objects.filter(
                sender=u, receiver=current_user, seen_at__isnull=True
            ).count()

            payload.append({
                "id": u.id,
                "username": u.username,
                "is_online": u.is_online,
                "last_message": last_msg.message if last_msg else "",
                "unread_count": unread
            })
        return payload