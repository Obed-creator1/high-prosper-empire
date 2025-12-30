import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

from users.models import ChatMessage


class UsersSidebarConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user = self.scope["user"]

        self.group_name = f"sidebar_{self.user.id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send initial unread
        await self.send_unread_counts()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # ----------------------------------------------
    # UNREAD COUNTS
    # ----------------------------------------------

    async def sidebar_update_unread(self, event):
        other_user_id = event["user_id"]
        unread = await self.get_unread_count(other_user_id)
        await self.send(json.dumps({
            "type": "update_unread",
            "user_id": other_user_id,
            "unread": unread
        }))

    @database_sync_to_async
    def get_unread_count(self, sender_id):
        return ChatMessage.objects.filter(
            sender_id=sender_id,
            receiver_id=self.user.id,
            seen_at__isnull=True
        ).count()

    @database_sync_to_async
    def get_all_unread(self):
        results = {}
        senders = ChatMessage.objects.filter(
            receiver_id=self.user.id,
            seen_at__isnull=True
        ).values_list("sender_id", flat=True)

        for s in set(senders):
            results[s] = ChatMessage.objects.filter(
                sender_id=s,
                receiver_id=self.user.id,
                seen_at__isnull=True
            ).count()

        return results

    async def send_unread_counts(self):
        unread_map = await self.get_all_unread()
        await self.send(json.dumps({
            "type": "bulk_unread",
            "data": unread_map
        }))

    # ----------------------------------------------
    # ONLINE STATUS
    # ----------------------------------------------

    async def online_status(self, event):
        await self.send(json.dumps({
            "type": "online_status",
            "user_id": event["user_id"],
            "is_online": event["is_online"]
        }))
