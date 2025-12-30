import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

from users.models import ChatMessage, CustomUser


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]
        self.other_user_id = self.scope["url_route"]["kwargs"]["other_user_id"]

        # Chat room key: userA-userB (sorted)
        ids = sorted([self.user.id, int(self.other_user_id)])
        self.room_name = f"chat_{ids[0]}_{ids[1]}"

        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data["type"] == "chat.message":
            await self.handle_new_message(data)
        elif data["type"] == "delivered":
            await self.mark_delivered(data["message_id"])
        elif data["type"] == "seen":
            await self.mark_seen(data["message_id"])

    # -----------------------------------------------------
    # MESSAGE SENDING
    # -----------------------------------------------------

    async def handle_new_message(self, data):
        message = await self.save_message(data["message"], data["receiver"])

        payload = {
            "type": "chat.message",
            "message": message,
        }

        await self.channel_layer.group_send(
            self.room_name,
            {
                "type": "broadcast_message",
                "payload": payload
            }
        )

        # Notify sidebar unread update
        await self.notify_sidebar_unread(int(data["receiver"]))

    async def broadcast_message(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    # -----------------------------------------------------
    # MESSAGE DELIVERED
    # -----------------------------------------------------

    @database_sync_to_async
    def mark_delivered(self, message_id):
        msg = ChatMessage.objects.filter(id=message_id).first()
        if msg and not msg.delivered_at:
            msg.delivered_at = timezone.now()
            msg.save(update_fields=["delivered_at"])

            # Notify sidebar unread update
            self.notify_sidebar_unread_sync(msg.receiver_id)

        return msg

    # -----------------------------------------------------
    # MESSAGE SEEN
    # -----------------------------------------------------

    @database_sync_to_async
    def mark_seen(self, message_id):
        msg = ChatMessage.objects.filter(id=message_id).first()
        if msg and not msg.seen_at:
            msg.seen_at = timezone.now()
            msg.save(update_fields=["seen_at"])

            # Notify sidebar unread update
            self.notify_sidebar_unread_sync(msg.receiver_id)

        return msg

    # -----------------------------------------------------
    # STORE MESSAGE
    # -----------------------------------------------------

    @database_sync_to_async
    def save_message(self, text, receiver_id):
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
            "receiver": {
                "id": msg.receiver.id,
                "username": msg.receiver.username,
            },
            "delivered_at": None,
            "seen_at": None,
        }

    # -----------------------------------------------------
    # NOTIFY SIDEBAR
    # -----------------------------------------------------

    async def notify_sidebar_unread(self, user_id):
        await self.channel_layer.group_send(
            f"sidebar_{user_id}",
            {
                "type": "sidebar.update_unread",
                "user_id": self.user.id,
            }
        )

    @database_sync_to_async
    def notify_sidebar_unread_sync(self, user_id):
        # Sync version for delivered/seen because functions are sync
        pass
