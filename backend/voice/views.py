# voice/views.py — Update status callback

from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from payments.models import Invoice
from customers.models import ServiceOrder, Village
from users.models import CustomUser
from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance

@csrf_exempt
def voice_status_callback(request):
    call_status = request.POST.get('CallStatus')
    invoice_uid = request.POST.get('invoice_uid')  # Pass in original call
    invoice = Invoice.objects.get(uid=invoice_uid)

    if call_status in ['failed', 'busy', 'no-answer', 'completed']:  # No payment
        # Auto-route collector
        auto_route_collector_to_overdue(invoice)

    return HttpResponse("OK")