# fleet/urls.py – FLEET OS 2026 FINAL URLS (December 2025)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    VehicleViewSet, RepairViewSet, ConsumptionViewSet,
    VehiclePhotoViewSet, DriverViewSet, BranchViewSet,
    CustomerViewSet, WasteCollectionViewSet, FuelLogViewSet,
    RouteViewSet, FuelEfficiencyRecordViewSet, ComplianceViewSet,
    WorkshopRecordViewSet, VehiclePhotoUploadView, VehiclePhotoDeleteView,
    FleetAnalyticsView, PredictMaintenanceView, optimize_route_api,
    export_vehicles, fleet_dashboard_summary, compliance_alerts_view,
    fleet_dashboard_view
)

app_name = 'fleet'

# === ROUTER – ALL CRUD ENDPOINTS ===
router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'repairs', RepairViewSet, basename='repair')
router.register(r'consumption', ConsumptionViewSet, basename='consumption')
router.register(r'vehicle-photos', VehiclePhotoViewSet, basename='vehiclephoto')
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'branches', BranchViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'waste-collections', WasteCollectionViewSet)
router.register(r'fuel-logs', FuelLogViewSet)
router.register(r'routes', RouteViewSet)
router.register(r'fuel-efficiency', FuelEfficiencyRecordViewSet, basename='fuel-efficiency')
router.register(r'compliance', ComplianceViewSet, basename='compliance')
router.register(r'workshop-records', WorkshopRecordViewSet, basename='workshop-record')

# === CUSTOM API ENDPOINTS ===
urlpatterns = [

    # Dashboard & Analytics
    path('dashboard-summary/', fleet_dashboard_summary, name='dashboard-summary'),
    path('compliance-alerts/', compliance_alerts_view, name='compliance-alerts'),
    path('fleet-dashboard/', fleet_dashboard_view, name='fleet-dashboard'),

    # GPS & Real-time
    path('vehicle-locations/', views.vehicle_locations, name='vehicle-locations'),
    path('positions/', views.all_vehicle_positions, name='vehicle-positions'),
    path('update-gps/', views.update_vehicle_gps, name='update-gps'),
    path('vehicles/<int:vehicle_id>/update-location/', views.update_vehicle_location, name='vehicle-update-location'),

    # Stats & Reports
    path('consumption-stats/', views.consumption_stats, name='consumption-stats'),
    path('consumption/', views.monthly_consumption, name='monthly-consumption'),
    path('fuel-stats/', views.fuel_stats, name='fuel-stats'),
    path('oil-stats/', views.oil_stats, name='oil-stats'),

    # AI & Optimization
    path('analytics/', FleetAnalyticsView.as_view(), name='fleet-analytics'),
    path('predict-maintenance/<int:vehicle_id>/', PredictMaintenanceView.as_view(), name='predict-maintenance'),
    path('optimize-route/', optimize_route_api, name='optimize-route'),

    # Photo Upload/Delete
    path('upload-photo/', VehiclePhotoUploadView.as_view(), name='vehicle-photo-upload'),
    path('delete-photo/<int:pk>/', VehiclePhotoDeleteView.as_view(), name='vehicle-photo-delete'),

    # Export
    path('export/vehicles/<str:format>/', export_vehicles, name='export-vehicles'),

    # Include ALL router URLs — ONLY ONCE!
    path('', include(router.urls)),
]