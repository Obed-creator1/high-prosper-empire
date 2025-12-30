# reports/models.py
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.files import File
from django.dispatch import receiver
from django.db.models.signals import post_delete
import uuid
import json

User = get_user_model()

class ReportCategory(models.Model):
    """Report categories for organization"""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default='📊')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Report Categories"

    def __str__(self):
        return self.name

class ReportTemplate(models.Model):
    """Predefined report templates"""
    REPORT_TYPES = [
        ('inventory_valuation', 'Inventory Valuation'),
        ('stock_movement', 'Stock Movement'),
        ('monthly_summary', 'Monthly Summary'),
        ('yearly_analysis', 'Yearly Analysis'),
        ('abc_analysis', 'ABC Analysis'),
        ('expiry_report', 'Expiry Report'),
        ('warehouse_performance', 'Warehouse Performance'),
        ('purchase_analysis', 'Purchase Analysis'),
        ('sales_report', 'Sales Report'),
        ('low_stock_alert', 'Low Stock Alert'),
    ]

    name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPES)
    category = models.ForeignKey(ReportCategory, on_delete=models.CASCADE, related_name='templates')
    description = models.TextField()
    parameters = models.JSONField(default=dict)  # Required parameters
    default_parameters = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['name', 'report_type']
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.get_report_type_display()})"

class Report(models.Model):
    """Main report model"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    FORMAT_CHOICES = [
        ('pdf', 'PDF'),
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task_id = models.CharField(max_length=255, blank=True, null=True, help_text="Celery task ID for async generation")
    title = models.CharField(max_length=200)
    template = models.ForeignKey(ReportTemplate, on_delete=models.PROTECT, related_name='reports')
    category = models.ForeignKey(ReportCategory, on_delete=models.PROTECT)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='reports')
    parameters = models.JSONField(default=dict)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES, default='pdf')

    # File storage
    file = models.FileField(upload_to='reports/%Y/%m/%d/', blank=True, null=True)
    file_size = models.PositiveIntegerField(default=0)
    file_hash = models.CharField(max_length=64, blank=True)

    # Metadata
    generated_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    row_count = models.PositiveIntegerField(default=0)

    # Error tracking
    error_message = models.TextField(blank=True, null=True)
    error_trace = models.TextField(blank=True, null=True)

    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-priority', '-created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['template', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.title} - {self.status}"

    def clean_file(self):
        """Delete old file when new one is uploaded"""
        if self.file:
            if hasattr(self, '_old_file') and self._old_file:
                self._old_file.delete(save=False)

    def save(self, *args, **kwargs):
        self.clean_file()
        super().save(*args, **kwargs)

class ReportLog(models.Model):
    """Detailed logs for report generation"""
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='logs')
    level = models.CharField(max_length=10, default='INFO')  # INFO, WARNING, ERROR
    message = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['timestamp']
        indexes = [models.Index(fields=['report', 'timestamp'])]

    def __str__(self):
        return f"{self.level}: {self.message[:50]}"