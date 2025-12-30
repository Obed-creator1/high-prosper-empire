# backend/whatsapp/views.py
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
from django.conf import settings
import requests
import json
import logging

from procurement.ai_agent import ProsperBot

logger = logging.getLogger(__name__)

# WhatsApp Configuration (use settings.py in production!)
WHATSAPP_TOKEN = getattr(settings, 'WHATSAPP_TOKEN', '')
PHONE_NUMBER_ID = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', '')
API_VERSION = "v20.0"  # Updated to latest stable as of Dec 2025
BASE_URL = f"https://graph.facebook.com/{API_VERSION}/{PHONE_NUMBER_ID}"

VERIFY_TOKEN = getattr(settings, 'WHATSAPP_VERIFY_TOKEN', 'highprosper2025')


@csrf_exempt
def whatsapp_webhook(request):
    """
    Meta WhatsApp Webhook — handles verification (GET) and incoming messages (POST)
    """
    if request.method == "GET":
        # Webhook verification
        mode = request.GET.get("hub.mode")
        token = request.GET.get("hub.verify_token")
        challenge = request.GET.get("hub.challenge")

        if mode == "subscribe" and token == VERIFY_TOKEN:
            logger.info("WhatsApp webhook verified successfully")
            return HttpResponse(challenge, content_type="text/plain")

        logger.warning("WhatsApp webhook verification failed")
        return HttpResponse("Forbidden", status=403)

    if request.method == "POST":
        try:
            data = json.loads(request.body)

            # Extract messages
            if "entry" not in data:
                return HttpResponse("OK", status=200)

            for entry in data["entry"]:
                for change in entry.get("changes", []):
                    value = change.get("value", {})
                    if "messages" not in value:
                        continue

                    for message in value["messages"]:
                        if message.get("type") != "text":
                            continue  # Ignore non-text for now

                        from_number = message["from"]
                        message_body = message["text"]["body"]

                        # Process with ProsperBot AI Agent
                        try:
                            result = ProsperBot().process_incoming_request(
                                source="whatsapp",
                                content=message_body,
                                sender=from_number
                            )

                            if result.get("status") == "created":
                                reply_text = f"✅ Done! Your request has been converted to PR {result['pr']}. We'll handle it promptly!"
                            else:
                                reply_text = result.get("response_message", "Thank you! We've received your message and will review it shortly.")

                            send_whatsapp_text(from_number, reply_text)

                        except Exception as e:
                            logger.error(f"ProsperBot processing failed: {e}")
                            send_whatsapp_text(from_number, "Sorry, something went wrong. Please try again later.")

            return HttpResponse("OK", status=200)

        except json.JSONDecodeError:
            logger.error("Invalid JSON in WhatsApp webhook")
            return HttpResponse("Bad Request", status=400)
        except Exception as e:
            logger.exception(f"Unexpected error in WhatsApp webhook: {e}")
            return HttpResponse("Error", status=500)


def send_whatsapp_text(to: str, text: str, preview_url: bool = True):
    """Send a simple text message"""
    url = f"{BASE_URL}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "recipient_type": "individual",
        "to": to,
        "type": "text",
        "text": {
            "preview_url": preview_url,
            "body": text
        }
    }
    _send_whatsapp_request(url, payload)


def send_whatsapp_template(to: str, template_name: str, language_code: str = "en_US", components: list = None):
    """Send a pre-approved template message"""
    if components is None:
        components = []

    url = f"{BASE_URL}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
            "components": components
        }
    }
    _send_whatsapp_request(url, payload)


def _send_whatsapp_request(url: str, payload: dict):
    """Internal helper to send request with error handling"""
    headers = {
        "Authorization": f"Bearer {WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code not in [200, 201]:
            logger.error(f"WhatsApp API error {response.status_code}: {response.text}")
        else:
            logger.info(f"WhatsApp message sent successfully: {payload.get('type')}")
    except requests.RequestException as e:
        logger.error(f"Failed to send WhatsApp message: {e}")