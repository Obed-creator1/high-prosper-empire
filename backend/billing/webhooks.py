# backend/billing/webhooks.py
from datetime import datetime

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
import stripe
import json

from high_prosper import settings

from .models import Subscription


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META['HTTP_STRIPE_SIGNATURE']
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except:
        return HttpResponse(status=400)

    if event['type'] == 'customer.subscription.updated':
        sub = event['data']['object']
        subscription = Subscription.objects.get(stripe_subscription_id=sub['id'])
        subscription.status = sub['status']
        subscription.current_period_end = datetime.fromtimestamp(sub['current_period_end'])
        subscription.save()

    elif event['type'] == 'invoice.payment_succeeded':
        invoice = event['data']['object']
        # Record usage or unlock features

    return HttpResponse(status=200)