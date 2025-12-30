from django.urls import re_path
from chat.consumers import ChatConsumer
from users.consumers import UsersSidebarConsumer

websocket_urlpatterns = [
    re_path(r"ws/chat/(?P<other_user_id>\d+)/$", ChatConsumer.as_asgi()),
    re_path(r"ws/users-sidebar/$", UsersSidebarConsumer.as_asgi()),
]
