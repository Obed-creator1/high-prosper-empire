import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

from users.models import ChatMessage, CustomUser


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket for a chat room between two users.
    URL: ws://.../ws/chat/<other_user_id>/
    """

    async def connect(self):
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        # other_user_id comes from the URL route
        self.other_user_id = int(self.scope["url_route"]["kwargs"]["other_user_id"])
        # normalize room name so both participants join the same group
        a, b = sorted([self.user.id, self.other_user_id])
        self.room_name = f"chat_{a}_{b}"
        self.room_group_name = self.room_name

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

        # update last seen for this user
        await self.update_last_seen()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Handle incoming WS messages of types:
         - chat.message { message, receiver }
         - delivered { message_id }
         - seen { message_id }
        """
        data = json.loads(text_data)
        msg_type = data.get("type")

        if msg_type == "chat.message":
            message_text = data.get("message", "")
            receiver_id = int(data.get("receiver", self.other_user_id))
            message_obj = await self.create_message(message_text, receiver_id)

            # prepare payload to broadcast to room
            payload = {
                "type": "chat.message",
                "message": {
                    "id": message_obj["id"],
                    "message": message_obj["message"],
                    "timestamp": message_obj["timestamp"],
                    "sender": message_obj["sender"],
                    "receiver": message_obj["receiver"],
                    "delivered_at": None,
                    "seen_at": None,
                },
            }

            await self.channel_layer.group_send(
                self.room_group_name, {"type": "broadcast_message", "payload": payload}
            )

            # notify receiver's sidebar only (so their unread increments)
            await self.notify_sidebar_unread(receiver_id, message_obj["sender"]["id"])

        elif msg_type == "delivered":
            message_id = data.get("message_id")
            await self.mark_delivered(message_id)
            # broadcast delivered to room so UI updates checkmarks
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_message",
                    "payload": {"type": "delivered", "message_id": message_id, "timestamp": timezone.now().isoformat()},
                },
            )
            # update receiver sidebar unread if needed (delivered generally doesn't change unread)

        elif msg_type == "seen":
            message_id = data.get("message_id")
            await self.mark_seen(message_id)
            # broadcast seen to room
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "broadcast_message",
                    "payload": {"type": "seen", "message_id": message_id, "timestamp": timezone.now().isoformat()},
                },
            )
            # when a message is seen we must update receiver's (the sender's) sidebar unread counts
            # find the message to know who to notify
            sender_id = await self.get_message_sender_id(message_id)
            if sender_id:
                await self.notify_sidebar_unread(self.user.id, sender_id)  # notify current user (who viewed) group

    async def broadcast_message(self, event):
        """Send payload to connected WS client."""
        await self.send(text_data=json.dumps(event["payload"]))

    # ------- DB actions (sync -> async wrappers) -------

    @database_sync_to_async
    def create_message(self, text, receiver_id):
        receiver = CustomUser.objects.get(id=receiver_id)
        msg = ChatMessage.objects.create(
            sender=self.user,
            receiver=receiver,
            message=text,
            room=self.room_name,
        )
        return {
            "id": msg.id,
            "message": msg.message,
            "timestamp": msg.timestamp.isoformat(),
            "sender": {
                "id": msg.sender.id,
                "username": msg.sender.username,
                "profile_picture": msg.sender.profile_picture.url if msg.sender.profile_picture else None,
            },
            "receiver": {"id": msg.receiver.id, "username": msg.receiver.username},
        }

    @database_sync_to_async
    def mark_delivered(self, message_id):
        m = ChatMessage.objects.filter(id=message_id).first()
        if m and not m.delivered_at:
            m.delivered_at = timezone.now()
            m.save(update_fields=["delivered_at"])

    @database_sync_to_async
    def mark_seen(self, message_id):
        m = ChatMessage.objects.filter(id=message_id).first()
        if m and not m.seen_at:
            m.seen_at = timezone.now()
            m.save(update_fields=["seen_at"])

    @database_sync_to_async
    def get_message_sender_id(self, message_id):
        m = ChatMessage.objects.filter(id=message_id).first()
        return m.sender_id if m else None

    @database_sync_to_async
    def update_last_seen(self):
        self.user.last_seen = timezone.now()
        self.user.save(update_fields=["last_seen"])

    # ------- Sidebar notification helpers -------

    async def notify_sidebar_unread(self, target_user_id, from_user_id):
        """
        Notify the *target_user* (the one whose sidebar needs updating)
        that 'from_user_id' has sent them messages and provide unread count.
        This is sent to group 'sidebar_<target_user_id>' so only that user receives it.
        """
        unread = await self.get_unread_count(from_user_id, target_user_id)
        await self.channel_layer.group_send(
            f"sidebar_{target_user_id}",
            {
                "type": "sidebar.update_unread",
                "from_user": from_user_id,
                "unread": unread,
            },
        )

    @database_sync_to_async
    def get_unread_count(self, sender_id, receiver_id):
        return ChatMessage.objects.filter(sender_id=sender_id, receiver_id=receiver_id, seen_at__isnull=True).count()
