# erp/serializers.py
from rest_framework import serializers
from .models import ERPModule, BusinessUnit, ERPDashboard, KPI, Workflow, ERPNotification

class ERPModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ERPModule
        fields = '__all__'

class BusinessUnitSerializer(serializers.ModelSerializer):
    module_name = serializers.CharField(source='module.display_name', read_only=True)
    manager_name = serializers.CharField(source='manager.get_full_name', read_only=True)

    class Meta:
        model = BusinessUnit
        fields = '__all__'

class KPISerializer(serializers.ModelSerializer):
    business_unit_name = serializers.CharField(source='business_unit.name', read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = KPI
        fields = '__all__'

    def get_progress(self, obj):
        if obj.target_value > 0:
            return min((obj.current_value / obj.target_value) * 100, 100)
        return 0

class WorkflowSerializer(serializers.ModelSerializer):
    module_name = serializers.CharField(source='module.display_name', read_only=True)
    step_count = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = '__all__'

    def get_step_count(self, obj):
        return len(obj.steps) if obj.steps else 0

class ERPNotificationSerializer(serializers.ModelSerializer):
    module_name = serializers.CharField(source='module.display_name', read_only=True)
    business_unit_name = serializers.CharField(source='business_unit.name', read_only=True)

    class Meta:
        model = ERPNotification
        fields = '__all__'

class ERPDashboardSerializer(serializers.ModelSerializer):
    module_count = serializers.SerializerMethodField()

    class Meta:
        model = ERPDashboard
        fields = '__all__'

    def get_module_count(self, obj):
        return obj.modules.count()