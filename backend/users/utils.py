# users/utils.py
from django.core.exceptions import PermissionDenied
import firebase_admin
from firebase_admin import credentials, messaging
from django.conf import settings

cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
firebase_admin.initialize_app(cred)

def send_push_notification(token: str, title: str, body: str):
    message = messaging.Message(
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        token=token,
    )
    try:
        response = messaging.send(message)
        print("Successfully sent push:", response)
    except Exception as e:
        print("Error sending push:", e)

# Example usage after payment
# send_push_notification(customer.device_token, "Payment Received", f"Thank you {customer.name}! You paid {amount} RWF.")

def require_group_admin(user, room):
    """Raise 403 if user is not admin of the room"""
    if not room.memberships.filter(user=user, role='admin').exists():
        raise PermissionDenied("You must be a group admin to perform this action.")