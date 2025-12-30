# customers/routing.py
from django.urls import re_path
from channels.auth import AuthMiddlewareStack
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/customers/$', AuthMiddlewareStack(consumers.CustomerListConsumer.as_asgi())),
    re_path(r'ws/stats/$', AuthMiddlewareStack(consumers.StatsConsumer.as_asgi())),
]