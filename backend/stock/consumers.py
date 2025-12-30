"""
Real-time Stock Management WebSocket Consumers
Enhanced with Redis Caching for High Performance
"""

import json
import logging
import time
from datetime import timedelta
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async
from django.utils import timezone
from django.db.models import F, Q, Sum, Count
from django.core.cache import cache
import redis.asyncio as redis
from redis.exceptions import RedisError
import asyncio
from typing import List, Dict, Any, Optional

from .models import (
    StockTransaction, WarehouseStock, StockAlert, WarehouseTransfer,
    StockBatch, StockReport, InventoryAudit
)
from .serializers import (
    StockTransactionSerializer, WarehouseStockSerializer,
    StockAlertSerializer, WarehouseTransferSerializer,
    StockBatchSerializer, StockReportSerializer
)

logger = logging.getLogger(__name__)

# Redis Configuration
REDIS_HOST = 'localhost'
REDIS_PORT = 6379
REDIS_DB = 1  # Separate DB for WebSocket caching
REDIS_PREFIX = 'ws_stock_'

class RedisCacheManager:
    """Redis cache manager for WebSocket operations"""

    def __init__(self):
        self.redis_client = None

    async def get_redis_client(self):
        """Get Redis client with connection pooling"""
        if self.redis_client is None:
            self.redis_client = redis.Redis(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
                max_connections=20
            )
        return self.redis_client

    async def get_cache(self, key: str, default: Any = None) -> Any:
        """Get cached data with fallback"""
        try:
            client = await self.get_redis_client()
            data = await client.get(f"{REDIS_PREFIX}{key}")
            return json.loads(data) if data else default
        except RedisError as e:
            logger.error(f"Redis GET error for {key}: {e}")
            return default

    async def set_cache(self, key: str, value: Any, ttl: int = 300):
        """Set cached data with TTL"""
        try:
            client = await self.get_redis_client()
            await client.setex(
                f"{REDIS_PREFIX}{key}",
                ttl,
                json.dumps(value)
            )
        except RedisError as e:
            logger.error(f"Redis SET error for {key}: {e}")

    async def delete_cache(self, key: str):
        """Delete cached data"""
        try:
            client = await self.get_redis_client()
            await client.delete(f"{REDIS_PREFIX}{key}")
        except RedisError as e:
            logger.error(f"Redis DELETE error for {key}: {e}")

    async def cache_exists(self, key: str) -> bool:
        """Check if cache key exists"""
        try:
            client = await self.get_redis_client()
            return await client.exists(f"{REDIS_PREFIX}{key}") > 0
        except RedisError:
            return False

    async def increment_counter(self, key: str, amount: int = 1) -> int:
        """Atomic counter increment"""
        try:
            client = await self.get_redis_client()
            return await client.incr(f"{REDIS_PREFIX}{key}", amount)
        except RedisError as e:
            logger.error(f"Redis INCR error for {key}: {e}")
            return 0

    async def get_connection_stats(self) -> Dict[str, Any]:
        """Get Redis connection statistics"""
        try:
            client = await self.get_redis_client()
            info = await client.info()
            return {
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'used_memory': info.get('used_memory_human', '0'),
                'memory_usage': info.get('used_memory', 0),
                'uptime': info.get('uptime_in_seconds', 0)
            }
        except RedisError:
            return {}

# Global Redis cache manager
redis_cache = RedisCacheManager()

class BaseStockConsumer(AsyncWebsocketConsumer):
    """Base consumer with Redis caching and connection management"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.redis_cache = redis_cache
        self.user = None
        self.group_name = self.channel_name
        self.connection_id = None
        self.subscriptions = set()
        self.last_heartbeat = None

    async def connect(self):
        """Handle WebSocket connection with Redis registration"""
        self.user = self.scope['user']
        self.connection_id = f"conn_{int(time.time())}_{id(self)}"
        self.group_name = self.channel_name

        if self.user.is_authenticated:
            # Register connection in Redis
            await self._register_connection()

            # Join user-specific group
            await self.channel_layer.group_add(
                f"user_{self.user.id}",
                self.channel_name
            )
            # Join global stock group
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )

            await self.accept()
            logger.info(f"User {self.user.username} connected to {self.group_name} (ID: {self.connection_id})")

            # Send connection confirmation with cache stats
            await self.send_connection_message()

            # Start heartbeat
            self.last_heartbeat = time.time()
            asyncio.create_task(self._heartbeat_monitor())
        else:
            await self.close()

    async def _register_connection(self):
        """Register WebSocket connection in Redis"""
        connection_data = {
            'user_id': self.user.id if self.user.is_authenticated else None,
            'username': self.user.username if self.user.is_authenticated else 'anonymous',
            'group': self.group_name,
            'connected_at': timezone.now().isoformat(),
            'last_heartbeat': time.time()
        }

        await self.redis_cache.set_cache(
            f"connection_{self.connection_id}",
            connection_data,
            ttl=3600  # 1 hour
        )

        # Update active connections counter
        await self.redis_cache.increment_counter(f"active_connections_{self.group_name}")

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection with Redis cleanup"""
        if self.user and self.user.is_authenticated:
            # Cleanup Redis
            await self.redis_cache.delete_cache(f"connection_{self.connection_id}")
            await self.redis_cache.increment_counter(f"active_connections_{self.group_name}", -1)

            # Remove from user and global groups
            await self.channel_layer.group_discard(
                f"user_{self.user.id}",
                self.channel_name
            )
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

            # Remove from subscription groups
            for subscription in self.subscriptions:
                await self.channel_layer.group_discard(subscription, self.channel_name)

            logger.info(f"User {self.user.username} disconnected from {self.group_name} (ID: {self.connection_id})")

    async def send_connection_message(self):
        """Send connection confirmation with Redis stats"""
        stats = await self.redis_cache.get_connection_stats()
        active_connections = await self.redis_cache.get_cache(
            f"active_connections_{self.group_name}", 0
        )

        await self.send(text_data=json.dumps({
            'type': 'connection_status',
            'status': 'connected',
            'connection_id': self.connection_id,
            'active_connections': active_connections,
            'redis_stats': stats,
            'timestamp': timezone.now().isoformat(),
            'message': 'Real-time stock updates enabled with Redis caching'
        }))

    async def send_error_message(self, message, level='error'):
        """Send error message to client"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'level': level,
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))

    async def _heartbeat_monitor(self):
        """Monitor connection health with Redis"""
        while True:
            try:
                await asyncio.sleep(30)  # Heartbeat every 30 seconds
                if self.last_heartbeat and (time.time() - self.last_heartbeat) > 90:
                    logger.warning(f"Heartbeat timeout for {self.connection_id}")
                    await self.close()
                    break

                # Update heartbeat in Redis
                await self.redis_cache.set_cache(
                    f"connection_{self.connection_id}",
                    {'last_heartbeat': time.time()},
                    ttl=3600
                )

            except Exception as e:
                logger.error(f"Heartbeat monitor error: {e}")
                break

# =============================================================================
# 📦 ENHANCED STOCK UPDATES CONSUMER
# =============================================================================

class StockWebSocketConsumer(BaseStockConsumer):
    """Real-time stock updates with Redis caching"""

    group_name = 'stock_updates'

    async def receive(self, text_data):
        """Handle incoming messages with Redis caching"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'subscribe':
                await self.subscribe_to_stock(data.get('stock_ids', []))
            elif message_type == 'unsubscribe':
                await self.unsubscribe_from_stock(data.get('stock_ids', []))
            elif message_type == 'get_recent':
                await self.send_recent_transactions(data.get('stock_ids', []))
            else:
                await self.send_error_message('Invalid message type')

        except json.JSONDecodeError:
            await self.send_error_message('Invalid JSON format')
        except Exception as e:
            logger.error(f"StockWebSocketConsumer error: {str(e)}")
            await self.send_error_message(str(e))

    @database_sync_to_async
    def get_recent_transactions(self, stock_id=None, limit=10):
        """Get recent transactions with cache fallback"""
        cache_key = f"recent_transactions_{stock_id or 'all'}_{limit}"

        # Try Django cache first
        cached = cache.get(cache_key)
        if cached:
            return cached

        queryset = StockTransaction.objects.select_related(
            'stock', 'from_warehouse', 'to_warehouse', 'user'
        ).order_by('-created_at')

        if stock_id:
            queryset = queryset.filter(stock_id=stock_id)

        transactions = queryset[:limit]
        result = StockTransactionSerializer(transactions, many=True).data

        # Cache for 2 minutes
        cache.set(cache_key, result, 120)
        return result

    async def subscribe_to_stock(self, stock_ids: List[str]):
        """Subscribe to specific stock updates with Redis tracking"""
        if not stock_ids:
            await self.send_error_message('Stock IDs required for subscription')
            return

        self.subscriptions.update([f"stock_{sid}" for sid in stock_ids])

        for stock_id in stock_ids:
            group_name = f"stock_{stock_id}"
            await self.channel_layer.group_add(group_name, self.channel_name)

            # Track subscription in Redis
            await self.redis_cache.increment_counter(f"subscribers_stock_{stock_id}")

        # Send recent transactions from cache
        transactions = await sync_to_async(
            self.get_recent_transactions
        )(stock_ids[0] if stock_ids else None, 10)

        await self.send(text_data=json.dumps({
            'type': 'subscription_confirmed',
            'stock_ids': stock_ids,
            'recent_transactions': transactions,
            'subscriber_count': len(self.subscriptions),
            'timestamp': timezone.now().isoformat()
        }))

    async def unsubscribe_from_stock(self, stock_ids: List[str]):
        """Unsubscribe from specific stock updates"""
        for stock_id in stock_ids:
            group_name = f"stock_{stock_id}"
            await self.channel_layer.group_discard(group_name, self.channel_name)
            self.subscriptions.discard(group_name)

            # Update Redis counter
            await self.redis_cache.increment_counter(f"subscribers_stock_{stock_id}", -1)

        await self.send(text_data=json.dumps({
            'type': 'unsubscription_confirmed',
            'stock_ids': stock_ids,
            'remaining_subscriptions': len(self.subscriptions),
            'timestamp': timezone.now().isoformat()
        }))

    async def send_recent_transactions(self, stock_ids: List[str]):
        """Send cached recent transactions"""
        transactions = await sync_to_async(
            self.get_recent_transactions
        )(stock_ids[0] if stock_ids else None, 20)

        await self.send(text_data=json.dumps({
            'type': 'recent_transactions',
            'stock_ids': stock_ids,
            'transactions': transactions,
            'timestamp': timezone.now().isoformat()
        }))

    async def stock_transaction_update(self, event):
        """Handle stock transaction updates with cache invalidation"""
        stock_id = event['stock_id']

        # Invalidate related caches
        await self.redis_cache.delete_cache(f"recent_transactions_{stock_id}_10")
        await self.redis_cache.delete_cache(f"recent_transactions_{stock_id}_20")
        cache.delete(f"recent_transactions_{stock_id}_10")
        cache.delete(f"recent_transactions_{stock_id}_20")

        await self.send(text_data=json.dumps({
            'type': 'stock_transaction',
            'transaction': event['transaction'],
            'stock_id': stock_id,
            'warehouse_id': event.get('warehouse_id'),
            'timestamp': event['timestamp']
        }))

    async def stock_level_changed(self, event):
        """Handle stock level changes with cache invalidation"""
        # Invalidate warehouse stock cache
        await self.redis_cache.delete_cache(f"warehouse_stock_{event['warehouse_id']}_{event['stock_id']}")
        cache.delete(f"warehouse_stock_{event['warehouse_id']}_{event['stock_id']}")

        await self.send(text_data=json.dumps({
            'type': 'stock_level',
            'stock_id': event['stock_id'],
            'warehouse_id': event['warehouse_id'],
            'old_quantity': event['old_quantity'],
            'new_quantity': event['new_quantity'],
            'available_quantity': event['available_quantity'],
            'timestamp': event['timestamp']
        }))

# =============================================================================
# 🏭 ENHANCED WAREHOUSE UPDATES CONSUMER
# =============================================================================

class WarehouseWebSocketConsumer(BaseStockConsumer):
    """Real-time warehouse updates with Redis caching"""

    group_name = 'warehouse_updates'

    async def receive(self, text_data):
        """Handle incoming warehouse requests"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'subscribe_warehouse':
                await self.subscribe_to_warehouse(data.get('warehouse_ids', []))
            elif message_type == 'warehouse_summary':
                await self.send_warehouse_summary(data.get('warehouse_ids', []))
            elif message_type == 'refresh_summary':
                await self.refresh_warehouse_summary(data.get('warehouse_ids', []))
            else:
                await self.send_error_message('Invalid message type')

        except json.JSONDecodeError:
            await self.send_error_message('Invalid JSON format')

    @database_sync_to_async
    def get_warehouse_summary(self, warehouse_ids: List[str]) -> Dict:
        """Get warehouse summary with Redis caching - ✅ FIXED: No await in sync context"""
        if not warehouse_ids:
            return {}

        from django.core.cache import cache
        cached_summaries = {}

        # Check Django cache for each warehouse (sync operations only)
        for wid in warehouse_ids:
            cache_key = f"warehouse_summary_{wid}"
            cached = cache.get(cache_key)

            if cached and cached.get('timestamp', 0) > time.time() - 60:  # 1 min cache
                cached_summaries[wid] = cached
            else:
                # Database query
                from .models import WarehouseStock
                from django.db.models import Count, Sum, F, Q
                summary = WarehouseStock.objects.filter(
                    warehouse_id=wid,
                    stock__is_active=True
                ).aggregate(
                    total_items=Count('id'),
                    total_quantity=Sum('quantity'),
                    total_value=Sum(F('quantity') * F('unit_price')),
                    available_quantity=Sum(F('quantity') - F('reserved_quantity')),
                    critical_items=Count('id', filter=Q(quantity__lte=F('stock__reorder_level'))),
                    low_stock_items=Count('id', filter=Q(quantity__gt=F('stock__reorder_level'),
                                                         quantity__lte=F('stock__min_stock_level')))
                )

                result = {
                    'total_items': summary['total_items'] or 0,
                    'total_quantity': int(summary['total_quantity'] or 0),
                    'total_value': float(summary['total_value'] or 0),
                    'available_quantity': int(summary['available_quantity'] or 0),
                    'critical_items': summary['critical_items'] or 0,
                    'low_stock_items': summary['low_stock_items'] or 0,
                    'timestamp': timezone.now().isoformat()
                }

                # Cache for 60 seconds (sync)
                cache.set(cache_key, result, 60)
                cached_summaries[wid] = result

        return {wid: cached_summaries.get(wid, {}) for wid in warehouse_ids}

    async def subscribe_to_warehouse(self, warehouse_ids: List[str]):
        """Subscribe to warehouse updates with caching"""
        if not warehouse_ids:
            await self.send_error_message('Warehouse IDs required')
            return

        self.subscriptions.update([f"warehouse_{wid}" for wid in warehouse_ids])

        for warehouse_id in warehouse_ids:
            group_name = f"warehouse_{warehouse_id}"
            await self.channel_layer.group_add(group_name, self.channel_name)
            # ✅ FIXED: Use sync cache increment or skip
            from django.core.cache import cache
            cache_key = f"warehouse_subscribers_{warehouse_id}"
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, 3600)

        # Get cached summaries
        summary = await sync_to_async(self.get_warehouse_summary)(warehouse_ids)

        await self.send(text_data=json.dumps({
            'type': 'warehouse_subscription_confirmed',
            'warehouse_ids': warehouse_ids,
            'summary': summary,
            'subscriber_count': len(self.subscriptions),
            'timestamp': timezone.now().isoformat()
        }))

    async def send_warehouse_summary(self, warehouse_ids: List[str]):
        """Send cached warehouse summary"""
        summary = await sync_to_async(self.get_warehouse_summary)(warehouse_ids)
        await self.send(text_data=json.dumps({
            'type': 'warehouse_summary',
            'warehouse_ids': warehouse_ids,
            'summary': summary,
            'timestamp': timezone.now().isoformat()
        }))

    async def refresh_warehouse_summary(self, warehouse_ids: List[str]):
        """Force refresh warehouse summaries"""
        # Invalidate cache (async safe)
        from django.core.cache import cache
        for wid in warehouse_ids:
            cache_key = f"warehouse_summary_{wid}"
            cache.delete(cache_key)

        summary = await sync_to_async(self.get_warehouse_summary)(warehouse_ids)
        await self.send(text_data=json.dumps({
            'type': 'warehouse_summary_refreshed',
            'warehouse_ids': warehouse_ids,
            'summary': summary,
            'timestamp': timezone.now().isoformat()
        }))

    async def warehouse_stock_update(self, event):
        """Handle warehouse stock updates with cache invalidation"""
        warehouse_id = event['warehouse_id']
        stock_id = event['stock_id']

        # Invalidate specific caches
        from django.core.cache import cache
        cache.delete(f"warehouse_summary_{warehouse_id}")
        cache.delete(f"warehouse_stock_{warehouse_id}_{stock_id}")

        await self.send(text_data=json.dumps({
            'type': 'warehouse_stock_update',
            'warehouse_id': warehouse_id,
            'stock_id': stock_id,
            'quantity_change': event['quantity_change'],
            'new_quantity': event['new_quantity'],
            'available_quantity': event['available_quantity'],
            'timestamp': event['timestamp']
        }))

# =============================================================================
# 🚚 ENHANCED TRANSFER UPDATES CONSUMER
# =============================================================================

class TransferWebSocketConsumer(BaseStockConsumer):
    """Real-time warehouse transfer updates with Redis caching"""

    group_name = 'transfer_updates'

    async def receive(self, text_data):
        """Handle transfer-related messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'subscribe_transfers':
                await self.subscribe_to_transfers(data.get('transfer_ids', []))
            elif message_type == 'get_transfers':
                await self.send_cached_transfers(data.get('transfer_ids', []))
            else:
                await self.send_error_message('Invalid message type')

        except json.JSONDecodeError:
            await self.send_error_message('Invalid JSON format')

    @database_sync_to_async
    def get_transfer_details(self, transfer_ids: List[str]) -> List[Dict]:
        """Get transfer details with Redis caching - ✅ FIXED: No await in sync context"""
        from django.core.cache import cache

        cache_key = f"transfers_{'_'.join(sorted(transfer_ids))}"

        # Try Django cache first
        cached = cache.get(cache_key)
        if cached:
            return cached

        from .models import WarehouseTransfer
        from .serializers import WarehouseTransferSerializer
        transfers = WarehouseTransfer.objects.filter(
            id__in=transfer_ids
        ).select_related(
            'from_warehouse', 'to_warehouse', 'created_by', 'completed_by'
        ).prefetch_related('items__stock')

        result = WarehouseTransferSerializer(transfers, many=True).data

        # Cache for 5 minutes
        cache.set(cache_key, result, 300)
        return result

    async def subscribe_to_transfers(self, transfer_ids: List[str]):
        """Subscribe to transfer updates"""
        if not transfer_ids:
            await self.send_error_message('Transfer IDs required')
            return

        self.subscriptions.update([f"transfer_{tid}" for tid in transfer_ids])

        from django.core.cache import cache
        for transfer_id in transfer_ids:
            group_name = f"transfer_{transfer_id}"
            await self.channel_layer.group_add(group_name, self.channel_name)

            # Sync cache increment
            cache_key = f"transfer_subscribers_{transfer_id}"
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, 3600)

        details = await sync_to_async(self.get_transfer_details)(transfer_ids)

        await self.send(text_data=json.dumps({
            'type': 'transfer_subscription_confirmed',
            'transfer_ids': transfer_ids,
            'transfers': details,
            'subscriber_count': len(self.subscriptions),
            'timestamp': timezone.now().isoformat()
        }))

    async def send_cached_transfers(self, transfer_ids: List[str]):
        """Send cached transfer details"""
        details = await sync_to_async(self.get_transfer_details)(transfer_ids)
        await self.send(text_data=json.dumps({
            'type': 'transfers',
            'transfer_ids': transfer_ids,
            'transfers': details,
            'timestamp': timezone.now().isoformat()
        }))

    async def transfer_status_update(self, event):
        """Handle transfer status changes with cache invalidation"""
        transfer_id = event['transfer_id']

        # Invalidate transfer cache
        from django.core.cache import cache
        cache_key = f"transfers_{transfer_id}"
        cache.delete(cache_key)

        await self.send(text_data=json.dumps({
            'type': 'transfer_status',
            'transfer_id': transfer_id,
            'old_status': event['old_status'],
            'new_status': event['new_status'],
            'warehouse_from': event['warehouse_from'],
            'warehouse_to': event['warehouse_to'],
            'timestamp': event['timestamp']
        }))

# =============================================================================
# 📊 DASHBOARD WITH REDIS CACHING
# =============================================================================

class StockDashboardConsumer(BaseStockConsumer):
    """Real-time dashboard with Redis caching"""

    group_name = 'dashboard_updates'

    @database_sync_to_async
    def get_dashboard_metrics(self) -> Dict:
        """Get dashboard metrics with Redis caching - ✅ FIXED: No await in sync context"""
        from django.core.cache import cache

        cache_key = f"dashboard_metrics_{self.user.id if self.user else 'global'}"

        # Try Django cache first (1 minute TTL)
        cached_metrics = cache.get(cache_key)
        if cached_metrics:
            return cached_metrics

        # Database query
        from .models import Stock, WarehouseStock

        total_items = Stock.objects.filter(is_active=True).count()
        total_value_result = WarehouseStock.objects.aggregate(
            total=Sum(F('quantity') * F('unit_price'))
        )
        total_value = total_value_result['total'] or 0

        critical_stock = WarehouseStock.objects.filter(
            quantity__lte=F('stock__reorder_level'),
            stock__is_active=True
        ).count()

        metrics = {
            'total_items': total_items,
            'total_value': float(total_value),
            'critical_stock': critical_stock,
            'timestamp': timezone.now().isoformat(),
            'cache_status': 'database'
        }

        # Cache for 60 seconds
        cache.set(cache_key, metrics, 60)
        return metrics

    async def dashboard_metrics_update(self, event):
        """Update dashboard metrics from cache"""
        # Invalidate and refresh cache
        from django.core.cache import cache
        cache_key = f"dashboard_metrics_{self.user.id if self.user else 'global'}"
        cache.delete(cache_key)

        metrics = await sync_to_async(self.get_dashboard_metrics)()

        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            'metrics': metrics,
            'timestamp': event['timestamp']
        }))

# =============================================================================
# 🔧 REDIS MONITORING CONSUMER
# =============================================================================

class RedisMonitorConsumer(BaseStockConsumer):
    """WebSocket consumer for Redis monitoring"""

    group_name = 'redis_monitor'

    async def receive(self, text_data):
        """Handle Redis monitoring requests"""
        try:
            data = json.loads(text_data)
            command = data.get('command')

            if command == 'stats':
                await self.send_redis_stats()
            elif command == 'connections':
                await self.send_connection_stats()
            elif command == 'cache_info':
                await self.send_cache_info()
            else:
                await self.send_error_message('Unknown command')

        except json.JSONDecodeError:
            await self.send_error_message('Invalid JSON')

    async def send_redis_stats(self):
        """Send comprehensive Redis statistics"""
        stats = await self.redis_cache.get_connection_stats()

        # Get WebSocket-specific stats
        active_connections = {}
        for group in ['stock_updates', 'warehouse_updates', 'transfer_updates']:
            count = await self.redis_cache.get_cache(f"active_connections_{group}", 0)
            active_connections[group] = count

        await self.send(text_data=json.dumps({
            'type': 'redis_stats',
            'redis': stats,
            'websocket_connections': active_connections,
            'timestamp': timezone.now().isoformat()
        }))

    async def send_connection_stats(self):
        """Send active WebSocket connection statistics"""
        connections = {}
        try:
            client = await self.redis_cache.get_redis_client()
            # Get all connection keys
            keys = await client.keys(f"{REDIS_PREFIX}connection_*")
            connections['total'] = len(keys)

            # Count by group
            group_counts = {}
            for key in keys:
                data = await client.get(key)
                if data:
                    conn_data = json.loads(data)
                    group = conn_data.get('group', 'unknown')
                    group_counts[group] = group_counts.get(group, 0) + 1

            connections['by_group'] = group_counts

        except RedisError as e:
            logger.error(f"Redis connection stats error: {e}")

        await self.send(text_data=json.dumps({
            'type': 'connection_stats',
            'connections': connections,
            'timestamp': timezone.now().isoformat()
        }))

    async def send_cache_info(self):
        """Send cache information"""
        try:
            client = await self.redis_cache.get_redis_client()
            keys = await client.keys(f"{REDIS_PREFIX}*")
            cache_info = {
                'total_keys': len(keys),
                'key_types': {}
            }

            for key in keys[:20]:  # Sample first 20 keys
                key_type = await client.type(key)
                cache_info['key_types'][key_type] = cache_info['key_types'].get(key_type, 0) + 1

        except RedisError:
            cache_info = {'total_keys': 0, 'key_types': {}}

        await self.send(text_data=json.dumps({
            'type': 'cache_info',
            'cache': cache_info,
            'timestamp': timezone.now().isoformat()
        }))

# =============================================================================
# UTILITY FUNCTIONS WITH REDIS INTEGRATION
# =============================================================================

async def broadcast_stock_transaction_with_cache(transaction):
    """Broadcast transaction with cache invalidation"""
    from channels.layers import get_channel_layer

    channel_layer = get_channel_layer()
    if channel_layer:
        # Prepare event
        event = {
            'type': 'stock_transaction_update',
            'transaction': StockTransactionSerializer(transaction).data,
            'stock_id': str(transaction.stock_id),
            'warehouse_id': str(transaction.from_warehouse_id) if transaction.from_warehouse else None,
            'timestamp': transaction.created_at.isoformat()
        }

        # Invalidate caches
        await redis_cache.delete_cache(f"recent_transactions_{transaction.stock_id}_*")
        cache.delete(f"recent_transactions_{transaction.stock_id}_*")

        # Broadcast
        await channel_layer.group_send('stock_updates', event)

# =============================================================================
# UTILITY FUNCTIONS FOR SIGNAL INTEGRATION
# =============================================================================

@database_sync_to_async
def broadcast_stock_transaction(transaction):
    """Broadcast stock transaction to WebSocket groups"""
    from channels.layers import get_channel_layer
    import asyncio

    channel_layer = get_channel_layer()

    if channel_layer:
        asyncio.run(channel_layer.group_send)(
            'stock_updates',
            {
                'type': 'stock_transaction_update',
                'transaction': StockTransactionSerializer(transaction).data,
                'stock_id': str(transaction.stock_id),
                'warehouse_id': str(transaction.from_warehouse_id) if transaction.from_warehouse else None,
                'timestamp': transaction.created_at.isoformat()
            }
        )

@database_sync_to_async
def broadcast_stock_level_change(stock_id, warehouse_id, old_quantity, new_quantity):
    """Broadcast stock level changes"""
    from channels.layers import get_channel_layer
    import asyncio

    channel_layer = get_channel_layer()

    if channel_layer:
        asyncio.run(channel_layer.group_send)(
            'stock_updates',
            {
                'type': 'stock_level_changed',
                'stock_id': str(stock_id),
                'warehouse_id': str(warehouse_id),
                'old_quantity': old_quantity,
                'new_quantity': new_quantity,
                'available_quantity': new_quantity,  # Simplified
                'timestamp': timezone.now().isoformat()
            }
        )

@database_sync_to_async
def broadcast_transfer_status(transfer):
    """Broadcast transfer status changes"""
    from channels.layers import get_channel_layer
    import asyncio

    channel_layer = get_channel_layer()

    if channel_layer:
        asyncio.run(channel_layer.group_send)(
            'transfer_updates',
            {
                'type': 'transfer_status_update',
                'transfer_id': str(transfer.id),
                'old_status': transfer.status,  # This would need previous status
                'new_status': transfer.status,
                'warehouse_from': str(transfer.from_warehouse_id),
                'warehouse_to': str(transfer.to_warehouse_id),
                'timestamp': timezone.now().isoformat()
            }
        )

# =============================================================================
# 🔔 GLOBAL NOTIFICATION CONSUMER
# =============================================================================

class StockNotificationConsumer(BaseStockConsumer):
    """Global notification system for critical events"""

    group_name = 'stock_notifications'

    async def critical_stock_alert(self, event):
        """Notify about critical stock levels"""
        await self.send(text_data=json.dumps({
            'type': 'critical_alert',
            'alert_type': 'low_stock',
            'stock_id': event['stock_id'],
            'item_code': event['item_code'],
            'current_quantity': event['current_quantity'],
            'reorder_level': event['reorder_level'],
            'warehouse': event['warehouse'],
            'severity': 'high',
            'timestamp': event['timestamp']
        }))

    async def batch_expiry_alert(self, event):
        """Notify about expiring batches"""
        await self.send(text_data=json.dumps({
            'type': 'critical_alert',
            'alert_type': 'batch_expiry',
            'batch_id': event['batch_id'],
            'stock_name': event['stock_name'],
            'batch_number': event['batch_number'],
            'days_to_expiry': event['days_to_expiry'],
            'warehouse': event['warehouse'],
            'severity': 'medium' if event['days_to_expiry'] > 7 else 'high',
            'timestamp': event['timestamp']
        }))

    async def audit_discrepancy_alert(self, event):
        """Notify about audit discrepancies"""
        await self.send(text_data=json.dumps({
            'type': 'critical_alert',
            'alert_type': 'audit_discrepancy',
            'audit_id': event['audit_id'],
            'total_discrepancies': event['total_discrepancies'],
            'total_value': event['total_value'],
            'warehouse': event['warehouse'],
            'severity': 'high',
            'timestamp': event['timestamp']
        }))

# =============================================================================
# 📈 STOCK ANALYTICS CONSUMER
# =============================================================================

class StockAnalyticsConsumer(BaseStockConsumer):
    """Real-time stock analytics updates"""

    group_name = 'stock_analytics'

    @database_sync_to_async
    def get_analytics_data(self):
        """Get cached analytics data"""
        cache_key = f"stock_analytics_{self.user.id if self.user else 'global'}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        from .models import StockTransaction

        analytics = {
            'daily_transactions': StockTransaction.objects.filter(
                created_at__date=timezone.now().date()
            ).count(),
            'weekly_transactions': StockTransaction.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=7)
            ).count(),
            'top_moving_items': StockTransaction.objects.values(
                'stock__name'
            ).annotate(
                total_qty=Sum('quantity')
            ).order_by('-total_qty')[:5]
        }

        cache.set(cache_key, analytics, 300)  # 5 minutes
        return analytics

    async def analytics_update(self, event):
        """Handle analytics updates"""
        await self.send(text_data=json.dumps({
            'type': 'analytics_update',
            'data': event['data'],
            'timestamp': event['timestamp']
        }))

# =============================================================================
# 📊 STOCK REPORTS CONSUMER
# =============================================================================

class StockReportsConsumer(BaseStockConsumer):
    """Real-time stock reports updates"""

    group_name = 'stock_reports'

    async def reports_update(self, event):
        """Handle report updates"""
        await self.send(text_data=json.dumps({
            'type': 'report_update',
            'report_id': event['report_id'],
            'status': event['status'],
            'progress': event.get('progress', 0),
            'timestamp': event['timestamp']
        }))

# =============================================================================
# 🌐 ASYNC WEBSOCKET CONSUMER FOR REAL-TIME UPDATES
# =============================================================================

class AsyncWebsocketConsumer(AsyncWebsocketConsumer):
    """
    Advanced WebSocket consumer for real-time stock updates
    Supports multiple subscription types and real-time analytics
    """

    async def connect(self):
        """Handle WebSocket connection"""
        self.user = self.scope['user']
        self.groups = set()
        self.subscriptions = set()

        if self.user.is_anonymous:
            await self.close()
            return

        # Add to user-specific group
        await self.channel_layer.group_add(
            f"user_{self.user.id}",
            self.channel_name
        )

        # Add to global stock updates
        await self.channel_layer.group_add(
            "stock_updates",
            self.channel_name
        )

        # Send connection confirmation
        await self.accept()
        await self.send(text_data=json.dumps({
            'type': 'connection_confirmed',
            'user_id': self.user.id,
            'username': self.user.username,
            'timestamp': timezone.now().isoformat(),
            'message': 'Connected to real-time stock updates'
        }))

        # Track connection in Redis
        await self.track_connection()

    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        try:
            # Remove from all groups
            for group in self.groups:
                await self.channel_layer.group_discard(group, self.channel_name)

            # Remove from user group
            await self.channel_layer.group_discard(
                f"user_{self.user.id}",
                self.channel_name
            )
            await self.channel_layer.group_discard(
                "stock_updates",
                self.channel_name
            )

            # Untrack connection from Redis
            await self.untrack_connection()

            logger.info(f"WebSocket disconnected: {self.channel_name}")
        except Exception as e:
            logger.error(f"Disconnect error: {e}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')

            if message_type == 'subscribe':
                await self.handle_subscription(data)
            elif message_type == 'unsubscribe':
                await self.handle_unsubscription(data)
            elif message_type == 'ping':
                await self.send_pong()
            elif message_type == 'get_metrics':
                await self.send_metrics(data)
            else:
                await self.send_error('Invalid message type')

        except json.JSONDecodeError:
            await self.send_error('Invalid JSON format')
        except Exception as e:
            logger.error(f"Receive error: {e}")
            await self.send_error(str(e))

    async def handle_subscription(self, data):
        """Handle subscription to specific stock channels"""
        subscriptions = data.get('subscriptions', [])
        if not subscriptions:
            await self.send_error('No subscriptions provided')
            return

        confirmed = []
        for subscription in subscriptions:
            sub_type = subscription.get('type')
            sub_id = subscription.get('id')

            if sub_type == 'stock':
                group_name = f"stock_{sub_id}"
            elif sub_type == 'warehouse':
                group_name = f"warehouse_{sub_id}"
            elif sub_type == 'transfer':
                group_name = f"transfer_{sub_id}"
            else:
                continue

            await self.channel_layer.group_add(group_name, self.channel_name)
            self.groups.add(group_name)
            self.subscriptions.add(f"{sub_type}:{sub_id}")
            confirmed.append({
                'type': sub_type,
                'id': sub_id,
                'group': group_name
            })

        await self.send(text_data=json.dumps({
            'type': 'subscription_confirmed',
            'subscriptions': confirmed,
            'total_subscriptions': len(confirmed),
            'timestamp': timezone.now().isoformat()
        }))

    async def handle_unsubscription(self, data):
        """Handle unsubscription from channels"""
        subscriptions = data.get('subscriptions', [])
        unsubscribed = []

        for subscription in subscriptions:
            sub_type = subscription.get('type')
            sub_id = subscription.get('id')

            if sub_type == 'stock':
                group_name = f"stock_{sub_id}"
            elif sub_type == 'warehouse':
                group_name = f"warehouse_{sub_id}"
            elif sub_type == 'transfer':
                group_name = f"transfer_{sub_id}"
            else:
                continue

            await self.channel_layer.group_discard(group_name, self.channel_name)
            self.groups.discard(group_name)
            self.subscriptions.discard(f"{sub_type}:{sub_id}")
            unsubscribed.append({
                'type': sub_type,
                'id': sub_id,
                'group': group_name
            })

        await self.send(text_data=json.dumps({
            'type': 'unsubscription_confirmed',
            'unsubscribed': unsubscribed,
            'remaining_subscriptions': len(self.subscriptions),
            'timestamp': timezone.now().isoformat()
        }))

    async def send_pong(self):
        """Send pong response"""
        await self.send(text_data=json.dumps({
            'type': 'pong',
            'timestamp': timezone.now().isoformat()
        }))

    async def send_metrics(self, data):
        """Send real-time metrics"""
        try:
            from .tasks import get_realtime_metrics
            metrics = await sync_to_async(get_realtime_metrics)()

            await self.send(text_data=json.dumps({
                'type': 'metrics',
                'data': metrics,
                'timestamp': timezone.now().isoformat()
            }))
        except Exception as e:
            await self.send_error(f"Metrics error: {str(e)}")

    async def send_error(self, message):
        """Send error message"""
        await self.send(text_data=json.dumps({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat()
        }))

    async def track_connection(self):
        """Track WebSocket connection in Redis"""
        try:
            import redis
            redis_client = redis.Redis(
                host='localhost', port=6379, db=0, decode_responses=True
            )

            connection_data = {
                'user_id': self.user.id,
                'username': self.user.username,
                'connected_at': timezone.now().isoformat(),
                'last_heartbeat': time.time(),
                'subscriptions': list(self.subscriptions)
            }

            key = f"ws_connection_{self.channel_name}"
            redis_client.setex(key, 3600, json.dumps(connection_data))
            redis_client.close()
        except Exception as e:
            logger.error(f"Connection tracking error: {e}")

    async def untrack_connection(self):
        """Remove WebSocket connection from Redis"""
        try:
            import redis
            redis_client = redis.Redis(
                host='localhost', port=6379, db=0, decode_responses=True
            )

            key = f"ws_connection_{self.channel_name}"
            redis_client.delete(key)
            redis_client.close()
        except Exception as e:
            logger.error(f"Connection untracking error: {e}")

    # Event handlers for real-time updates
    async def stock_update(self, event):
        """Handle stock quantity updates"""
        await self.send(text_data=json.dumps({
            'type': 'stock_update',
            'stock_id': event['stock_id'],
            'warehouse_id': event['warehouse_id'],
            'new_quantity': event['new_quantity'],
            'change': event['change'],
            'timestamp': event['timestamp']
        }))

    async def transfer_update(self, event):
        """Handle transfer status updates"""
        await self.send(text_data=json.dumps({
            'type': 'transfer_update',
            'transfer_id': event['transfer_id'],
            'status': event['status'],
            'from_warehouse': event['from_warehouse'],
            'to_warehouse': event['to_warehouse'],
            'timestamp': event['timestamp']
        }))

    async def alert_update(self, event):
        """Handle new stock alerts"""
        await self.send(text_data=json.dumps({
            'type': 'alert_update',
            'alert_id': event['alert_id'],
            'severity': event['severity'],
            'message': event['message'],
            'timestamp': event['timestamp']
        }))