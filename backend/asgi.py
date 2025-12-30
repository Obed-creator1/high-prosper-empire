# high_prosper/asgi.py — FINAL 2026-PROOF (WebSockets WORK!)
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'high_prosper.settings')

# Must be called first
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# Import patterns directly
from users.routing import websocket_urlpatterns as users_ws
from fleet.routing import websocket_urlpatterns as fleet_ws

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(users_ws + fleet_ws)
        )
    ),
})