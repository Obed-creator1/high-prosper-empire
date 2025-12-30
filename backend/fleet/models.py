# backend/fleet/models.py  ← FINAL VERSION 2025-2026

from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from users.models import CustomUser
from django.contrib.postgres.fields import ArrayField


class Vehicle(models.Model):
    VEHICLE_TYPES = [
        ('truck', 'Truck'), ('van', 'Van'), ('pickup', 'Pickup'),
        ('bus', 'Bus'), ('trailer', 'Trailer'), ('special', 'Special Purpose')
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('on_road', 'On Road'),
        ('workshop', 'In Workshop'),
        ('standby', 'On Standby'),
        ('maintenance', 'Scheduled Maintenance'),
        ('retired', 'Retired/Decommissioned'),
    ]

    registration_number = models.CharField(max_length=20, unique=True, db_index=True)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES)
    brand = models.CharField(max_length=100, default="Unknown")  # ← String
    model = models.CharField(max_length=100, default="Unknown")
    manufacture_year = models.PositiveIntegerField()
    registration_date = models.DateField()
    bdm_kg = models.DecimalField("BDM (kg)", max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    chassis_number = models.CharField(max_length=50, unique=True)
    engine_number = models.CharField(max_length=50)
    purchase_date = models.DateField(default=timezone.now)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    current_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    odometer_reading = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Current odometer (km)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active', db_index=True)
    photo = models.ImageField(upload_to="vehicles/main/", null=True, blank=True)
    notes = models.TextField(blank=True)
    damage_photo = models.ImageField(upload_to="damage_inspection/", null=True, blank=True)
    damage_report = models.TextField(blank=True)
    damage_detected = models.BooleanField(default=False)
    damage_confidence = models.FloatField(null=True, blank=True)

    # GPS Real-time
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.registration_number} | {self.brand} {self.model}"

    @property
    def last_seen(self):
        return self.last_location_update or self.updated_at

    class Meta:
        ordering = ['-registration_date']
        permissions = [
            ("can_view_fleet_dashboard", "Can view fleet analytics dashboard"),
            ("can_export_fleet_data", "Can export fleet reports"),
            ("can_manage_workshop", "Can manage workshop records"),
        ]

class FuelEfficiencyRecord(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuel_efficiency")
    date = models.DateField(default=timezone.now)
    start_odometer = models.DecimalField(max_digits=12, decimal_places=2)
    end_odometer = models.DecimalField(max_digits=12, decimal_places=2)
    liters = models.DecimalField(max_digits=8, decimal_places=2)
    cost = models.DecimalField(max_digits=12, decimal_places=2)
    filled_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    remarks = models.TextField(blank=True)

    # Auto-calculated
    distance_km = models.DecimalField(max_digits=10, decimal_places=2, editable=False)
    km_per_liter = models.DecimalField(max_digits=6, decimal_places=2, editable=False)
    cost_per_km = models.DecimalField(max_digits=8, decimal_places=3, editable=False)

    def save(self, *args, **kwargs):
        self.distance_km = self.end_odometer - self.start_odometer
        self.km_per_liter = round(self.distance_km / self.liters, 2) if self.liters > 0 else 0
        self.cost_per_km = round(self.cost / self.distance_km, 3) if self.distance_km > 0 else 0
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.vehicle} – {self.km_per_liter} km/L"


class Compliance(models.Model):
    COMPLIANCE_TYPES = [
        ('puspakom', 'Puspakom'), ('insurance', 'Insurance'), ('inspection', 'Vehicle Inspection'),
        ('lpkp', 'LPKP'), ('road_tax', 'Road Tax'), ('traffic_fine', 'Traffic Fine Clearance'),
        ('burnel_transit', 'Burnel Transit'), ('burnel_interstate', 'Burnel Interstate'),
    ]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="compliances")
    compliance_type = models.CharField(max_length=30, choices=COMPLIANCE_TYPES)
    issue_date = models.DateField()
    expiry_date = models.DateField(db_index=True)
    document = models.FileField(upload_to="compliance/", null=True, blank=True)
    reminder_sent = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ('vehicle', 'compliance_type')
        ordering = ['expiry_date']

    def days_left(self):
        """Safely calculate days until expiry — handles None"""
        if self.expiry_date is None:
            return None  # or return "Not set"
        return (self.expiry_date - timezone.now().date()).days

    def status(self):
        """Return compliance status safely"""
        if self.expiry_date is None:
           return "not_set"

        days = self.days_left()
        if days < 0:
            return "expired"
        if days <= 5:
            return "critical"
        if days <= 30:
            return "warning"
        return "valid"

    def __str__(self):
        return f"{self.vehicle} – {self.get_compliance_type_display()} ({self.expiry_date})"


class WorkshopRecord(models.Model):
    STATUS_CHOICES = [('pending', 'Pending'), ('in_progress', 'In Progress'), ('completed', 'Completed')]

    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="workshop_history")
    date_in = models.DateField(default=timezone.now)
    time_in = models.TimeField(default=timezone.now)
    location = models.CharField(max_length=200)
    issue_description = models.TextField()
    mechanic = models.ForeignKey(CustomUser, limit_choices_to={'role__in': ['mechanic', 'admin']}, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    date_out = models.DateField(null=True, blank=True)
    cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    parts_used = models.TextField(blank=True)
    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"Workshop: {self.vehicle} – {self.date_in} ({self.status})"

class Driver(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "driver"},
        related_name="fleet_driver", default="driver"
    )
    license_number = models.CharField(max_length=50)
    license_expiry = models.DateField()
    assigned_vehicle = models.ForeignKey("Vehicle", on_delete=models.SET_NULL, null=True, blank=True)
    rating = models.FloatField(default=0.0)

    def __str__(self):
        return self.user.get_full_name() or self.user.username

    @property
    def phone(self):
        return self.user.phone

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    @property
    def is_license_valid(self):
        return self.license_expiry >= timezone.now().date()

    @property
    def profile_picture(self):
        return self.user.profile_picture.url if self.user.profile_picture else None

class DriverPerformanceHistory(models.Model):
    driver = models.ForeignKey("Driver", on_delete=models.CASCADE, related_name="performance_history")
    month = models.CharField(max_length=20)  # e.g. "2025-11"
    score = models.DecimalField(max_digits=6, decimal_places=2)
    collections = models.PositiveIntegerField(default=0)
    fuel = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    maintenance = models.PositiveIntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    branch = models.ForeignKey("Branch", on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        unique_together = ("driver", "month")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.driver.full_name} - {self.month}: {self.score}"

class Branch(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    district = models.CharField(max_length=100)
    address = models.TextField()

    def __str__(self):
        return self.name

class Customer(models.Model):
    CUSTOMER_TYPES = [
        ('residential', 'Residential'),
        ('business', 'Business'),
        ('industry', 'Industry'),
    ]
    full_name = models.CharField(max_length=255)
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPES)
    phone = models.CharField(max_length=20)
    address = models.TextField()
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True)
    monthly_fee = models.FloatField()

    def __str__(self):
        return self.full_name

class WasteCollection(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    date = models.DateField()
    waste_weight = models.FloatField()
    oversized = models.BooleanField(default=False)
    collection_status = models.CharField(max_length=20, default='pending')  # pending, completed

    def __str__(self):
        return f"{self.customer} - {self.date}"

class FuelLog(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    date = models.DateField(default=timezone.now)
    fuel_amount = models.FloatField()  # liters
    cost = models.FloatField()
    odometer_reading = models.FloatField()

    def __str__(self):
        return f"{self.vehicle.registration_number} - {self.date}"

class Route(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True)
    date = models.DateField()
    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255)
    route_points = models.JSONField()  # list of GPS coordinates
    optimized = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.vehicle} - {self.date}"

class VehiclePhoto(models.Model):
    vehicle = models.ForeignKey(Vehicle, related_name="photos", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="vehicle_photos/")
    uploaded_at = models.DateTimeField(auto_now_add=True)

class Repair(models.Model):
    STATUS_CHOICES = [
        ("Pending", "Pending"),
        ("Completed", "Completed"),
    ]
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="repairs")
    description = models.TextField()
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    date = models.DateField(auto_now_add=True)

    def __str__(self):
        return f"{self.vehicle.plate_number} - {self.description[:20]}"


class Consumption(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="consumptions")
    month = models.CharField(max_length=20)
    fuel = models.DecimalField(max_digits=10, decimal_places=2)
    oil = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.vehicle.plate_number} - {self.month}"

class FuelEntry(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    liters = models.FloatField()
    cost = models.FloatField()
    date = models.DateField()

class OilEntry(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE)
    liters = models.FloatField()
    cost = models.FloatField()
    date = models.DateField()

class FuelRecord(models.Model):
    vehicle = models.ForeignKey("Vehicle", on_delete=models.CASCADE, related_name="fuel_records")
    date = models.DateField()
    liters = models.DecimalField(max_digits=10, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    remarks = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.vehicle.registration_number} - {self.date}"

class MaintenanceRecord(models.Model):
    vehicle = models.ForeignKey("Vehicle", on_delete=models.CASCADE, related_name="maintenance_records")
    maintenance_type = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    date = models.DateField()
    next_due = models.DateField()
    cost = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.vehicle.registration_number} - {self.maintenance_type}"