# drones/views.py
import requests
from flask import Response

from payments.models import Payment



@api_view(['POST'])
def dispatch_receipt_drone(request):
    payment = Payment.objects.get(id=request.data['payment_id'])

    drone = Drone.objects.filter(
        current_village=payment.customer.village,
        status="idle"
    ).first()

    drone.payload = f"Receipt-{payment.reference}.pdf"
    drone.drop_coordinates = payment.customer.gps_coordinates
    drone.status = "en_route"
    drone.save()

    # Real drone API (Zipline / Swoop Aero)
    requests.post("https://api.zipline.rw/dispatch", json={
        "drop_lat": drone.drop_coordinates.lat,
        "drop_lng": drone.drop_coordinates.lng,
        "payload": drone.payload
    })

    return Response({"status": "Drone dispatched — ETA 18 minutes"})