from django.utils import timezone
from rest_framework import serializers
from rest_framework import serializers
from .models import (Vehicle, Driver, Branch, Customer,
                     WasteCollection, FuelLog, Route, Repair, Consumption, VehiclePhoto,
                     FuelRecord, MaintenanceRecord, WorkshopRecord, Compliance, FuelEfficiencyRecord)
from users.models import CustomUser

class UserBasicSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["id", "username", "first_name", "last_name", "phone", "profile_picture", "role"]

class DriverSerializer(serializers.ModelSerializer):
    user = UserBasicSerializer(read_only=True)
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role="driver"),
        source="user",
        write_only=True
    )

    class Meta:
        model = Driver
        fields = ["id", "user", "user_id", "license_number", "license_expiry", "assigned_vehicle", "rating"]

class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = '__all__'

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = '__all__'

class WasteCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WasteCollection
        fields = '__all__'

class FuelLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelLog
        fields = '__all__'

class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = '__all__'


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = "__all__"

    def get_photo(self, obj):
            request = self.context.get('request')
            if obj.photos.exists():
                photo = obj.photos.first().image
                if request:
                    return request.build_absolute_uri(photo.url)
                return photo.url
            return None

    def get_image(self, obj):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.image.url)
            return obj.image.url


class RepairSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)

    class Meta:
        model = Repair
        fields = "__all__"


class ConsumptionSerializer(serializers.ModelSerializer):
    vehicle_plate = serializers.CharField(source="vehicle.plate_number", read_only=True)

    class Meta:
        model = Consumption
        fields = "__all__"

class VehiclePhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehiclePhoto
        fields = ['id', 'vehicle', 'image', 'uploaded_at']

class FuelRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelRecord
        fields = "__all__"

class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = "__all__"

class FuelEfficiencyRecordSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source='vehicle.registration_number', read_only=True)
    brand_model = serializers.SerializerMethodField()

    class Meta:
        model = FuelEfficiencyRecord
        fields = [
            'id', 'registration_number', 'brand_model', 'date',
            'start_odometer', 'end_odometer', 'distance_km',
            'liters', 'cost', 'km_per_liter', 'cost_per_km',
            'filled_by', 'remarks'
        ]

    def get_brand_model(self, obj):
        return f"{obj.vehicle.brand} {obj.vehicle.model}"


class ComplianceSerializer(serializers.ModelSerializer):
    registration_number = serializers.CharField(source='vehicle.registration_number', read_only=True)
    days_left = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = Compliance
        fields = [
            'id', 'registration_number', 'compliance_type',
            'issue_date', 'expiry_date', 'days_left', 'status',
            'document', 'notes'
        ]

    def get_days_left(self, obj):
        return (obj.expiry_date - timezone.now().date()).days

    def get_status(self, obj):
        days = self.get_days_left(obj)
        if days < 0: return "expired"
        if days <= 5: return "critical"
        if days <= 30: return "warning"
        return "valid"

class WorkshopRecordSerializer(serializers.ModelSerializer):
    vehicle_reg = serializers.CharField(source='vehicle.registration_number', read_only=True)
    mechanic_name = serializers.CharField(source='mechanic.get_full_name', read_only=True)
    class Meta:
        model = WorkshopRecord
        fields = '__all__'