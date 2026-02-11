# customers/consumers.py — HIGH PROSPER REAL-TIME ENGINE 2026
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
        print(f"WS ACCEPTED: User {user.username} ({user.role})")
        await self.accept()

# === CUSTOMER LIST CONSUMER ===
class CustomerListConsumer(BaseAuthConsumer):
    """
    Real-time customer list updates (for dashboard table)
    """
    async def connect(self):
        await super().connect()
        if self.scope['user'].is_authenticated:
            await self.channel_layer.group_add("customers_list", self.channel_name)
            print(f"User {self.scope['user'].username} joined customers_list")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("customers_list", self.channel_name)

    async def customer_event(self, event):
        await self.send(text_data=json.dumps(event['event']))

# === SECTOR CONSUMER ===
class SectorConsumer(BaseAuthConsumer):
    """
    Real-time sector create/update/delete
    Group: sectors_list
    """
    async def connect(self):
        await super().connect()
        if self.scope['user'].is_authenticated:
            await self.channel_layer.group_add("sectors_list", self.channel_name)
            print(f"User {self.scope['user'].username} joined sectors_list")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("sectors_list", self.channel_name)

    async def sector_event(self, event):
        await self.send(text_data=json.dumps(event['event']))

# === CELL CONSUMER ===
class CellConsumer(BaseAuthConsumer):
    """
    Real-time cell create/update/delete
    Group: cells_list
    """
    async def connect(self):
        await super().connect()
        if self.scope['user'].is_authenticated:
            await self.channel_layer.group_add("cells_list", self.channel_name)
            print(f"User {self.scope['user'].username} joined cells_list")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("cells_list", self.channel_name)

    async def cell_event(self, event):
        await self.send(text_data=json.dumps(event['event']))

# === VILLAGE CONSUMER ===
class VillageConsumer(BaseAuthConsumer):
    """
    Real-time village create/update/delete + target changes
    Group: villages_list
    """
    async def connect(self):
        await super().connect()
        if self.scope['user'].is_authenticated:
            await self.channel_layer.group_add("villages_list", self.channel_name)
            print(f"User {self.scope['user'].username} joined villages_list")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("villages_list", self.channel_name)

    async def village_event(self, event):
        await self.send(text_data=json.dumps(event['event']))

# === DASHBOARD STATS CONSUMER ===
class StatsConsumer(BaseAuthConsumer):
    """
    Real-time dashboard stats updates (totals, targets, etc.)
    Group: dashboard_stats
    """
    async def connect(self):
        await super().connect()
        if self.scope['user'].is_authenticated:
            await self.channel_layer.group_add("dashboard_stats", self.channel_name)
            print(f"User {self.scope['user'].username} joined dashboard_stats")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("dashboard_stats", self.channel_name)

    async def stats_update(self, event):
        await self.send(text_data=json.dumps(event))