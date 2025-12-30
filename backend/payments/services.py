# payments/services.py — MoMo Payout Engine

import uuid
import requests
from django.conf import settings
from django.utils import timezone
from decimal import Decimal

class MoMoPayoutService:
    @staticmethod
    def payout_to_collector(collector, amount, reference=None):
        """
        Send money to collector's MoMo number instantly
        Uses MTN Collection API - Disbursement endpoint
        """
        if amount <= 0:
            return False

        phone = collector.phone.lstrip('+')  # e.g. 0781234567
        external_id = reference or f"COMM-{uuid.uuid4().hex[:12].upper()}"

        url = (
            "https://sandbox.momodeveloper.mtn.com/disbursement/v1_0/transfer"
            if settings.MOMO_ENVIRONMENT == 'sandbox'
            else "https://proxy.momoapi.mtn.com/disbursement/v1_0/transfer"
        )

        headers = {
            'Authorization': f'Bearer {MoMoPayoutService.get_access_token()}',
            'X-Reference-Id': external_id,
            'X-Target-Environment': settings.MOMO_ENVIRONMENT,
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': settings.MOMO_DISBURSEMENT_KEY,
        }

        payload = {
            "amount": str(amount),
            "currency": "RWF",
            "externalId": external_id,
            "payee": {
                "partyIdType": "MSISDN",
                "partyId": phone
            },
            "payerMessage": f"High Prosper Commission - RWF {amount}",
            "payeeNote": "Thank you for your hard work!"
        }

        try:
            response = requests.post(url, json=payload, headers=headers, timeout=15)
            if response.status_code == 202:
                # Success — log payout
                PayoutLog.objects.create(
                    collector=collector,
                    amount=amount,
                    reference=external_id,
                    status='Initiated',
                    phone=phone
                )
                return True
            else:
                print(f"MoMo payout failed: {response.status_code} {response.text}")
                return False
        except Exception as e:
            print(f"MoMo payout exception: {e}")
            return False

    @staticmethod
    def get_access_token():
        """Get OAuth token for Disbursement API"""
        url = (
            "https://sandbox.momodeveloper.mtn.com/disbursement/token/"
            if settings.MOMO_ENVIRONMENT == 'sandbox'
            else "https://proxy.momoapi.mtn.com/disbursement/token/"
        )
        auth = (settings.MOMO_DISBURSEMENT_USER, settings.MOMO_DISBURSEMENT_KEY)
        headers = {
            'Ocp-Apim-Subscription-Key': settings.MOMO_DISBURSEMENT_KEY,
        }
        response = requests.post(url, auth=auth, headers=headers)
        return response.json().get('access_token')