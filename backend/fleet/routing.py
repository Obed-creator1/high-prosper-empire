from django.urls import re_path
from .consumers import FleetConsumer, LiveVehicleConsumer, VehicleTrackingConsumer

websocket_urlpatterns = [
    re_path(r'^ws/fleet/$', FleetConsumer.as_asgi()),
    re_path(r'^ws/vehicle-tracking/$', VehicleTrackingConsumer.as_asgi()),
    re_path(r'^ws/fleet/live/$', LiveVehicleConsumer.as_asgi()),
]
