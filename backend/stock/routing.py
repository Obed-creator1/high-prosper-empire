"""
Stock Management WebSocket Routing
Complete WebSocket URL patterns for real-time inventory management
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # 📦 Stock Updates
    re_path(r'ws/stock_updates/$', consumers.StockWebSocketConsumer.as_asgi(), name='stock_updates_ws'),

    # 🏭 Warehouse Updates
    re_path(r'ws/warehouse_updates/$', consumers.WarehouseWebSocketConsumer.as_asgi(), name='warehouse_updates_ws'),

    # 🚚 Transfer Updates
    re_path(r'ws/transfer_updates/$', consumers.TransferWebSocketConsumer.as_asgi(), name='transfer_updates_ws'),

    # 📊 Dashboard Updates
    re_path(r'ws/dashboard/$', consumers.StockDashboardConsumer.as_asgi(), name='stock_dashboard_ws'),

    # 🔔 Notifications
    re_path(r'ws/stock_notifications/$', consumers.StockNotificationConsumer.as_asgi(), name='stock_notifications_ws'),

    # 🔧 Redis Monitoring (Admin Only)
    re_path(r'ws/redis_monitor/$', consumers.RedisMonitorConsumer.as_asgi(), name='redis_monitor_ws'),

    # 📈 Analytics Updates
    re_path(r'ws/analytics/$', consumers.StockAnalyticsConsumer.as_asgi(), name='stock_analytics_ws'),

    # ⚡ Real-time Reports
    re_path(r'ws/reports/$', consumers.StockReportsConsumer.as_asgi(), name='stock_reports_ws'),

    re_path(r'ws/stock/async/$', consumers.AsyncWebsocketConsumer.as_asgi()),
]

# Optional: Granular stock-specific routes
stock_specific_patterns = [
    # Specific stock item updates
    re_path(r'ws/stock/(?P<stock_id>[^/]+)/$', consumers.StockWebSocketConsumer.as_asgi(), name='stock_specific_ws'),

    # Specific warehouse updates
    re_path(r'ws/warehouse/(?P<warehouse_id>[^/]+)/$', consumers.WarehouseWebSocketConsumer.as_asgi(), name='warehouse_specific_ws'),

    # Specific transfer updates
    re_path(r'ws/transfer/(?P<transfer_id>[^/]+)/$', consumers.TransferWebSocketConsumer.as_asgi(), name='transfer_specific_ws'),
]

# Complete routing including granular patterns
complete_websocket_urlpatterns = websocket_urlpatterns + stock_specific_patterns