# backend/procurement/whatsapp.py
import requests
from django.conf import settings

def send_po_whatsapp(po):
    url = f"https://graph.facebook.com/v20.0/{settings.WHATSAPP_PHONE_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": po.supplier.phone,  # e.g., 2547xxxxxxxx
        "type": "template",
        "template": {
            "name": "purchase_order",
            "language": {"code": "en_US"},
            "components": [
                {
                    "type": "header",
                    "parameters": [{"type": "document", "document": {"link": f"https://erp.highprosper.com/api/po/{po.id}/pdf/"}}]
                },
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": po.supplier.contact_person or po.supplier.name},
                        {"type": "text", "text": po.po_number},
                        {"type": "text", "text": str(po.expected_delivery_date)},
                        {"type": "text", "text": f"{po.currency} {po.grand_total:,.2f}"}
                    ]
                }
            ]
        }
    }

    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            return True
    except:
        pass
    return False