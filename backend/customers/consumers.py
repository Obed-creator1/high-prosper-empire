# customers/consumers.py — FINAL TOKEN PARSING & REAL-TIME CONSUMERS
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework.authtoken.models import Token
from urllib.parse import parse_qs
import json

# Helper to fetch user from token safely in async context
@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = Token.objects.get(key=token_key)
        return token.user
    except Token.DoesNotExist:
        return None

class BaseAuthConsumer(AsyncWebsocketConsumer):
    """
    Base class for all authenticated WebSocket consumers
    Handles token-based auth and rejection logging
    """
    async def connect(self):
        # Parse token from query string
        query_string = self.scope['query_string'].decode()
        params = parse_qs(query_string)
        token_list = params.get('token', [])
        token = token_list[0] if token_list else None

        print(f"WS CONNECT ATTEMPT - Consumer: {self.__class__.__name__} - Token: {token[:8] if token else 'NONE'}...")

        if not token:
            print("WS REJECTED: No token provided")
            await self.close(code=4001)
            return

        user = await get_user_from_token(token)

        if not user:
            print(f"WS REJECTED: Invalid token {token[:8]}...")
            await self.close(code=4002)
            return

        self.scope['user'] = user
        print(f"WS ACCEPTED: User {user.username}")
        await self.accept()

class CustomerListConsumer(BaseAuthConsumer):
    """
    Real-time customer list updates (for dashboard table)
    """
    async def connect(self):
        await super().connect()
        if self.scope['user'].is_authenticated:
            await self.channel_layer.group_add("customers_list", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("customers_list", self.channel_name)

    async def customer_event(self, event):
        """
        Send customer create/update/delete event
        """
        await self.send(text_data=json.dumps(event['event']))


class StatsConsumer(BaseAuthConsumer):
    """
    Real-time dashboard stats updates
    """
    async def connect(self):
        await super().connect()
        if self.scope['user'].is_authenticated:
            await self.channel_layer.group_add("dashboard_stats", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("dashboard_stats", self.channel_name)

    async def stats_update(self, event):
        """
        Send stats refresh signal
        """
        await self.send(text_data=json.dumps(event))