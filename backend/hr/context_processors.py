from notifications.models import Notification

def notifications(request):
    if request.user.is_authenticated:
        notifications = Notification.objects.filter(recipient=request.user).order_by('-created_at_time')[:5]
        unread_count = Notification.objects.filter(recipient=request.user, unread=False).count()
        return {
            'notifications': notifications,
            'unread_count': unread_count,
        }
    return {}