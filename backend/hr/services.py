# hr/services.py

import os
from multiprocessing.connection import Client

import requests
import datetime
from django.conf import settings
from django.contrib.gis.geos import Point
from django.contrib.humanize.templatetags.humanize import intcomma
from django.core.mail import send_mail
from django.core.exceptions import ImproperlyConfigured
from django.utils import timezone
from geopy.distance import Distance

from customers.models import ServiceOrder
from users.models import CustomUser


class SMSReminderService:
    @staticmethod
    def send_invoice_reminder(invoice):
        customer = invoice.customer
        if not customer.phone:
            return False

        days_to_due = (invoice.due_date - timezone.now().date()).days
        if days_to_due == 7:
            message = (
                f"Hello {customer.name}! Your High Prosper bill of RWF {intcomma(invoice.amount)} "
                f"is due on {invoice.due_date.strftime('%d %B')}. "
                f"Pay early to earn HPC rewards! Link: https://pay.highprosper.africa/i/{invoice.uid}"
            )
        elif days_to_due == 0:
            message = (
                f"URGENT: {customer.name}, your RWF {intcomma(invoice.amount)} bill is DUE TODAY. "
                f"Avoid disconnection — pay now: https://pay.highprosper.africa/i/{invoice.uid}"
            )
        elif days_to_due == -3:
            message = (
                f"FINAL NOTICE: {customer.name}, your payment is 3 days overdue (RWF {intcomma(invoice.remaining)}). "
                f"Service suspension imminent. Pay immediately: https://pay.highprosper.africa/i/{invoice.uid}"
            )
        else:
            return False

        return SMSReminderService.send_sms(customer.phone, message)

    @staticmethod
    def send_sms(phone: str, message: str):
        phone = phone.lstrip('+')
        try:
            # Primary: MTN Rwanda MoMo SMS
            url = "https://proxy.momoapi.mtn.com/collection/v1_0/sms"
            headers = {
                'Authorization': f'Bearer {settings.MTN_TOKEN}',
                'Ocp-Apim-Subscription-Key': settings.MTN_SUBSCRIPTION_KEY,
                'Content-Type': 'application/json'
            }
            payload = {
                "to": phone,
                "message": message,
                "senderId": "HPROSPER"
            }
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            return response.status_code == 202
        except:
            # Fallback: Africa's Talking
            try:
                url = "https://api.africastalking.com/version1/messaging"
                payload = {
                    "username": settings.AT_USERNAME,
                    "to": phone,
                    "message": f"[High Prosper] {message}",
                    "from": "HPROSPER"
                }
                response = requests.post(url, data=payload, auth=(settings.AT_USERNAME, settings.AT_API_KEY))
                return response.status_code == 200
            except Exception as e:
                print(f"SMS failed: {e}")
                return False

# notifications/services.py — Add AI Voice section

class AIVoiceReminderService:
    @staticmethod
    def initiate_voice_reminder(invoice):
        customer = invoice.customer
        if not customer.phone or invoice.remaining <= 0:
            return False

        days_overdue = (timezone.now().date() - invoice.due_date).days
        if days_overdue != 3:  # Only on day 3 overdue
            return False

        language = "rw" if customer.phone.startswith("+250") else "sw" if customer.phone.startswith(("+255", "+254")) else "en"

        script = AIVoiceReminderService.generate_script(invoice, language)

        # Use Twilio + ElevenLabs voice
        twiml = f"""
        <Response>
            <Say voice="man" language="{language}-KE">{script}</Say>
            <Pause length="2"/>
            <Say>Press 1 to pay now. Press 2 to speak to an agent.</Say>
            <Gather numDigits="1" action="/voice/handle_response/{invoice.uid}" method="POST">
                <Say>Waiting for your choice...</Say>
            </Gather>
        </Response>
        """

        client = Client(settings.TWILIO_SID, settings.TWILIO_AUTH_TOKEN)
        call = client.calls.create(
            to=customer.phone,
            from_=settings.TWILIO_NUMBER,
            url=f"https://yourdomain.com/voice/twiml/{invoice.uid}",
            status_callback="/voice/status/",
            status_callback_method="POST"
        )

        # Log call
        invoice.sent_via.append('voice_call')
        invoice.save()
        return True

    @staticmethod
    def generate_script(invoice, lang):
        templates = {
            "rw": f"Muraho {invoice.customer.name}. Wibagiwe kwishyura amafranga {intcomma(invoice.remaining)} y'ukwezi kwa {invoice.period_month}. Uyu munsi niwo wa gatatu warengeje. Ishyura nonaha kugira ngo utakatira serivisi. Kanda 1 kwishyura ubu.",
            "sw": f"Habari {invoice.customer.name}. Umepitwa na malipo ya TSh {intcomma(invoice.remaining)} ya mwezi wa {invoice.period_month}. Leo ni siku ya tatu tangu tarehe ya mwisho. Lipa sasa ili usikatwe. Bonyeza 1 kulipa sasa.",
            "en": f"Hello {invoice.customer.name}. You are 3 days overdue on your RWF {intcomma(invoice.remaining)} bill for {invoice.period_month}/{invoice.period_year}. Pay now to avoid disconnection. Press 1 to pay immediately."
        }
        return templates.get(lang, templates["en"])

# notifications/services.py — Add routing function

def auto_route_collector_to_overdue(invoice):
    customer = invoice.customer
    if not customer.village or invoice.remaining <= 0:
        return

    # Find nearest available collector
    customer_point = Point(customer.gps_longitude, customer.gps_latitude, srid=4326)

    nearest_collector = CustomUser.objects.filter(
        role='collector',
        is_active=True,
        collector_status='available'  # Or last seen < 1 hour
    ).annotate(
        distance=Distance('current_location', customer_point)
    ).order_by('distance').first()

    if nearest_collector and nearest_collector.distance.km < 15:  # Within 15km
        # Create high-priority visit order
        order = ServiceOrder.objects.create(
            customer=customer,
            title=f"URGENT COLLECTION — {customer.name}",
            description=(
                f"AI voice call failed. Customer {customer.name} is {abs((timezone.now().date() - invoice.due_date).days)} days overdue. "
                f"Amount: RWF {intcomma(invoice.remaining)}. "
                f"Risk score: {customer.risk_score}. Immediate visit required."
            ),
            amount=invoice.remaining,
            status='In Progress',
            assigned_to=nearest_collector,
            priority='Critical'
        )

        # Update collector route
        nearest_collector.current_target = customer.village
        nearest_collector.save()

        # Push notification to collector app
        send_notification_with_fallback(
            nearest_collector,
            "URGENT VISIT ASSIGNED",
            f"{customer.name} in {customer.village.name} is overdue RWF {intcomma(invoice.remaining)}. "
            f"Distance: {round(nearest_collector.distance.km, 1)} km. Go now!",
            "/collector/route"
        )

        # Mark invoice for field collection
        invoice.sent_via.append('field_visit')
        invoice.save()

class MTNSMSService:
    """
    Service class for sending SMS via MTN API.
    """

    def __init__(self):
        self.base_url = getattr(settings, "MTN_SMS_BASE_URL", "https://api.mtn.com")
        self.client_id = getattr(settings, "MTN_SMS_CLIENT_ID", os.getenv("MTN_SMS_CLIENT_ID"))
        self.client_secret = getattr(settings, "MTN_SMS_CLIENT_SECRET", os.getenv("MTN_SMS_CLIENT_SECRET"))

        if not self.client_id or not self.client_secret:
            raise ImproperlyConfigured("MTN SMS API keys not configured.")

        self.token = None
        self.token_expires = None

    def get_token(self):
        """
        Get OAuth 2.0 token from MTN API.
        """
        now = datetime.datetime.utcnow()
        if self.token and self.token_expires and self.token_expires > now:
            return self.token

        url = f"{self.base_url}/v3/auth/oauth/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
        }
        response = requests.post(url, data=data)
        if response.status_code == 200:
            token_data = response.json()
            self.token = token_data["access_token"]
            self.token_expires = now + datetime.timedelta(seconds=token_data["expires_in"])
            return self.token

        raise Exception(f"MTN Token error: {response.status_code} - {response.text}")

    def send_sms(self, to, message):
        """
        Send SMS via MTN API.
        """
        token = self.get_token()
        url = f"{self.base_url}/v3/sms"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        data = {
            "from": "HighProsper",
            "to": [to],
            "content": message[:160],  # SMS max length
        }
        response = requests.post(url, headers=headers, json=data)
        if response.status_code == 201:
            return response.json()
        elif response.status_code == 401:
            # Retry once if token expired
            self.token = None
            token = self.get_token()
            headers["Authorization"] = f"Bearer {token}"
            response = requests.post(url, headers=headers, json=data)
            if response.status_code == 201:
                return response.json()

        raise Exception(f"MTN SMS error: {response.status_code} - {response.text}")


class EmailService:
    """
    Service class for sending emails using Django's send_mail.
    """

    def __init__(self):
        self.default_from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
        if not self.default_from_email:
            raise ImproperlyConfigured("DEFAULT_FROM_EMAIL not configured in settings.")

    def send_email(self, to_email, subject, message):
        """
        Send an email.
        """
        send_mail(
            subject=subject,
            message=message,
            from_email=self.default_from_email,
            recipient_list=[to_email],
            fail_silently=False,
        )
        return f"Email sent to {to_email}"
