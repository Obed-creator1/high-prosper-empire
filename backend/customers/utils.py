# utils/sms.py — HIGH PROSPER SMS ENGINE 2026
import requests
from django.conf import settings

def send_sms(phone_numbers: list[str], title: str, message: str, action_url: str = None, timestamp: str = None):
    """
    Professional SMS template
    """
    if not settings.AFRICAS_TALKING_USERNAME or not settings.AFRICAS_TALKING_API_KEY:
        print("SMS disabled: credentials missing")
        return

    # Build clean message
    sms_body = f"High Prosper Alert\n\n{title}\n{message}"
    if action_url:
        short_url = action_url.replace("https://app.highprosper.rw", "hp.rw")  # Optional shortener
        sms_body += f"\n\nView: {short_url}"
    if timestamp:
        sms_body += f"\n\nSent: {timestamp}"

    # Truncate if too long (Africa's Talking supports multi-part)
    # But aim for <160 chars
    if len(sms_body) > 160:
        sms_body = sms_body[:157] + "..."

    url = "https://api.africastalking.com/version1/messaging"
    headers = {
        "apiKey": settings.AFRICAS_TALKING_API_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
    }
    data = {
        "username": settings.AFRICAS_TALKING_USERNAME,
        "to": ",".join(phone_numbers),
        "message": sms_body,
        "from": settings.AFRICAS_TALKING_SENDER_ID or "HighProsper"
    }

    try:
        response = requests.post(url, headers=headers, data=data)
        response.raise_for_status()
        print(f"SMS sent to {phone_numbers}: {sms_body}")
    except Exception as e:
        print(f"SMS failed: {e}")