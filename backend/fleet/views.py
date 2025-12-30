from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import login_required
from django.db.models.functions import TruncDate
from django.shortcuts import render, redirect
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from django.utils import timezone
from .serializers import VehicleSerializer, RepairSerializer, ConsumptionSerializer, VehiclePhotoSerializer, \
    FuelRecordSerializer, MaintenanceRecordSerializer, FuelEfficiencyRecordSerializer, ComplianceSerializer, \
    WorkshopRecordSerializer
import random
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from collections import defaultdict
from django.db.models import Sum, Count, Avg, Max
from datetime import datetime, timedelta
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
import os
from django.conf import settings
from rest_framework import viewsets
from .models import Vehicle, Driver, Branch, Customer, WasteCollection, FuelLog, Route, Repair, Consumption, OilEntry, \
    FuelEntry, VehiclePhoto, MaintenanceRecord, FuelRecord, DriverPerformanceHistory, FuelEfficiencyRecord, Compliance, \
    WorkshopRecord
from .serializers import (
    VehicleSerializer, DriverSerializer, BranchSerializer,
    CustomerSerializer, WasteCollectionSerializer, FuelLogSerializer,
    RouteSerializer
)
from .analytics import fuel_consumption_report, maintenance_alerts, oversized_waste_report, route_efficiency_report
from .predictive_maintenance import predict_vehicle_maintenance
from .route_optimizer import optimize_multi_vehicle_routes, logger
from users.models import CustomUser
from webpush import send_user_notification
from sklearn.linear_model import LinearRegression
import numpy as np
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db.models import Count, Avg, Q
from django.http import JsonResponse
from django.views.decorators.cache import cache_page
import csv
from openpyxl import Workbook
from django.http import HttpResponse
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4

@staff_member_required
def fleet_dashboard_view(request):
    stats = [
        {"label": "Total Vehicles", "value": Vehicle.objects.count()},
        {"label": "Active/On Road", "value": Vehicle.objects.filter(status__in=['active', 'on_road']).count()},
        {"label": "In Workshop", "value": Vehicle.objects.filter(status='workshop').count()},
        {"label": "Compliance Expired", "value": Compliance.objects.filter(expiry_date__lt=timezone.now()).count()},
    ]

    alerts = [
        {"title": "EXPIRED", "count": Compliance.objects.filter(expiry_date__lt=timezone.now()).count(), "bg": "bg-red-100", "text": "text-red-800"},
        {"title": "Critical (≤5 days)", "count": Compliance.objects.filter(expiry_date__gte=timezone.now(), expiry_date__lte=timezone.now()+timedelta(days=5)).count(), "bg": "bg-orange-100", "text": "text-orange-800"},
    ]

    return render(request, 'admin/fleet/dashboard.html', {
        'title': 'Fleet Dashboard',
        'stats': stats,
        'alerts': alerts,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def fleet_dashboard_summary(request):
    # Vehicle Stats – SAFE
    total = Vehicle.objects.count()
    active = Vehicle.objects.filter(status='active').count()
    on_road = Vehicle.objects.filter(status='on_road').count()
    workshop = Vehicle.objects.filter(status='workshop').count()
    standby = Vehicle.objects.filter(status='standby').count()

    # Build status map safely
    status_stats = Vehicle.objects.values('status').annotate(count=Count('id'))
    status_map = {item['status']: item['count'] for item in status_stats}

    # Compliance Stats – WORKS EVEN WITHOUT 'status' FIELD
    expired = critical = warning = valid = 0
    expiring_soon = 0

    today = timezone.now().date()
    thirty_days = today + timedelta(days=30)

    # Use the model's built-in method – always correct
    for comp in Compliance.objects.select_related('vehicle').iterator():
        days_left = comp.days_left()
        if days_left < 0:
            expired += 1
        elif days_left <= 5:
            critical += 1
        elif days_left <= 30:
            warning += 1
        else:
            valid += 1

    expiring_soon = Compliance.objects.filter(
        expiry_date__gte=today,
        expiry_date__lte=thirty_days
    ).count()

    # Fuel Efficiency – SAFE
    fuel_agg = FuelEfficiencyRecord.objects.aggregate(avg=Avg('km_per_liter'))
    avg_fuel = round(fuel_agg['avg'] or 0.0, 2)

    # Utilization Rate
    active_total = status_map.get('active', 0) + status_map.get('on_road', 0)
    utilization_percent = round((active_total / total * 100), 1) if total > 0 else 0.0

    return Response({
        "summary": {
            "total_vehicles": total,
            "active": active_total,
            "on_road": on_road,
            "workshop": workshop,
            "standby": standby,
            "utilization_rate": utilization_percent,
            "utilization_percent": utilization_percent
        },
        "compliance": {
            "expired": expired,
            "critical": critical,
            "warning": warning,
            "valid": valid,
            "expiring_soon": expiring_soon,
        },
        "fuel_efficiency_avg": avg_fuel,
        "fuel_efficiency_avg_km_l": avg_fuel,
        "workshop_active": workshop,
        "chart_data": {
            "labels": ["Active", "On Road", "Workshop", "Standby"],
            "data": [
                status_map.get('active', 0) + status_map.get('on_road', 0),
                on_road,
                workshop,
                standby
            ]
        }
    })


@api_view(['GET'])
def export_vehicles(request, format=None):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="vehicles.csv"'

    writer = csv.writer(response)
    writer.writerow(['Reg No', 'Brand', 'Type', 'Status', 'BDM', 'Year', 'Status'])

    for v in Vehicle.objects.all():
        writer.writerow([v.registration_number, v.brand, v.vehicle_type, v.get_status_display(), v.bdm_kg, v.manufacture_year, v.status])

    return response

class FuelEfficiencyViewSet(viewsets.ModelViewSet):
    queryset = FuelEfficiencyRecord.objects.select_related('vehicle').all()
    serializer_class = FuelEfficiencyRecordSerializer
    filterset_fields = ['vehicle__registration_number', 'date']
    search_fields = ['vehicle__registration_number']


def notify_top_drivers():
    top_3 = DriverPerformanceHistory.objects.filter(
        month=timezone.now().strftime("%Y-%m")
    ).order_by("-score")[:3]

    for record in top_3:
        user = record.driver.user
        payload = {
            "head": "🎉 Congratulations!",
            "body": f"You are ranked #{record.driver.id} this month with a score of {record.score}!",
            "icon": "/icons/trophy.png",
        }
        send_user_notification(user=user, payload=payload, ttl=1000)


# ==================== FUEL EFFICIENCY – FULL CRUD ====================
class FuelEfficiencyRecordViewSet(viewsets.ModelViewSet):
    """
    Full CRUD: List, Create, Retrieve, Update, Delete Fuel Records
    Drivers & Fleet Managers can POST new fuel entries
    """
    queryset = FuelEfficiencyRecord.objects.select_related('vehicle', 'filled_by').all().order_by('-date')
    serializer_class = FuelEfficiencyRecordSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vehicle__registration_number']
    ordering_fields = ['date', 'km_per_liter']

    def perform_create(self, serializer):
        """Auto-set filled_by = current user"""
        serializer.save(filled_by=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        stats = self.get_queryset().aggregate(
            avg_km_l=Avg('km_per_liter'),
            total_liters=Sum('liters'),
            total_cost=Sum('cost'),
            total_distance=Sum('distance_km')
        )
        return Response({
            "average_km_per_liter": round(stats['avg_km_l'] or 0, 2),
            "total_liters": float(stats['total_liters'] or 0),
            "total_cost_rm": float(stats['total_cost'] or 0),
            "total_distance_km": float(stats['total_distance'] or 0),
        })


# ==================== COMPLIANCE – CREATE & UPDATE ====================
class ComplianceViewSet(viewsets.ModelViewSet):
    """
    POST to upload new compliance documents (Insurance, Puspakom, etc.)
    """
    queryset = Compliance.objects.select_related('vehicle').all()
    serializer_class = ComplianceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['compliance_type', 'vehicle__registration_number']

    def perform_create(self, serializer):
        # Auto-recalculate expiry status
        serializer.save()

    @action(detail=False, methods=['get'])
    def alerts(self, request):
        """Same as your previous compliance_alerts_view – now as action"""
        return compliance_alerts_view(request)  # reuse logic


# ==================== WORKSHOP RECORD – CREATE FROM FIELD ====================
class WorkshopRecordViewSet(viewsets.ModelViewSet):
    """
    Mechanics & Managers can POST new workshop entries
    """
    queryset = WorkshopRecord.objects.select_related('vehicle', 'mechanic').all()
    serializer_class = WorkshopRecordSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'vehicle__registration_number']

    def perform_create(self, serializer):
        # Auto-assign mechanic if user is mechanic
        if self.request.user.role == 'mechanic':
            serializer.save(mechanic=self.request.user)
        else:
            serializer.save()

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark as completed + add cost"""
        record = self.get_object()
        record.status = 'completed'
        record.date_out = timezone.now().date()
        record.cost = request.data.get('cost', record.cost)
        record.save()
        return Response({"message": "Workshop record completed"}, status=status.HTTP_200_OK)


# ==================== COMPLIANCE ALERTS VIEW ====================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compliance_alerts_view(request):
    """
    Returns compliance items grouped by urgency:
    - expired
    - expires_in_5_days
    - expires_in_15_days
    - expires_in_30_days
    """
    today = timezone.now().date()
    five_days = today + timedelta(days=5)
    fifteen_days = today + timedelta(days=15)
    thirty_days = today + timedelta(days=30)

    alerts = {
        "expired": [],
        "critical_5_days": [],
        "warning_15_days": [],
        "upcoming_30_days": [],
        "total_expired": 0,
        "total_critical": 0,
    }

    compliances = Compliance.objects.select_related('vehicle').all()

    for c in compliances:
        days_left = (c.expiry_date - today).days
        item = {
            "id": c.id,
            "registration_number": c.vehicle.registration_number,
            "type": c.get_compliance_type_display(),
            "expiry_date": c.expiry_date,
            "days_left": days_left,
            "document_url": c.document.url if c.document else None,
        }

        if days_left < 0:
            alerts["expired"].append(item)
            alerts["total_expired"] += 1
        elif days_left <= 5:
            alerts["critical_5_days"].append(item)
            alerts["total_critical"] += 1
        elif days_left <= 15:
            alerts["warning_15_days"].append(item)
        elif days_left <= 30:
            alerts["upcoming_30_days"].append(item)

    return Response(alerts, status=status.HTTP_200_OK)

@api_view(['POST'])
def optimize_route_api(request):
    """
    Multi-Vehicle Route Optimization API

    Expected Payload:
    {
        "depots": [[lat, lng], ...],                  # Starting points (one per vehicle)
        "locations": [                                # Customer stops
            {"lat": -1.2864, "lng": 36.8172, "demand": 5, "id": "C001"},
            {"lat": -1.3000, "lng": 36.8000, "demand": 3, "id": "C002"},
            ...
        ],
        "num_vehicles": 3,                            # Optional: defaults to len(depots)
        "vehicle_capacity": [20, 15, 15]              # Optional: per-vehicle or single int
    }

    Returns:
    {
        "routes": [
            {
                "vehicle": 1,
                "route": [0, 3, 1],                  # indices in locations list
                "distance_km": 45.2,
                "stops": 3
            },
            ...
        ]
    }
    """
    data = request.data

    depots = data.get("depots", [])
    locations = data.get("locations", [])
    num_vehicles = data.get("num_vehicles")
    vehicle_capacity = data.get("vehicle_capacity")

    if not depots:
        return Response({"error": "At least one depot required"}, status=status.HTTP_400_BAD_REQUEST)

    if not locations:
        return Response({"error": "No delivery locations provided"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        routes = optimize_multi_vehicle_routes(
            depots=depots,
            locations=locations,
            num_vehicles=num_vehicles,
            vehicle_capacity=vehicle_capacity
        )

        return Response({
            "success": True,
            "num_vehicles": len(routes),
            "total_stops": sum(r['stops'] for r in routes),
            "routes": routes
        })

    except Exception as e:
        logger.error(f"Route optimization failed: {e}")
        return Response(
            {"error": "Optimization failed", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class PredictMaintenanceView(APIView):
    def get(self, request, vehicle_id):
        vehicle = Vehicle.objects.get(id=vehicle_id)
        latest_fuel_log = FuelLog.objects.filter(vehicle=vehicle).order_by('-date').first()
        if not latest_fuel_log:
            return Response({"prediction": False})
        prediction = predict_vehicle_maintenance(
            vehicle.id,
            latest_fuel_log.fuel_amount,
            latest_fuel_log.odometer_reading
        )
        return Response({"vehicle": vehicle.registration_number, "needs_service": prediction})

class FleetAnalyticsView(APIView):
    def get(self, request):
        fuel_report = fuel_consumption_report()
        maintenance = maintenance_alerts()
        oversized_waste = oversized_waste_report()
        route_efficiency = route_efficiency_report()
        return Response({
            "fuel_report": fuel_report,
            "maintenance_alerts": maintenance,
            "oversized_waste": oversized_waste,
            "route_efficiency": route_efficiency
        })

class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.select_related(
        "user", "assigned_vehicle"  # ← ONLY real ForeignKeys
    ).prefetch_related(
        "assigned_vehicle__fuel_efficiency",
        "assigned_vehicle__maintenance_records"
    ).all()
    serializer_class = DriverSerializer
    permission_classes = [IsAuthenticated]

    # ===================================================================
    # 1. LEADERBOARD – TOP 50 DRIVERS (Cached + Monthly History)
    # ===================================================================
    @action(detail=False, methods=['get'], url_path='leaderboard')
    def leaderboard(self, request):
        current_month = timezone.now().strftime("%Y-%m")
        cache_key = f"driver_leaderboard_{current_month}"
        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        drivers_data = []

        # Pre-calculate max values
        max_collections = (
                WasteCollection.objects
                .filter(date__year=timezone.now().year, date__month=timezone.now().month)
                .values('driver')
                .annotate(collections=Count('id'))
                .aggregate(max_c=Max('collections'))['max_c'] or 1
        )

        max_fuel_result = FuelEfficiencyRecord.objects.filter(
            vehicle__driver__isnull=False
        ).values('vehicle__driver').annotate(
            total_liters=Sum('liters')
        ).aggregate(max_f=Max('total_liters'))

        max_fuel = float(max_fuel_result['max_f'] or 1)  # ← CONVERT TO FLOAT

        drivers = self.get_queryset()

        for driver in drivers:
            collections = WasteCollection.objects.filter(
                driver=driver,
                date__year=timezone.now().year,
                date__month=timezone.now().month
            ).count()

        total_fuel = FuelEfficiencyRecord.objects.filter(
            vehicle=driver.assigned_vehicle
        ).aggregate(t=Sum('liters'))['t'] or 0

        rating = float(driver.rating or 0)

        # Normalize
        score_collections = (collections / max_collections) * 100
        score_fuel = 100 - ((total_fuel / max_fuel) * 100) if max_fuel else 100
        score_rating = (rating / 5.0) * 100

        performance_score = round(
            0.40 * score_collections +
            0.35 * score_fuel +
            0.25 * score_rating,
            2
        )

        # Save history
        DriverPerformanceHistory.objects.update_or_create(
            driver=driver,
            month=current_month,
            defaults={
                "score": performance_score,
                "collections": collections,
                "fuel": float(total_fuel),
                "rating": rating,
            }
        )

        # SAFE ACCESS — brand and model are strings!
        vehicle = driver.assigned_vehicle
        brand_name = vehicle.brand if vehicle else "N/A"
        model_name = vehicle.model if vehicle else "N/A"
        reg_number = vehicle.registration_number if vehicle else "No Vehicle"

        drivers_data.append({
            "id": driver.id,
            "full_name": driver.full_name,
            "phone": driver.phone,
            "profile_picture": driver.profile_picture.url if driver.profile_picture else None,
            "vehicle": reg_number,
            "brand": brand_name,
            "model": model_name,
            "score": performance_score,
            "collections": collections,
            "fuel_consumed": round(total_fuel, 1),
            "rating": round(rating, 1),
        })

        # Rank
        drivers_data.sort(key=lambda x: x["score"], reverse=True)
        for i, d in enumerate(drivers_data):
            d["rank"] = i + 1

        result = drivers_data[:50]
        cache.set(cache_key, result, timeout=300)

        return Response(result)


    # ===================================================================
    # 2. ALL DRIVER PERFORMANCE (No ranking)
    # ===================================================================
    @action(detail=False, methods=['get'], url_path='performance')
    def driver_performance(self, request):
        data = []
        for driver in self.get_queryset():
            data.append({
                "id": driver.id,
                "full_name": driver.full_name,
                "collections": WasteCollection.objects.filter(driver=driver).count(),
                "fuel_consumed": float(FuelEfficiencyRecord.objects.filter(vehicle=driver.assigned_vehicle).aggregate(t=Sum('liters'))['t'] or 0),
                "maintenance_count": MaintenanceRecord.objects.filter(vehicle=driver.assigned_vehicle).count(),
                "rating": round(float(driver.rating or 0), 1),
            })
        return Response(data)

    # ===================================================================
    # 3. AVAILABLE DRIVERS (Not assigned to any vehicle)
    # ===================================================================
    @action(detail=False, methods=['get'], url_path='available')
    def available_drivers(self, request):
        available = self.get_queryset().filter(assigned_vehicle__isnull=True)
        serializer = self.get_serializer(available, many=True)
        return Response(serializer.data)

    # ===================================================================
    # 4. SYNC DRIVERS FROM HR (CustomUser → Driver)
    # ===================================================================
    @action(detail=False, methods=['post'], url_path='sync')
    def sync_hr_drivers(self, request):
        from users.models import CustomUser  # Adjust import path
        created, skipped = 0, 0
        for user in CustomUser.objects.filter(role="driver"):
            if not hasattr(user, "driver"):
                Driver.objects.create(
                    user=user,
                    license_number="N/A",
                    license_expiry=timezone.now() + timedelta(days=365)
                )
                created += 1
            else:
                skipped += 1
        return Response({"created": created, "skipped": skipped})

    # ===================================================================
    # 5. PERFORMANCE TREND (Monthly history for one driver)
    # ===================================================================
    @action(detail=True, methods=['get'], url_path='performance-trend')
    def performance_trend(self, request, pk=None):
        driver = self.get_object()
        history = DriverPerformanceHistory.objects.filter(driver=driver).order_by("month")
        data = [
            {
                "month": h.month,
                "score": float(h.score),
                "collections": h.collections,
                "fuel": float(h.fuel),
                "maintenance": h.maintenance,
                "rating": float(h.rating),
            }
            for h in history
        ]
        return Response(data)

class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

class WasteCollectionViewSet(viewsets.ModelViewSet):
    queryset = WasteCollection.objects.all()
    serializer_class = WasteCollectionSerializer

class FuelLogViewSet(viewsets.ModelViewSet):
    queryset = FuelLog.objects.all()
    serializer_class = FuelLogSerializer

class RouteViewSet(viewsets.ModelViewSet):
    queryset = Route.objects.all()
    serializer_class = RouteSerializer


class VehiclePhotoDeleteView(APIView):
    def delete(self, request, pk):
        photo = get_object_or_404(VehiclePhoto, pk=pk)

        # Delete the file from media storage
        if photo.image and os.path.isfile(photo.image.path):
            os.remove(photo.image.path)

        photo.delete()
        return Response({"message": "Photo deleted successfully."}, status=status.HTTP_204_NO_CONTENT)

@api_view(["DELETE"])
def delete_vehicle_photo(request, photo_id):
    try:
        photo = VehiclePhoto.objects.get(id=photo_id)
        photo.image.delete(save=False)  # Delete the file from storage
        photo.delete()                  # Delete the DB record
        return Response({"message": "Photo deleted successfully"}, status=status.HTTP_200_OK)
    except VehiclePhoto.DoesNotExist:
        return Response({"error": "Photo not found"}, status=status.HTTP_404_NOT_FOUND)


# Helper to aggregate monthly stats
def monthly_aggregation(entries):
    stats = {}
    for entry in entries:
        month = entry.date.strftime("%b")  # e.g., Jan, Feb
        if month not in stats:
            stats[month] = {"month": month, "liters": 0, "cost": 0}
        stats[month]["liters"] += entry.liters
        stats[month]["cost"] += entry.cost
    # Return as a sorted list by month
    months_order = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    return [stats[m] for m in months_order if m in stats]

@api_view(['GET'])
def fuel_stats(request):
    entries = FuelEntry.objects.all()
    data = monthly_aggregation(entries)
    return Response(data)

@api_view(['GET'])
def oil_stats(request):
    entries = OilEntry.objects.all()
    data = monthly_aggregation(entries)
    return Response(data)

def broadcast_vehicle_location(vehicle_id, lat, lng):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "vehicles",
        {
            "type": "vehicle_update",
            "data": {
                "vehicle_id": vehicle_id,
                "lat": lat,
                "lng": lng
            }
        }
    )


def notify_fleet_update(vehicle):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "fleet_updates",
        {
            "type": "fleet_update",
            "data": {
                "id": vehicle.id,
                "plate_number": vehicle.plate_number,
                "brand": vehicle.brand,
                "model_name": vehicle.model_name,
                "status": vehicle.status,
                "lat": getattr(vehicle, "lat", None),
                "lng": getattr(vehicle, "lng", None),
            },
        },
    )


# ---------------- Vehicle Management ----------------
class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer
    permission_classes = [permissions.IsAuthenticated]  # ✅ Add this

    @action(detail=True, methods=["post"], url_path="fuel")
    def add_fuel_record(self, request, pk=None):
        vehicle = self.get_object()
        serializer = FuelRecordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(vehicle=vehicle)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"], url_path="maintenance")
    def add_maintenance(self, request, pk=None):
        vehicle = self.get_object()
        serializer = MaintenanceRecordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(vehicle=vehicle)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Optional endpoint to update GPS position
    @action(detail=True, methods=["patch"])
    def update_location(self, request, pk=None):
        vehicle = self.get_object()
        vehicle.lat = request.data.get("lat", vehicle.lat)
        vehicle.lng = request.data.get("lng", vehicle.lng)
        vehicle.save()
        return Response(self.get_serializer(vehicle).data)

    def update(self, request, *args, **kwargs):
        partial = True  # allow partial updates
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["get"], url_path="reports/fuel")
    def fuel_report(self, request, pk=None):
        vehicle = self.get_object()
        data = (
            FuelRecord.objects.filter(vehicle=vehicle)
            .annotate(day=TruncDate("date"))
            .values("day")
            .annotate(
                total_liters=Sum("liters"),
                total_cost=Sum("cost"),
            )
            .order_by("day")
        )
        return Response(data)

    @action(detail=True, methods=["get"], url_path="reports/maintenance")
    def maintenance_report(self, request, pk=None):
        vehicle = self.get_object()
        data = (
            MaintenanceRecord.objects.filter(vehicle=vehicle)
            .annotate(day=TruncDate("date"))
            .values("day", "maintenance_type")
            .annotate(cost=Sum("cost"))
            .order_by("day")
        )
        return Response(data)

    @action(detail=True, methods=["post"], url_path="assign_driver")
    def assign_driver(self, request, pk=None):
        vehicle = self.get_object()
        driver_id = request.data.get("driver_id")

        try:
            driver = Driver.objects.select_related("user").get(id=driver_id)
        except Driver.DoesNotExist:
            return Response({"error": "Driver not found."}, status=status.HTTP_404_NOT_FOUND)

        # Clear previous assignment
        if driver.assigned_vehicle and driver.assigned_vehicle != vehicle:
            driver.assigned_vehicle = None
            driver.save()

        driver.assigned_vehicle = vehicle
        driver.save()

        return Response(
            {
                "message": f"Driver {driver.full_name} ({driver.user.phone}) assigned to {vehicle.registration_number}.",
                "vehicle": VehicleSerializer(vehicle).data,
                "driver": DriverSerializer(driver).data,
            },
            status=status.HTTP_200_OK,
        )


class RepairViewSet(viewsets.ModelViewSet):
    queryset = Repair.objects.all()
    serializer_class = RepairSerializer


class ConsumptionViewSet(viewsets.ModelViewSet):
    queryset = Consumption.objects.all()
    serializer_class = ConsumptionSerializer


# ---------------- Monthly Consumption ----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def monthly_consumption(request):
    """
    Returns monthly fuel & oil consumption for chart
    """
    now = timezone.now()
    months = [now.replace(month=m, day=1) for m in range(1, 13)]
    data = []

    for month_date in months:
        month_repairs = Repair.objects.filter(date__month=month_date.month, date__year=month_date.year)
        total_fuel = month_repairs.aggregate(total=Sum('cost'))['total'] or 0  # example as cost
        total_oil = month_repairs.aggregate(total=Sum('cost'))['total'] or 0
        data.append({
            "month": month_date.strftime("%b"),
            "fuel": float(total_fuel),
            "oil": float(total_oil)
        })

    return Response(data)

# ---------------- Live Vehicle Locations (GPS) ----------------
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def vehicle_locations(request):
    vehicles = Vehicle.objects.all()
    data = []
    for v in vehicles:
        # For demo, generate random lat/lng around Kigali
        lat = -1.95 + random.uniform(-0.05, 0.05)
        lng = 30.05 + random.uniform(-0.05, 0.05)
        data.append({
            "id": v.id,
            "plate_number": v.plate_number,
            "brand": v.brand,
            "model_name": v.model_name,
            "status": v.status,
            "lat": lat,
            "lng": lng,
        })
    return Response(data)

# ---------------- Consumption Statistics ----------------
@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def consumption_stats(request):
    # Demo: random daily consumption data
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    data = []
    for day in days:
        data.append({
            "day": day,
            "fuel": random.randint(100, 500),
            "oil": random.randint(10, 100),
            "tools": random.randint(5, 50),
        })
    return Response(data)




def index(request):
    vehicles = Vehicle.objects.all()
    return render(request, 'fleet/index.html', {'vehicles': vehicles})

@login_required
def vehicle_list(request):
    """Vehicle list view"""
    vehicles = Vehicle.objects.all()
    context = {'vehicles': vehicles}
    return render(request, 'fleet/vehicle_list.html', context)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_vehicle_location(request, vehicle_id):
    """
    Vehicle or admin can update GPS coordinates.
    Expects: { "lat": float, "lng": float }
    """
    try:
        vehicle = Vehicle.objects.get(id=vehicle_id)
    except Vehicle.DoesNotExist:
        return Response({"error": "Vehicle not found"}, status=404)

    lat = request.data.get("lat")
    lng = request.data.get("lng")
    if lat is None or lng is None:
        return Response({"error": "lat and lng required"}, status=400)

    vehicle.lat = lat
    vehicle.lng = lng
    vehicle.save(update_fields=["lat", "lng"])

    # Broadcast to WebSocket group
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "fleet_group",
        {
            "type": "fleet_update",
            "data": {
                "vehicle_id": vehicle.id,
                "plate_number": vehicle.plate_number,
                "lat": vehicle.lat,
                "lng": vehicle.lng,
            },
        },
    )

    return Response(VehicleSerializer(vehicle).data)


# ---------------- Update Vehicle GPS ----------------
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_vehicle_gps(request):
    """
    Update vehicle latitude and longitude
    body: { vehicle_id: int, lat: float, lng: float }
    """
    data = request.data
    vehicle_id = data.get("vehicle_id")
    lat = data.get("lat")
    lng = data.get("lng")

    if not all([vehicle_id, lat, lng]):
        return Response({"error": "vehicle_id, lat, lng are required"}, status=400)

    try:
        vehicle = Vehicle.objects.get(id=vehicle_id)
        vehicle.lat = lat
        vehicle.lng = lng
        vehicle.last_updated = timezone.now()
        vehicle.save(update_fields=["lat", "lng", "last_updated"])
        return Response({"status": "ok"})
    except Vehicle.DoesNotExist:
        return Response({"error": "Vehicle not found"}, status=404)


# ---------------- Get All Vehicle Positions ----------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_vehicle_positions(request):
    """
    Return all vehicle positions with id, plate_number, lat, lng
    """
    vehicles = Vehicle.objects.all().values("id", "plate_number", "lat", "lng", "status")
    return Response(list(vehicles))


class VehiclePhotoViewSet(viewsets.ModelViewSet):
    queryset = VehiclePhoto.objects.all()
    serializer_class = VehiclePhotoSerializer

    def list(self, request, *args, **kwargs):
            queryset = self.get_queryset()
            serializer = VehiclePhotoSerializer(queryset, many=True, context={'request': request})
            return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        vehicle_id = request.query_params.get("vehicle_pk")
        vehicle = get_object_or_404(Vehicle, pk=vehicle_id)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(vehicle=vehicle)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class VehiclePhotoUploadView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
            vehicle_id = request.data.get("vehicle")
            if not vehicle_id:
                return Response({"error": "Vehicle ID is required"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                vehicle = Vehicle.objects.get(id=vehicle_id)
            except Vehicle.DoesNotExist:
                return Response({"error": "Vehicle not found"}, status=status.HTTP_404_NOT_FOUND)

            # 'images' can be multiple files
            files = request.FILES.getlist("images")
            if not files:
                return Response({"error": "No images uploaded"}, status=status.HTTP_400_BAD_REQUEST)

            photos = []
            for file in files:
                photo = VehiclePhoto(vehicle=vehicle, image=file)
                photo.save()
                photos.append(VehiclePhotoSerializer(photo).data)

            return Response({"uploaded_photos": photos}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
def driver_branch_analytics(request):
    branches = Driver.objects.values_list("branch__name", flat=True).distinct()
    analytics = []
    for branch_name in branches:
        branch_drivers = Driver.objects.filter(branch__name=branch_name)
        avg_score = DriverPerformanceHistory.objects.filter(driver__in=branch_drivers).aggregate(avg=Avg("score"))["avg"] or 0
        analytics.append({
            "branch": branch_name,
            "average_score": round(avg_score, 2),
            "driver_count": branch_drivers.count()
        })
    return Response(analytics)

@api_view(["GET"])
def predict_driver_performance(request, driver_id):
    history = DriverPerformanceHistory.objects.filter(driver_id=driver_id).order_by("month")
    if len(history) < 3:
        return Response({"error": "Not enough data to predict"}, status=400)

    months = np.array(range(len(history))).reshape(-1, 1)
    scores = np.array([h.score for h in history])

    model = LinearRegression()
    model.fit(months, scores)
    next_month_score = model.predict(np.array([[len(history)]]))[0]

    return Response({
        "driver_id": driver_id,
        "predicted_next_score": round(float(next_month_score), 2)
    })