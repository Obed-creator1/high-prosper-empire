# payments/momo.py — HIGH PROSPER MTN MOMO 2027
import requests
import uuid
from django.conf import settings
from django.utils import timezone
from django.core.cache import cache
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

logger = logging.getLogger(__name__)

class MTNMoMoAPI:
    def __init__(self):
        self.config = settings.MTN_MOMO
        self.base_url = self.config['BASE_URL']
        self.token = None
        self.token_expiry = None

        # Session with retries
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            method_whitelist=["HEAD", "GET", "POST"],
            backoff_factor=1
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def get_token(self):
        """Get access token with caching and error handling"""
        cache_key = "momo_access_token"
        cached = cache.get(cache_key)

        if cached and cached['expiry'] > timezone.now():
            self.token = cached['token']
            self.token_expiry = cached['expiry']
            return self.token

        url = f"{self.base_url}/collection/token/"
        auth = (self.config['API_USER_ID'], self.config['API_KEY'])
        headers = {
            'Ocp-Apim-Subscription-Key': self.config['SUBSCRIPTION_KEY'],
        }

        try:
            response = self.session.post(url, auth=auth, headers=headers, timeout=15)
            response.raise_for_status()
            data = response.json()

            self.token = data['access_token']
            expiry = timezone.now() + timezone.timedelta(seconds=data['expires_in'] - 60)

            cache.set(cache_key, {
                'token': self.token,
                'expiry': expiry
            }, timeout=data['expires_in'])

            self.token_expiry = expiry
            logger.info("MoMo token refreshed successfully")
            return self.token

        except requests.exceptions.HTTPError as e:
            logger.error(f"MoMo Token HTTP Error: {response.status_code} {response.text}")
            return None
        except requests.exceptions.ConnectionError:
            logger.error("MoMo Token: Connection failed")
            return None
        except requests.exceptions.Timeout:
            logger.error("MoMo Token: Request timed out")
            return None
        except Exception as e:
            logger.error(f"MoMo Token Unexpected Error: {str(e)}")
            return None

    def _get_auth_headers(self, reference_id=None):
        token = self.get_token()
        if not token:
            raise Exception("Failed to authenticate with MTN MoMo")

        headers = {
            'Authorization': f'Bearer {token}',
            'Ocp-Apim-Subscription-Key': self.config['SUBSCRIPTION_KEY'],
            'X-Target-Environment': self.config['TARGET_ENVIRONMENT'],
            'Content-Type': 'application/json',
        }
        if reference_id:
            headers['X-Reference-Id'] = reference_id
        return headers

    def request_to_pay(self, phone, amount, external_id=None, message="High Prosper Payment"):
        """Safe request to pay with full error handling"""
        reference_id = str(uuid.uuid4())
        external_id = external_id or f"HP-{reference_id[:8]}"

        payload = {
            "amount": str(amount),
            "currency": "RWF",
            "externalId": external_id,
            "payer": {
                "partyIdType": "MSISDN",
                "partyId": phone.lstrip('+')
            },
            "payerMessage": message[:120],
            "payeeNote": "Thank you for using High Prosper"
        }

        url = f"{self.base_url}{self.config['REQUEST_TO_PAY_URL']}"

        try:
            headers = self._get_auth_headers(reference_id)
            headers['X-Callback-Url'] = f"{self.config['CALLBACK_HOST']}/payments/momo/webhook/"

            response = self.session.post(url, json=payload, headers=headers, timeout=20)

            if response.status_code == 202:
                logger.info(f"MoMo RTP Success: {reference_id} for {phone} - RWF {amount}")
                return {
                    "success": True,
                    "reference_id": reference_id,
                    "message": "Payment request sent successfully"
                }
            elif response.status_code == 400:
                error = response.json()
                error_msg = error.get('message', 'Invalid request')
                logger.warning(f"MoMo RTP 400: {error_msg}")
                return {"success": False, "error": f"Invalid request: {error_msg}"}
            elif response.status_code == 409:
                return {"success": False, "error": "Transaction already exists"}
            else:
                logger.error(f"MoMo RTP Failed {response.status_code}: {response.text}")
                return {"success": False, "error": f"Server error {response.status_code}"}

        except requests.exceptions.Timeout:
            logger.error("MoMo RTP Timeout")
            return {"success": False, "error": "Request timed out. Please try again."}
        except requests.exceptions.ConnectionError:
            logger.error("MoMo RTP Connection failed")
            return {"success": False, "error": "Network error. Check your connection."}
        except Exception as e:
            logger.exception("MoMo RTP Unexpected error")
            return {"success": False, "error": "Service temporarily unavailable"}

    def check_payment_status(self, reference_id):
        """Check status with error handling"""
        try:
            headers = self._get_auth_headers()
            url = f"{self.base_url}{self.config['CHECK_STATUS_URL']}{reference_id}"

            response = self.session.get(url, headers=headers, timeout=15)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return {"status": "NOT_FOUND"}
            else:
                logger.warning(f"MoMo Status Check {response.status_code}: {response.text}")
                return None
        except Exception as e:
            logger.error(f"MoMo Status Check Error: {str(e)}")
            return None

    def initiate_refund(self, phone, amount, external_id, reason="Service Refund"):
        """Safe refund with error handling"""
        reference_id = str(uuid.uuid4())

        payload = {
            "amount": str(amount),
            "currency": "RWF",
            "externalId": external_id,
            "payee": {"partyIdType": "MSISDN", "partyId": phone.lstrip('+')},
            "payerMessage": reason,
            "payeeNote": "High Prosper Refund"
        }

        url = f"{self.base_url}{self.config['DISBURSE_URL']}"

        try:
            headers = self._get_auth_headers(reference_id)

            response = self.session.post(url, json=payload, headers=headers, timeout=20)

            if response.status_code == 202:
                logger.info(f"MoMo Refund initiated: {reference_id}")
                return {"success": True, "reference_id": reference_id}
            else:
                logger.error(f"MoMo Refund Failed {response.status_code}: {response.text}")
                return {"success": False, "error": response.text}
        except Exception as e:
            logger.error(f"MoMo Refund Error: {str(e)}")
            return {"success": False, "error": "Refund failed"}