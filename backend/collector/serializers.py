# backend/collector/serializers.py
from rest_framework import serializers
from .models import (
    Collector, WasteCollectionSchedule, VehicleTurnCount,
    CollectorTask, CollectorLocationHistory
)
from fleet.serializers import VehicleSerializer  # Assuming you have this
from customers.serializers import VillageSerializer

class CollectorSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()  # Show username
    assigned_vehicle = VehicleSerializer(read_only=True)
    villages = VillageSerializer(many=True, read_only=True)

    class Meta:
        model = Collector
        fields = '__all__'
        read_only_fields = ['total_customers', 'rating', 'rating_count', 'efficiency_percentage', 'is_deleted']

    def validate(self, data):
        if data.get('shift_start') and data.get('shift_end'):
            if data['shift_start'] >= data['shift_end']:
                raise serializers.ValidationError("Shift end time must be after start time.")
        return data


class WasteCollectionScheduleSerializer(serializers.ModelSerializer):
    village = VillageSerializer(read_only=True)
    collector = CollectorSerializer(read_only=True)
    vehicle = VehicleSerializer(read_only=True)

    class Meta:
        model = WasteCollectionSchedule
        fields = '__all__'


class VehicleTurnCountSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)
    village = VillageSerializer(read_only=True)

    class Meta:
        model = VehicleTurnCount
        fields = '__all__'


class CollectorTaskSerializer(serializers.ModelSerializer):
    collector = CollectorSerializer(read_only=True)

    class Meta:
        model = CollectorTask
        fields = '__all__'


class CollectorLocationHistorySerializer(serializers.ModelSerializer):
    collector = CollectorSerializer(read_only=True)

    class Meta:
        model = CollectorLocationHistory
        fields = '__all__'