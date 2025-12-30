# users/routing.py — FINAL
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<user_id>\d+)/$", consumers.ChatConsumer.as_asgi()),
    re_path(r"ws/group/(?P<room_id>[^/]+)/$", consumers.GroupChatConsumer.as_asgi()),
    re_path(r"ws/users/$", consumers.UsersSidebarConsumer.as_asgi()),
]