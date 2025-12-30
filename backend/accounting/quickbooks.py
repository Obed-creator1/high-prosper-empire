# backend/accounting/quickbooks.py
import requests
from django.conf import settings
from django.urls import reverse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

QUICKBOOKS_CLIENT_ID = settings.QUICKBOOKS_CLIENT_ID
QUICKBOOKS_CLIENT_SECRET = settings.QUICKBOOKS_CLIENT_SECRET
QUICKBOOKS_REDIRECT_URI = "https://yourdomain.com/accounting/quickbooks/callback/"
QUICKBOOKS_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
QUICKBOOKS_API_BASE = "https://sandbox-quickbooks.api.intuit.com"  # Change to production later

class QuickBooksAuthView(APIView):
    def get(self, request):
        auth_url = (
            f"{QUICKBOOKS_AUTH_URL}?"
            f"client_id={QUICKBOOKS_CLIENT_ID}&"
            f"redirect_uri={QUICKBOOKS_REDIRECT_URI}&"
            f"response_type=code&scope=com.intuit.quickbooks.accounting&"
            f"state=highprosper2025"
        )
        return Response({"auth_url": auth_url})

class QuickBooksCallbackView(APIView):
    def get(self, request):
        code = request.GET.get('code')
        realm_id = request.GET.get('realmId')

        token_response = requests.post(
            QUICKBOOKS_TOKEN_URL,
            headers={"Accept": "application/json"},
            auth=(QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET),
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": QUICKBOOKS_REDIRECT_URI
            }
        )
        tokens = token_response.json()

        # Save tokens + realm_id to your Company model or settings
        # For now: print and save manually
        print("QUICKBOOKS CONNECTED")
        print("Realm ID:", realm_id)
        print("Access Token:", tokens.get("access_token"))
        print("Refresh Token:", tokens.get("refresh_token"))

        return Response({"status": "QuickBooks Connected — Sync Active"})

# Sync Journal Entry to QuickBooks
def sync_journal_to_quickbooks(entry):
    headers = {
        "Authorization": f"Bearer {YOUR_ACCESS_TOKEN}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    payload = {
        "Line": [
            {
                "Amount": float(entry.debit or entry.credit),
                "DetailType": "JournalEntryLineDetail",
                "JournalEntryLineDetail": {
                    "PostingType": "Credit" if entry.credit else "Debit",
                    "AccountRef": {"value": str(entry.account.quickbooks_id or 1)}
                },
                "Description": entry.description
            }
        ],
        "TxnDate": entry.date.isoformat(),
        "PrivateNote": f"High Prosper 2025 — Ref: {entry.reference}"
    }

    response = requests.post(
        f"{QUICKBOOKS_API_BASE}/v3/company/{REALM_ID}/journalentry?minorversion=65",
        json=payload,
        headers=headers
    )
    if response.status_code == 200:
        print("Synced to QuickBooks:", entry.id)