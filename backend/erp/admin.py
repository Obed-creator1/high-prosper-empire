from django.contrib import admin
from .models import ERPModule, BusinessUnit, ERPDashboard, KPI, Workflow, ERPNotification

@admin.register(ERPModule)
class ERPModuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_name', 'is_active', 'version']
    list_filter = ['is_active']
    search_fields = ['name', 'display_name']

@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'module', 'manager', 'is_active']
    list_filter = ['module', 'is_active']
    search_fields = ['name', 'code']

@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ['name', 'metric_type', 'business_unit', 'current_value', 'target_value', 'period']
    list_filter = ['metric_type', 'business_unit', 'period', 'is_active']
    search_fields = ['name']

admin.site.register([ERPDashboard, Workflow, ERPNotification])