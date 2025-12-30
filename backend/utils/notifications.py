# utils/notifications.py
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from users.models import Notification

def send_notification(
        user,
        title: str,
        message: str,
        notification_type: str = "info",
        action_url: str = None,
        image: str = None
):
    """
    Save to database AND send real-time via WebSocket
    """
    # 1. Save to database
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
        action_url=action_url,
        image=image
    )

    # 2. Send real-time
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_notify_{user.id}",
            {
                "type": "send_notification",
                "content": {
                    "id": notification.id,
                    "title": title,
                    "message": message,
                    "notification_type": notification_type,
                    "action_url": action_url,
                    "image": image,
                    "created_at": notification.created_at_time.isoformat(),
                }
            }
        )

    return notification