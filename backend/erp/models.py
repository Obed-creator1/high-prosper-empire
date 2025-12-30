# erp/models.py - COMPLETE ENTERPRISE MODELS
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator
import uuid

User = get_user_model()

class ERPModule(models.Model):
    """ERP Modules configuration"""
    MODULES = [
        ('crm', 'Customer Relationship Management'),
        ('finance', 'Financial Management'),
        ('projects', 'Project Management'),
        ('hr', 'Human Resources'),
        ('inventory', 'Inventory Management'),
        ('procurement', 'Procurement'),
        ('manufacturing', 'Manufacturing'),
        ('sales', 'Sales'),
        ('services', 'Services'),
    ]

    name = models.CharField(max_length=50, choices=MODULES, unique=True)
    display_name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50, default='📊')
    is_active = models.BooleanField(default=True)
    version = models.CharField(max_length=20, default='1.0')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "ERP Modules"
        ordering = ['name']

    def __str__(self):
        return self.display_name

class BusinessUnit(models.Model):
    """Company business units/departments"""
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True)
    module = models.ForeignKey(ERPModule, on_delete=models.CASCADE, related_name='business_units')
    manager = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='managed_units')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['name', 'module']
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"

class ERPDashboard(models.Model):
    """User-specific ERP dashboards"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='erp_dashboard')
    modules = models.ManyToManyField(ERPModule, related_name='dashboards')
    layout = models.JSONField(default=dict, blank=True)  # Dashboard layout config
    widgets = models.JSONField(default=list, blank=True)  # Custom widgets
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Dashboard for {self.user.username}"

class KPI(models.Model):
    """Key Performance Indicators"""
    METRIC_TYPES = [
        ('revenue', 'Revenue'),
        ('profit', 'Profit'),
        ('cost', 'Cost'),
        ('efficiency', 'Efficiency'),
        ('growth', 'Growth'),
        ('customer', 'Customer Satisfaction'),
    ]

    name = models.CharField(max_length=200)
    module = models.ForeignKey(ERPModule, on_delete=models.CASCADE, related_name='kpis')
    metric_type = models.CharField(max_length=20, choices=METRIC_TYPES)
    target_value = models.DecimalField(max_digits=20, decimal_places=2)
    current_value = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    unit = models.CharField(max_length=20, default='%')
    business_unit = models.ForeignKey(BusinessUnit, on_delete=models.CASCADE, related_name='kpis')
    period = models.CharField(max_length=20, default='monthly')  # daily, weekly, monthly, quarterly, yearly
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'business_unit', 'period']
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.name} - {self.business_unit}"

class Workflow(models.Model):
    """Business workflows and processes"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('archived', 'Archived'),
    ]

    name = models.CharField(max_length=200)
    module = models.ForeignKey(ERPModule, on_delete=models.CASCADE, related_name='workflows')
    description = models.TextField()
    steps = models.JSONField(default=list)  # Workflow steps configuration
    business_unit = models.ForeignKey(BusinessUnit, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_workflows')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - {self.module}"

class ERPNotification(models.Model):
    """ERP system notifications"""
    NOTIFICATION_TYPES = [
        ('kpi_alert', 'KPI Alert'),
        ('workflow_step', 'Workflow Step'),
        ('approval_required', 'Approval Required'),
        ('data_quality', 'Data Quality'),
        ('system_alert', 'System Alert'),
    ]

    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    module = models.ForeignKey(ERPModule, on_delete=models.CASCADE)
    business_unit = models.ForeignKey(BusinessUnit, on_delete=models.CASCADE)
    recipients = models.ManyToManyField(User, related_name='erp_notifications')
    is_read = models.BooleanField(default=False)
    priority = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ], default='medium')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_read', '-created_at']),
            models.Index(fields=['business_unit', 'module']),
        ]

    def __str__(self):
        return f"{self.title} - {self.notification_type}"