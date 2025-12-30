# ussd/views.py — HIGH PROSPER EAST AFRICA 2027
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from customers.models import Customer
from payments.models import Payment, Invoice
import uuid

@csrf_exempt
def ussd_webhook(request):
    phone = request.POST.get('phoneNumber', '')
    text = request.POST.get('text', '').strip()

    # Normalize phone
    phone = "+" + phone.lstrip('+')

    # AUTO LANGUAGE DETECTION BY COUNTRY CODE
    if phone.startswith("+255"):      # Tanzania
        lang = "sw"
    elif phone.startswith("+254"):    # Kenya
        lang = "sw"
    elif phone.startswith("+257"):    # Burundi
        lang = "sw"
    elif phone.startswith("+256"):    # Uganda
        lang = "sw"
    elif phone.startswith("+250"):    # Rwanda
        lang = "rw"
    else:
        lang = "en"  # Default English

    customer = Customer.objects.filter(phone=phone).first()

    # === MAIN MENU ===
    if not text:
        if lang == "sw":
            response = "CON Karibu High Prosper\n"
            response += "1. Angalia Deni Lako\n"
            response += "2. Lipia Sasa\n"
            response += "3. Ripoti Tatizo\n"
            response += "4. Piga Simu kwa Agent\n"
            response += "5. Namba Yako ya Malipo\n"
            response += "0. English • 9. Kinyarwanda"
        elif lang == "rw":
            response = "CON Murakaza neza kuri High Prosper\n"
            response += "1. Reba amafaranga wasigaranye\n"
            response += "2. Ishyura amafranga\n"
            response += "3. Vuga ikibazo\n"
            response += "4. Vugana n'umukozi\n"
            response += "5. Nimero ya konte yawe\n"
            response += "0. English"
        else:
            response = "CON Welcome to High Prosper\n"
            response += "1. Check Balance\n2. Pay Now\n3. Report Issue\n4. Call Agent\n5. My Account No"

        return HttpResponse(response, content_type="text/plain")

    # === LANGUAGE SWITCHER ===
    if text == "0":
        lang = "en"
    elif text == "9":
        lang = "rw"

    # === 1. CHECK BALANCE ===
    if text in ["1", "1*0", "1*9"]:
        if not customer:
            msg = {"sw": "Hakuna akaunti", "rw": "Nta konte yabonetse", "en": "No account found"}[lang]
            return HttpResponse(f"END {msg}", content_type="text/plain")

        balance = abs(customer.balance or 0)
        currency = "TSh" if lang == "sw" else "RWF"
        status_msg = {
            "sw": f"Unadaiwa {currency} {balance:,}\nLipa leo ili usikatwe!",
            "rw": f"Wasigaranye {currency} {balance:,}\nUyu munsi niwo wanyuma!",
            "en": f"You owe {currency} {balance:,}\nPay today to avoid disconnection!"
        }[lang]

        return HttpResponse(f"END {status_msg}\n\nAkaunti: {customer.payment_account}", content_type="text/plain")

    # === 2. PAY BILL ===
    if text == "2":
        if not customer:
            msg = {"sw": "Hakuna akaunti", "rw": "Nta konte", "en": "No account"}[lang]
            return HttpResponse(f"END {msg}", content_type="text/plain")

        amount = abs(customer.balance or 0)
        currency = "TSh" if lang == "sw" else "RWF"
        response = f"CON Lipa {currency} {amount:,} sasa?\n" if lang == "sw" else \
            f"CON Ishyura {currency} {amount:,} ubu?\n" if lang == "rw" else \
                f"CON Pay {currency} {amount:,} now?\n"
        response += "1. Ndio / Yego / Yes\n"
        response += "2. Lipia kiasi kingine\n"
        response += "0. Rudi nyuma"
        return HttpResponse(response, content_type="text/plain")

    if text == "2*1":
        token = str(uuid.uuid4())[:8].upper()
        Payment.objects.create(
            customer=customer,
            amount=abs(customer.balance),
            method="momo",
            status="Pending",
            reference=f"USSD-{token}"
        )
        pay_msg = {
            "sw": f"Lipa sasa kwenye M-Pesa/Tigo Pesa:\nPiga *150*00# → {token}",
            "rw": f"Ishyura kuri MoMo:\n*182*7*1# → Andika: {token}",
            "en": f"Pay now on Mobile Money:\nDial *182*7*1# → Enter: {token}"
        }[lang]
        return HttpResponse(f"END {pay_msg}\n\nAsante / Murakoze / Thank you!", content_type="text/plain")

    # === 3. REPORT ISSUE ===
    if text == "3":
        msg = {"sw": "Eleza tatizo lako:", "rw": "Andika ikibazo cyawe:", "en": "Describe your issue:"}[lang]
        return HttpResponse(f"CON {msg}", content_type="text/plain")

    if text.startswith("3*"):
        issue = text[2:]
        Complaint.objects.create(
            customer=customer,
            title="USSD Report",
            description=f"[USSD {lang.upper()}] {phone}: {issue}",
            priority="High"
        )
        thanks = {"sw": "Asante! Tutakupigia simu saa 1 ijayo",
                  "rw": "Murakoze! Tuzagufata mu masaha 1",
                  "en": "Thank you! We will call you in 1 hour"}[lang]
        return HttpResponse(f"END {thanks}", content_type="text/plain")

    # === 4. CALL AGENT ===
    if text == "4":
        if customer and customer.collector:
            name = customer.collector.get_full_name() or "Agent"
            msg = {
                "sw": f"Agent wako ni {name}\nPiga: {customer.collector.phone}",
                "rw": f"Umukozi wawe ni {name}\nTelefoni: {customer.collector.phone}",
                "en": f"Your agent: {name}\nCall: {customer.collector.phone}"
            }[lang]
        else:
            msg = {"sw": "Hakuna agent", "rw": "Nta mukozi", "en": "No agent assigned"}[lang]
        return HttpResponse(f"END {msg}", content_type="text/plain")

    # === 5. ACCOUNT NUMBER ===
    if text == "5":
        if customer:
            msg = {
                "sw": f"Namba yako ya malipo:\n{customer.payment_account}",
                "rw": f"Nimero ya konte yawe:\n{customer.payment_account}",
                "en": f"Your account number:\n{customer.payment_account}"
            }[lang]
            return HttpResponse(f"END {msg}", content_type="text/plain")

    # Default
    return HttpResponse("END Invalid option / Ibisubizo sibyo", content_type="text/plain")


def detect_language(phone):
    if phone.startswith("+250"): return "rw"   # Rwanda → Kinyarwanda
    if phone.startswith("+255"): return "sw"   # Tanzania → Swahili
    if phone.startswith("+254"): return "sw"   # Kenya → Swahili
    if phone.startswith("+256"): return "lg"   # Uganda → Luganda
    if phone.startswith("+257"): return "fr"   # Burundi → French
    if phone.startswith("+243"): return "fr"   # DRC → French
    if phone.startswith("+211"): return "en"   # South Sudan → English
    return "en"

# MAIN MENU — ALL 5 LANGUAGES
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
        "account": "Namba Yako"
    },
    "lg": {  # LUGANDA — UGANDA
        "welcome": "Tukwano ku High Prosper",
        "balance": "Kebera ssente zo",
        "pay": "Ssente zange",
        "issue": "Lopa ekizibu",
        "agent": "Yogera n'omukozi",
        "account": "Namba yo eyo"
    },
    "fr": {  # FRENCH — DRC & BURUNDI
        "welcome": "Bienvenue chez High Prosper",
        "balance": "Voir votre solde",
        "pay": "Payer maintenant",
        "issue": "Signaler un problème",
        "agent": "Parler à votre agent",
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