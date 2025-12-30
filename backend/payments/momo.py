import requests
from django.conf import settings

def get_token():
    url = f"{settings.MOMO_API_BASE_URL}/token/"
    headers = {"Authorization": f"Basic {settings.MOMO_API_KEY}"}
    response = requests.post(url, headers=headers)
    response.raise_for_status()
    return response.json().get("access_token")

def request_payment(phone_number, amount, external_id, payer_message="Payment", payee_note="Payment"):
    token = get_token()
    url = f"{settings.MOMO_API_BASE_URL}/requesttopay"
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Reference-Id": external_id,
        "X-Target-Environment": settings.MOMO_API_ENV,
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": settings.MOMO_API_KEY,
    }
    payload = {
        "amount": str(amount),
        "currency": "RWF",
        "externalId": external_id,
        "payer": {"partyIdType": "MSISDN", "partyId": phone_number},
        "payerMessage": payer_message,
        "payeeNote": payee_note,
    }
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()
