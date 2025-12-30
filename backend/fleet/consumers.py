import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from django.utils import timezone
from channels.db import database_sync_to_async
from .models import Vehicle

class FleetConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Join fleet group
        await self.channel_layer.group_add("fleet_group", self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Leave fleet group
        await self.channel_layer.group_discard("fleet_group", self.channel_name)

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        # Example: { "vehicle_id": 1, "lat": 12.34, "lng": 56.78 }
        await self.channel_layer.group_send(
            "fleet_group",
            {
                "type": "fleet_update",
                "data": data
            }
        )

    # Receive message from group
    async def fleet_update(self, event):
        data = event["data"]
        await self.send(text_data=json.dumps(data))

    async def vehicle_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'vehicle_update',
            'online_count': await database_sync_to_async(Vehicle.objects.filter(status='on_road').count)()
        }))

class VehicleTrackingConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()
        # Optionally, join a fleet group
        await self.channel_layer.group_add("fleet_tracking", self.channel_name)

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("fleet_tracking", self.channel_name)

    # Receive message from WebSocket (from GPS device or frontend)
    async def receive(self, text_data):
        data = json.loads(text_data)
        # Example payload: {"vehicle_id": 1, "lat": -1.944, "lng": 30.061, "status": "active"}
        vehicle_id = data.get("vehicle_id")
        lat = data.get("lat")
        lng = data.get("lng")
        status = data.get("status", "active")

        # Broadcast location to all clients
        await self.channel_layer.group_send(
            "fleet_tracking",
            {
                "type": "fleet_location",
                "vehicle_id": vehicle_id,
                "lat": lat,
                "lng": lng,
                "status": status,
            }
        )

    # Send location to WebSocket
    async def fleet_location(self, event):
        await self.send(text_data=json.dumps(event))

class LiveVehicleConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.accept()

        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": "FLEET OS 2026 – Live Tracking ACTIVE",
            "timestamp": timezone.now().isoformat()
        }))

        # Start live updates
        self.task = asyncio.create_task(self.broadcast_loop())

    async def disconnect(self, close_code):
        if hasattr(self, "task"):
            self.task.cancel()

    async def broadcast_loop(self):
        try:
            while True:
                vehicles = await self.get_live_vehicles()
                await self.send(text_data=json.dumps({
                    "type": "live_update",
                    "vehicles": vehicles,
                    "total": len(vehicles),
                    "timestamp": timezone.now().isoformat()
                }))
                await asyncio.sleep(5)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print("WebSocket error:", e)

    @sync_to_async
    def get_live_vehicles(self):
        # Select only real DB fields + driver_id
        qs = Vehicle.objects.filter(
            lat__isnull=False,
            lng__isnull=False
        ).select_related('driver').values(
            'id',
            'registration_number',
            'lat',
            'lng',
            'status',
            'last_seen',
            'driver_id'  # ← Real ForeignKey field
        )

        vehicles = []
        for v in qs:
            driver_name = ""
            if v['driver_id']:
                # Fetch full_name safely
                driver = Vehicle.objects.filter(id=v['id']).select_related('driver').first()
                driver_name = driver.driver.full_name if driver and driver.driver else "No Driver"

            vehicles.append({
                "id": v['id'],
                "registration_number": v['registration_number'],
                "lat": v['lat'],
                "lng": v['lng'],
                "status": v['status'],
                "last_seen": v['last_seen'],
                "driver": driver_name,
            })

        return vehicles