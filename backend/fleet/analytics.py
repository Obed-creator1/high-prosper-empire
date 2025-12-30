# fleet/analytics.py
from .models import Vehicle, FuelLog, WasteCollection, Route
from django.db.models import Avg, Sum
from datetime import date, timedelta

def fuel_consumption_report(days=30):
    start_date = date.today() - timedelta(days=days)
    logs = FuelLog.objects.filter(date__gte=start_date)
    report = logs.values('vehicle__registration_number').annotate(
        total_fuel=Sum('fuel_amount'),
        avg_fuel_per_day=Avg('fuel_amount')
    )
    return list(report)

def maintenance_alerts():
    vehicles = Vehicle.objects.all()
    alerts = []
    for v in vehicles:
        if v.next_service_due and v.next_service_due <= date.today() + timedelta(days=7):
            alerts.append({
                "vehicle": v.registration_number,
                "next_service_due": v.next_service_due
            })
    return alerts

def oversized_waste_report(days=30):
    start_date = date.today() - timedelta(days=days)
    collections = WasteCollection.objects.filter(date__gte=start_date, oversized=True)
    report = collections.values('vehicle__registration_number').annotate(
        total_oversized=Sum('waste_weight')
    )
    return list(report)

# Route efficiency (simple metric: total distance / optimal distance)
def route_efficiency_report():
    routes = Route.objects.all()
    report = []
    for r in routes:
        # Placeholder for AI predicted optimal distance
        optimal_distance = 10  # in km, replace with AI module
        actual_distance = 12   # placeholder
        efficiency = (optimal_distance / actual_distance) * 100
        report.append({
            "vehicle": r.vehicle.registration_number,
            "date": r.date,
            "efficiency": efficiency
        })
    return report
