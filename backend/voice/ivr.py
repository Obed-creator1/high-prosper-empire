from africastalking import Voice
from django.http import HttpResponse

from ussd.views import detect_language


def handle_incoming_call(request):
    phone = request.POST['callerNumber']
    lang = detect_language(phone)

    voice = Voice()
    sayings = {
        "rw": ["Murakaza neza", "Kanda 1 kugira ngo umenye amafaranga wasigaranye", "Kanda 2 kwishyura"],
        "lg": ["Tukwano", "Kanda 1 okuzuula ssente zo", "Kanda 2 okusasula"],
        "fr": ["Bienvenue", "Appuyez 1 pour vérifier votre solde", "Appuyez 2 pour payer"],
        "sw": ["Karibu", "Bonyeza 1 kuangalia deni", "Bonyeza 2 kulipa"],
        "en": ["Welcome", "Press 1 to check balance", "Press 2 to pay"]
    }

    response = voice.say(sayings[lang][0])
    response += voice.getDigits(
        prompt=sayings[lang][1],
        finishOnKey="#",
        callbackUrl="https://yourdomain.com/voice/callback/"
    )
    return HttpResponse(response, content_type="text/xml")