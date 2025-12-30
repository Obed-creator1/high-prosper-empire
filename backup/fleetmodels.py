from django.db import models

class Vehicle(models.Model):
    STATUS_CHOICES = [
        ("active", "Active"),
        ("maintenance", "Maintenance"),
        ("inactive", "Inactive"),
    ]
    plate_number = models.CharField(max_length=20, unique=True)
    brand = models.CharField(max_length=50)
    model_name = models.CharField(max_length=50)
    year_of_manufacture = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    lat = models.FloatField(null=True, blank=True)
    lng = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.plate_number

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

