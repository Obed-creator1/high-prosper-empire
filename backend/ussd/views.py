# ussd/views.py — HIGH PROSPER EAST AFRICA 2027
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.core.cache import cache
from customers.models import Customer, ServiceRequest, Complaint
from payments.models import Payment
import uuid
import logging

logger = logging.getLogger(__name__)

# Session timeout: 5 minutes
SESSION_TIMEOUT = 300

@csrf_exempt
def ussd_webhook(request):
    if request.method != 'POST':
        return HttpResponse("END Invalid request", content_type="text/plain")

    try:
        phone = request.POST.get('phoneNumber', '').strip()
        text = request.POST.get('text', '').strip()

        if not phone:
            return HttpResponse("END No phone number", content_type="text/plain")

        # Normalize phone
        phone = "+" + phone.lstrip('+')

        # Language detection
        lang = detect_language(phone)

        # Session management
        session_key = f"ussd_session_{phone.replace('+', '')}"
        last_activity = cache.get(session_key)

        # Check for timeout
        if last_activity:
            time_since = (timezone.now() - last_activity).total_seconds()
            if time_since > SESSION_TIMEOUT:
                cache.delete(session_key)
                timeout_msg = {
                    "sw": "Muda wa kikao umeisha. Anza upya.",
                    "rw": "Igihe cy'ikiganiro cyararengeje. Tangira bushya.",
                    "en": "Session expired. Please start again.",
                    "fr": "Session expirée. Veuillez recommencer.",
                    "lg": "Ekiseera kyaggwaako. Tangira buto."
                }[lang]
                return HttpResponse(f"END {timeout_msg}", content_type="text/plain")

        # Update session activity
        cache.set(session_key, timezone.now(), SESSION_TIMEOUT)

        # Find customer
        customer = Customer.objects.filter(phone=phone).first()

        # Parse session
        session = text.split('*') if text else []

        # === MAIN MENU ===
        if not text:
            response = f"CON {menus[lang]['welcome']}\n"
            response += "1. " + menus[lang]['balance'] + "\n"
            response += "2. " + menus[lang]['pay'] + "\n"
            response += "3. " + menus[lang]['issue'] + "\n"
            response += "4. " + menus[lang]['agent'] + "\n"
            response += "5. " + menus[lang]['account'] + "\n"
            response += "6. Pay for Service / Lipa Huduma"
            return HttpResponse(response, content_type="text/plain")

        # === 1. CHECK BALANCE ===
        if session[0] == "1":
            if not customer:
                msg = {"sw": "Hakuna akaunti", "rw": "Nta konte", "en": "No account found"}[lang]
                return HttpResponse(f"END {msg}", content_type="text/plain")

            try:
                balance = abs(customer.balance or 0)
                currency = "TSh" if phone.startswith("+255") else "RWF"
                msg = f"Outstanding: {currency} {balance:,}\n\nAccount: {customer.payment_account}"
                return HttpResponse(f"END {msg}", content_type="text/plain")
            except Exception as e:
                logger.error(f"Balance error {phone}: {e}")
                return HttpResponse("END Temporary error", content_type="text/plain")

        # === 2. PAY SUBSCRIPTION ===
        if session[0] == "2":
            if not customer:
                msg = {"sw": "Hakuna akaunti", "rw": "Nta konte", "en": "No account"}[lang]
                return HttpResponse(f"END {msg}", content_type="text/plain")

            amount = abs(customer.balance or 0)
            currency = "TSh" if phone.startswith("+255") else "RWF"

            if len(session) == 1:
                response = f"CON Pay {currency} {amount:,} now?\n"
                response += "1. Yes\n2. Other amount\n0. Back"
                return HttpResponse(response, content_type="text/plain")

            if session[1] == "1":
                token = str(uuid.uuid4())[:8].upper()
                try:
                    Payment.objects.create(
                        customer=customer,
                        amount=amount,
                        method="momo",
                        status="Pending",
                        reference=f"SUB-{token}"
                    )
                    pay_msg = get_payment_prompt(lang, token, phone)
                    return HttpResponse(f"END {pay_msg}\n\nThank you!", content_type="text/plain")
                except Exception as e:
                    logger.error(f"Payment creation error: {e}")
                    return HttpResponse("END Payment failed. Try again.", content_type="text/plain")

        # === 6. PAY FOR SERVICE REQUEST (GIG) ===
        if session[0] == "6":
            try:
                requests = ServiceRequest.objects.filter(
                    requester_phone=phone.replace('+', ''),
                    payment_status__in=['unpaid', 'partially_paid'],
                    balance_due__gt=0
                ).order_by('-created_at')

                if len(session) == 1:
                    if not requests.exists():
                        msg = {"sw": "Hakuna huduma inayodaiwa", "rw": "Nta serivisi isigaranye", "en": "No pending service payments"}[lang]
                        return HttpResponse(f"END {msg}", content_type="text/plain")

                    response = "CON Select service to pay:\n"
                    for i, req in enumerate(requests[:5], 1):
                        currency = "TSh" if phone.startswith("+255") else "RWF"
                        response += f"{i}. #{req.id} {req.title[:25]}... - {currency} {int(req.balance_due):,}\n"
                    response += "0. Back"
                    return HttpResponse(response, content_type="text/plain")

                # Validate selection
                try:
                    choice = int(session[1]) - 1
                    selected_req = requests[choice]
                except (ValueError, IndexError):
                    return HttpResponse("END Invalid choice", content_type="text/plain")

                if len(session) == 2:
                    currency = "TSh" if phone.startswith("+255") else "RWF"
                    response = f"CON Pay {currency} {int(selected_req.balance_due):,}?\n"
                    response += f"Service: {selected_req.title}\n\n"
                    response += "1. Yes\n0. Back"
                    return HttpResponse(response, content_type="text/plain")

                if session[2] == "1":
                    token = str(uuid.uuid4())[:8].upper()
                    try:
                        Payment.objects.create(
                            service_request=selected_req,
                            amount=selected_req.balance_due,
                            method="momo",
                            status="Pending",
                            reference=f"GIG-{token}"
                        )
                        pay_msg = get_payment_prompt(lang, token, phone)
                        return HttpResponse(f"END {pay_msg}\n\nThank you!", content_type="text/plain")
                    except Exception as e:
                        logger.error(f"Gig payment error: {e}")
                        return HttpResponse("END Payment failed. Try again.", content_type="text/plain")

            except Exception as e:
                logger.error(f"Service payment flow error: {e}")
                return HttpResponse("END Service error. Try again.", content_type="text/plain")

        # === 3. REPORT ISSUE ===
        if session[0] == "3":
            if len(session) == 1:
                msg = {"sw": "Andika tatizo lako:", "rw": "Andika ikibazo cyawe:", "en": "Describe your issue:"}[lang]
                return HttpResponse(f"CON {msg}", content_type="text/plain")

            try:
                Complaint.objects.create(
                    customer=customer,
                    title="USSD Report",
                    description=f"[USSD {lang.upper()}] {phone}: {session[1]}",
                    priority="High"
                )
                thanks = {"sw": "Asante! Tutakushughulikia", "rw": "Murakoze!", "en": "Thank you! We'll follow up"}[lang]
                return HttpResponse(f"END {thanks}", content_type="text/plain")
            except Exception as e:
                logger.error(f"Complaint error: {e}")
                return HttpResponse("END Failed to report issue", content_type="text/plain")

        # === 4. CALL AGENT ===
        if session[0] == "4":
            try:
                if customer and customer.village and customer.village.collectors.exists():
                    collector = customer.village.collectors.first()
                    name = collector.get_full_name() or "Agent"
                    msg = f"{name}: {collector.phone}"
                else:
                    msg = {"sw": "Hakuna agent", "rw": "Nta mukozi", "en": "No agent assigned"}[lang]
                return HttpResponse(f"END {msg}", content_type="text/plain")
            except Exception as e:
                logger.error(f"Agent lookup error: {e}")
                return HttpResponse("END Service error", content_type="text/plain")

        # === 5. ACCOUNT NUMBER ===
        if session[0] == "5":
            try:
                if customer:
                    return HttpResponse(f"END Account: {customer.payment_account}", content_type="text/plain")
                msg = {"sw": "Hakuna akaunti", "rw": "Nta konte", "en": "No account"}[lang]
                return HttpResponse(f"END {msg}", content_type="text/plain")
            except Exception as e:
                logger.error(f"Account error: {e}")
                return HttpResponse("END Error", content_type="text/plain")

        return HttpResponse("END Invalid option", content_type="text/plain")

    except Exception as e:
        logger.critical(f"USSD Critical Crash: {e}")
        return HttpResponse("END Service unavailable. Try again later.", content_type="text/plain")


def detect_language(phone):
    prefixes = {
        "+250": "rw",   # Rwanda
        "+255": "sw",   # Tanzania
        "+254": "sw",   # Kenya
        "+256": "lg",   # Uganda
        "+257": "fr",   # Burundi
        "+243": "fr",   # DRC
    }
    for prefix, code in prefixes.items():
        if phone.startswith(prefix):
            return code
    return "en"


def get_payment_prompt(lang, token, phone):
    if phone.startswith("+250"):
        return f"Pay now on MoMo:\n*182*7*1#\nEnter code: {token}"
    elif phone.startswith("+255"):
        return f"Pay via M-Pesa/Tigo Pesa:\n*150*00#\nEnter code: {token}"
    elif phone.startswith("+254"):
        return f"Pay via M-Pesa:\n*334#\nEnter code: {token}"
    else:
        return f"Pay now:\nDial mobile money menu\nReference: {token}"


# MULTI-LANGUAGE MENUS
menus = {
    "rw": {
        "welcome": "Murakaza neza kuri High Prosper",
        "balance": "Reba amafaranga wasigaranye",
        "pay": "Ishyura amafranga",
        "issue": "Vuga ikibazo",
        "agent": "Vugana n'umukozi",
        "account": "Nimero ya konte yawe"
    },
    "sw": {
        "welcome": "Karibu High Prosper",
        "balance": "Angalia Deni Lako",
        "pay": "Lipia Sasa",
        "issue": "Ripoti Tatizo",
        "agent": "Piga Agent",
        "account": "Namba Yako ya Malipo"
    },
    "lg": {
        "welcome": "Tukwano ku High Prosper",
        "balance": "Kebera ssente zo",
        "pay": "Lipa ssente",
        "issue": "Lopa ekizibu",
        "agent": "Yogera n'omukozi",
        "account": "Namba yo"
    },
    "fr": {
        "welcome": "Bienvenue chez High Prosper",
        "balance": "Voir votre solde",
        "pay": "Payer maintenant",
        "issue": "Signaler un problème",
        "agent": "Parler à un agent",
        "account": "Votre numéro de compte"
    },
    "en": {
        "welcome": "Welcome to High Prosper",
        "balance": "Check Balance",
        "pay": "Pay Now",
        "issue": "Report Issue",
        "agent": "Talk to Agent",
        "account": "My Account Number"
    }
}