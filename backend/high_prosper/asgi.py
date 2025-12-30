# high_prosper/asgi.py — FINAL 2026-PROOF (WebSockets + Auth + Safe Timeout)
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# Set Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'high_prosper.settings')

# Load Django ASGI app
django_asgi_app = get_asgi_application()

# Import WebSocket URL patterns
from users.routing import websocket_urlpatterns as users_ws
from fleet.routing import websocket_urlpatterns as fleet_ws
from customers.routing import websocket_urlpatterns as customers_ws
from notifications.routing import websocket_urlpatterns as notifications_ws
from stock.routing import websocket_urlpatterns as stock_ws
from payments.routing import websocket_urlpatterns as payments_ws

combined_websocket_urlpatterns = (
        users_ws +
        fleet_ws +
        customers_ws +
        notifications_ws +
        stock_ws +
        payments_ws
)

# Safe timeout wrapper — only modify extensions if they exist
class SafeTimeoutMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Only apply to relevant scope types
        if scope["type"] == "lifespan":
            # Ensure extensions dict exists
            scope.setdefault("extensions", {})
            scope["extensions"]["lifespan.timeout"] = {"startup": 300.0, "shutdown": 300.0}

        elif scope["type"] == "http":
            scope.setdefault("extensions", {})
            scope["extensions"]["http.timeout"] = {"disconnect": 300.0}

        elif scope["type"] == "websocket":
            scope.setdefault("extensions", {})
            scope["extensions"]["websocket.timeout"] = {"disconnect": 300.0}

        return await self.app(scope, receive, send)

# Final ASGI application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(combined_websocket_urlpatterns)
        )
    ),
})

# Apply safe timeout middleware
application = SafeTimeoutMiddleware(application)