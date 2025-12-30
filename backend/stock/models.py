import logging
from datetime import date, timedelta

from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from decimal import Decimal
import uuid
from django.db.models import F, Sum, Avg, Count
from django.contrib.postgres.fields import ArrayField
from django.urls import reverse
import json
from django.contrib.auth import get_user_model

from procurement.models import Supplier

User = get_user_model()

logger = logging.getLogger(__name__)

class Warehouse(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    manager = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_warehouses')
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    capacity = models.PositiveIntegerField(default=1000, help_text="Maximum capacity in units")
    current_utilization = models.PositiveIntegerField(default=0, help_text="Current utilization")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def utilization_percentage(self):
        if self.capacity == 0:
            return 0
        return min(100, (self.current_utilization / self.capacity) * 100)

class ValuationMethod(models.Model):
    name = models.CharField(max_length=20, unique=True)
    description = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name


class Stock(models.Model):
    STOCK_STATUS_CHOICES = [
        ('active', 'Active'),
        ('discontinued', 'Discontinued'),
        ('deprecated', 'Deprecated'),
        ('obsolete', 'Obsolete'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_code = models.CharField(max_length=50, unique=True)
    barcode = models.CharField(max_length=100, unique=True, blank=True, null=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='stocks')
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='stocks')
    default_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name='default_items')
    valuation_method = models.ForeignKey(ValuationMethod, on_delete=models.SET_NULL, null=True, blank=True, related_name='stocks')
    min_stock_level = models.PositiveIntegerField(default=10)
    max_stock_level = models.PositiveIntegerField(default=1000)
    reorder_level = models.PositiveIntegerField(default=20)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STOCK_STATUS_CHOICES, default='active')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['item_code']),
            models.Index(fields=['barcode']),
            models.Index(fields=['is_active', 'status']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.item_code} - {self.name}"

    @property
    def total_quantity(self):
        from .models import WarehouseStock
        total = WarehouseStock.objects.filter(stock=self).aggregate(
            total=Sum('quantity')
        )['total'] or 0
        return int(total)

    @property
    def total_available_quantity(self):
        from .models import WarehouseStock
        total = WarehouseStock.objects.filter(stock=self).aggregate(
            total=Sum(F('quantity') - F('reserved_quantity'))
        )['total'] or 0
        return max(0, int(total))

    @property
    def total_value(self):
        from .models import WarehouseStock
        total = WarehouseStock.objects.filter(stock=self).aggregate(
            total=Sum(F('quantity') * F('unit_price'))
        )['total'] or 0
        return float(total)

    def get_stock_status(self):
        from .models import WarehouseStock
        critical_count = WarehouseStock.objects.filter(
            stock=self,
            quantity__lte=F('stock__reorder_level')
        ).count()

        if critical_count > 0:
            return 'critical'
        low_count = WarehouseStock.objects.filter(
            stock=self,
            quantity__gt=F('stock__reorder_level'),
            quantity__lte=F('stock__min_stock_level')
        ).count()

        if low_count > 0:
            return 'low'

        return 'normal'

class WarehouseStock(models.Model):
    """Per-warehouse stock tracking for multi-warehouse support"""
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='warehouse_stocks')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='warehouse_stocks')
    quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    reserved_quantity = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['stock', 'warehouse']
        indexes = [
            models.Index(fields=['stock', 'warehouse']),
            models.Index(fields=['quantity']),
            models.Index(fields=['reserved_quantity']),
        ]

    @property
    def available_quantity(self):
        return max(0, self.quantity - self.reserved_quantity)

    @property
    def total_value(self):
        return self.quantity * self.unit_price

class StockBatch(models.Model):
    """Batch tracking for FIFO/LIFO valuation"""
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='batches')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=50, unique=True)
    initial_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    consumed_quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    used_quantity = models.PositiveIntegerField(default=0)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    expiry_date = models.DateField(null=True, blank=True)
    manufactured_date = models.DateField(null=True, blank=True)
    received_date = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['stock', 'warehouse', 'received_date']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['batch_number']),
            models.Index(fields=['is_active']),
        ]

    @property
    def remaining_quantity(self):
        # SAFE: Handle None or missing fields
        initial = self.initial_quantity or 0
        consumed = self.consumed_quantity or 0
        remaining = initial - consumed
        return max(remaining, 0)  # Never show negative

    @property
    def total_value(self):
        return (self.remaining_quantity or 0) * (self.unit_price or 0)

    def __str__(self):
        return f"{self.stock.item_code} - {self.batch_number}"

class StockBatchUsage(models.Model):
    """Tracks usage of specific batches for valuation"""
    batch = models.ForeignKey(StockBatch, on_delete=models.CASCADE, related_name='usages')
    transaction = models.ForeignKey('StockTransaction', on_delete=models.CASCADE, related_name='batch_usages')
    quantity = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['batch', 'transaction']),
        ]

class StockTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('in', 'Stock In'),
        ('out', 'Stock Out'),
        ('adjustment', 'Adjustment'),
        ('reservation', 'Reservation'),
        ('release', 'Release'),
        ('transfer', 'Warehouse Transfer'),
        ('audit', 'Inventory Audit'),
        ('correction', 'Stock Correction'),
    ]

    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='transactions')
    from_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name='outgoing_transactions')
    to_warehouse = models.ForeignKey(Warehouse, on_delete=models.SET_NULL, null=True, blank=True, related_name='incoming_transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.IntegerField()  # Can be negative for outflows
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    user = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True, related_name='stock_transactions')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['stock', 'transaction_type', 'created_at']),
            models.Index(fields=['from_warehouse', 'created_at']),
            models.Index(fields=['to_warehouse', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def save(self, *args, **kwargs):
        self.total_value = abs(self.quantity) * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.stock.item_code} - {self.get_transaction_type_display()} - {self.quantity}"

class WarehouseTransfer(models.Model):
    TRANSFER_STATUS = [
        ('pending', 'Pending'),
        ('in_transit', 'In Transit'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('partial', 'Partially Completed'),
    ]

    transfer_number = models.CharField(max_length=50, unique=True, blank=True)
    from_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='outgoing_transfers')
    to_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='incoming_transfers')
    transfer_date = models.DateTimeField(auto_now_add=True)
    expected_delivery_date = models.DateTimeField(null=True, blank=True)
    actual_delivery_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=TRANSFER_STATUS, default='pending')
    total_quantity = models.PositiveIntegerField(default=0, editable=False)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, editable=False)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='created_transfers')
    completed_by = models.ForeignKey('users.CustomUser', on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_transfers')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['transfer_number']),
            models.Index(fields=['status']),
            models.Index(fields=['from_warehouse', 'status']),
            models.Index(fields=['to_warehouse', 'status']),
        ]

    def save(self, *args, **kwargs):
        if not self.transfer_number:
            self.transfer_number = f"TR-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

        if self.status == 'completed' and not self.actual_delivery_date:
            self.actual_delivery_date = timezone.now()
            self.completed_by = self.created_by

        super().save(*args, **kwargs)
        self.update_totals()

    def update_totals(self):
        """Update total quantity and value"""
        total_qty = self.items.aggregate(total=Sum('quantity'))['total'] or 0
        total_val = self.items.aggregate(total=Sum(F('quantity') * F('unit_price')))['total'] or 0

        self.total_quantity = int(total_qty)
        self.total_value = float(total_val)
        self.save(update_fields=['total_quantity', 'total_value'])

    def __str__(self):
        return f"Transfer {self.transfer_number} - {self.status}"

class TransferItem(models.Model):
    transfer = models.ForeignKey(WarehouseTransfer, on_delete=models.CASCADE, related_name='items')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='transfer_items')
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    received_quantity = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['transfer', 'stock']
        indexes = [
            models.Index(fields=['transfer', 'stock']),
        ]

    @property
    def total_value(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"{self.stock.item_code} - {self.quantity}"

# STOCK REPORT MODELS
class StockReport(models.Model):
    REPORT_TYPES = [
        ('daily', 'Daily Report'),
        ('weekly', 'Weekly Report'),
        ('monthly', 'Monthly Report'),
        ('quarterly', 'Quarterly Report'),
        ('yearly', 'Yearly Report'),
        ('custom', 'Custom Period'),
        ('valuation', 'Valuation Report'),
        ('turnover', 'Turnover Analysis'),
        ('audit', 'Audit Report'),
        ('low_stock', 'Low Stock Report'),
        ('expiry', 'Expiry Report'),
    ]

    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    title = models.CharField(max_length=200)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='reports')
    report_date = models.DateField()
    period_start = models.DateField()
    period_end = models.DateField()
    generated_by = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='generated_reports')
    total_items = models.PositiveIntegerField(default=0)
    total_quantity = models.PositiveIntegerField(default=0)
    total_value = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    report_data = models.JSONField(default=dict)  # Store detailed report data
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['warehouse', 'report_date']),
            models.Index(fields=['report_type', 'report_date']),
            models.Index(fields=['generated_by']),
        ]

    def __str__(self):
        return f"{self.title} - {self.report_date}"

class StockReportDetail(models.Model):
    """Detailed breakdown for stock reports"""
    report = models.ForeignKey(StockReport, on_delete=models.CASCADE, related_name='details')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE)
    item_code = models.CharField(max_length=50)
    item_name = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    beginning_quantity = models.IntegerField(default=0)
    quantity_in = models.IntegerField(default=0)
    quantity_out = models.IntegerField(default=0)
    ending_quantity = models.IntegerField(default=0)
    average_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    stock_status = models.CharField(max_length=20)  # critical, low, normal
    reorder_level = models.IntegerField(default=0)
    min_stock_level = models.IntegerField(default=0)

    class Meta:
        unique_together = ['report', 'stock', 'warehouse']
        indexes = [
            models.Index(fields=['report', 'stock']),
            models.Index(fields=['report', 'warehouse']),
        ]

class InventoryAudit(models.Model):
    """Inventory audit tracking"""
    AUDIT_STATUS = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('discrepancy', 'Discrepancy Found'),
    ]

    audit_number = models.CharField(max_length=50, unique=True, blank=True)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='audits')
    audit_date = models.DateField()
    planned_date = models.DateField()
    status = models.CharField(max_length=20, choices=AUDIT_STATUS, default='planned')
    total_items_audited = models.PositiveIntegerField(default=0)
    total_discrepancies = models.PositiveIntegerField(default=0)
    total_value_adjusted = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    conducted_by = models.ForeignKey('users.CustomUser', on_delete=models.CASCADE, related_name='conducted_audits')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.audit_number:
            self.audit_number = f"AUDIT-{self.planned_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Audit {self.audit_number} - {self.status}"

class AuditItem(models.Model):
    """Individual audit items"""
    audit = models.ForeignKey(InventoryAudit, on_delete=models.CASCADE, related_name='items')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE)
    system_quantity = models.IntegerField()
    counted_quantity = models.IntegerField()
    discrepancy = models.IntegerField(default=0)
    discrepancy_value = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    is_corrected = models.BooleanField(default=False)

    @property
    def discrepancy_amount(self):
        return self.counted_quantity - self.system_quantity

    class Meta:
        indexes = [
            models.Index(fields=['audit', 'stock']),
            models.Index(fields=['is_corrected']),
        ]

class StockAlert(models.Model):
    """Automated stock alerts"""
    ALERT_TYPES = [
        ('low_stock', 'Low Stock'),
        ('reorder', 'Reorder Level'),
        ('expiry_critical', 'Critical Expiry'),
        ('expiry_warning', 'Expiry Warning'),
        ('overstock', 'Overstock'),
        ('discrepancy', 'Audit Discrepancy'),
    ]
    SEVERITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='alerts')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='alerts')
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES)
    current_quantity = models.IntegerField()
    threshold_value = models.IntegerField()
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS)
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['stock', 'warehouse']),
            models.Index(fields=['alert_type', 'is_resolved']),
            models.Index(fields=['severity', 'created_at']),
        ]

    def __str__(self):
        return f"{self.stock.item_code} - {self.get_alert_type_display()}"

class TurnoverAnalysis(models.Model):
    """Inventory turnover tracking"""
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='turnover_analysis')
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='turnover_analysis')
    period_start = models.DateField()
    period_end = models.DateField()
    period_in_days = models.PositiveIntegerField()
    average_daily_usage = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_quantity_sold = models.PositiveIntegerField(default=0)
    average_inventory = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    turnover_ratio = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    days_inventory_outstanding = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def turnover_category(self):
        if self.turnover_ratio > 6:
            return 'fast_moving'
        elif self.turnover_ratio > 2:
            return 'normal'
        elif self.turnover_ratio > 0.5:
            return 'slow_moving'
        else:
            return 'dead_stock'

    class Meta:
        unique_together = ['stock', 'warehouse', 'period_start', 'period_end']
        indexes = [
            models.Index(fields=['stock', 'warehouse']),
            models.Index(fields=['period_start', 'period_end']),
        ]

# =============================================================================
# ⚖️ INVENTORY ADJUSTMENT MODEL (NEW)
# =============================================================================

class InventoryAdjustment(models.Model):
    """Physical inventory adjustments and cycle counts"""

    ADJUSTMENT_TYPES = [
        ('cycle_count', 'Cycle Count'),
        ('full_audit', 'Full Physical Audit'),
        ('shrinkage', 'Shrinkage'),
        ('damage', 'Damage'),
        ('theft', 'Theft'),
        ('miscount', 'M recount'),
        ('reconciliation', 'System Reconciliation'),
    ]

    ADJUSTMENT_REASONS = [
        ('count_variance', 'Count Variance'),
        ('damage', 'Damaged Goods'),
        ('expiration', 'Expired Goods'),
        ('theft', 'Theft/Loss'),
        ('transfer_error', 'Transfer Error'),
        ('system_error', 'System Error'),
        ('manual_adjustment', 'Manual Adjustment'),
    ]

    # Header
    reference = models.CharField(max_length=50, unique=True, blank=True)
    adjustment_type = models.CharField(max_length=20, choices=ADJUSTMENT_TYPES)
    reason = models.CharField(max_length=20, choices=ADJUSTMENT_REASONS)
    warehouse = models.ForeignKey(Warehouse, on_delete=models.PROTECT, related_name='adjustments')
    adjustment_date = models.DateField(default=date.today)
    counted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='counted_adjustments')
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_adjustments')
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('pending_approval', 'Pending Approval'),
            ('approved', 'Approved'),
            ('posted', 'Posted'),
            ('cancelled', 'Cancelled'),
        ],
        default='draft'
    )
    notes = models.TextField(blank=True)

    # Financials
    total_increase = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    total_decrease = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    net_adjustment = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    posted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-adjustment_date', '-created_at']
        indexes = [
            models.Index(fields=['warehouse', 'status']),
            models.Index(fields=['adjustment_date']),
            models.Index(fields=['adjustment_type']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Adjustment {self.reference or self.id} - {self.warehouse.name}"

    def save(self, *args, **kwargs):
        """Auto-generate reference and calculate totals"""
        if not self.reference:
            self.reference = f"ADJ-{self.adjustment_date.strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        if self.status == 'posted' and not self.posted_at:
            self.posted_at = timezone.now()

        super().save(*args, **kwargs)

        if self.status == 'posted':
            self._calculate_financials()

    def _calculate_financials(self):
        """Calculate adjustment financials"""
        increases = self.items.filter(quantity_change__gt=0).aggregate(
            total_value=Sum(F('quantity_change') * F('unit_price'))
        )['total_value'] or 0

        decreases = self.items.filter(quantity_change__lt=0).aggregate(
            total_value=Sum(F('abs_quantity_change') * F('unit_price'))
        )['total_value'] or 0

        self.total_increase = increases
        self.total_decrease = decreases
        self.net_adjustment = increases - decreases
        self.save(update_fields=['total_increase', 'total_decrease', 'net_adjustment'])

    @property
    def item_count(self):
        return self.items.count()

    @property
    def items_with_variance(self):
        return self.items.filter(quantity_change__ne=0).count()

    def post_adjustment(self, user):
        """Post adjustment and update stock levels"""
        if self.status != 'approved':
            raise ValidationError("Adjustment must be approved before posting")

        with transaction.atomic():
            self.status = 'posted'
            self.save()

            for item in self.items.filter(quantity_change__ne=0):
                # Update warehouse stock
                warehouse_stock = WarehouseStock.objects.select_for_update().get(
                    stock=item.stock,
                    warehouse=self.warehouse
                )

                warehouse_stock.quantity += item.quantity_change
                warehouse_stock.save()

                # Create transaction
                StockTransaction.objects.create(
                    stock=item.stock,
                    warehouse=self.warehouse,
                    transaction_type='adjustment',
                    quantity=item.quantity_change,
                    unit_price=item.unit_price,
                    reference=f"ADJ:{self.reference}",
                    notes=f"{self.reason}: {self.notes[:100]}",
                    user=user
                )

            logger.info(f"Posted inventory adjustment {self.reference}")

class InventoryAdjustmentItem(models.Model):
    """Adjustment line items"""
    adjustment = models.ForeignKey(InventoryAdjustment, on_delete=models.CASCADE, related_name='items')
    stock = models.ForeignKey(Stock, on_delete=models.PROTECT)

    # Quantities
    system_quantity = models.IntegerField()  # Quantity in system before adjustment
    counted_quantity = models.IntegerField()  # Physically counted quantity
    quantity_change = models.IntegerField()  # Difference (counted - system)

    # Financials
    unit_price = models.DecimalField(max_digits=12, decimal_places=4)

    # Variance details
    variance_reason = models.CharField(max_length=200, blank=True)
    location = models.CharField(max_length=100, blank=True)  # Bin/shelf location

    class Meta:
        unique_together = ['adjustment', 'stock']
        indexes = [
            models.Index(fields=['adjustment', 'stock']),
            models.Index(fields=['quantity_change']),
        ]

    def __str__(self):
        return f"{self.stock.sku}: {self.quantity_change}"

    def save(self, *args, **kwargs):
        """Auto-calculate quantity change"""
        self.quantity_change = self.counted_quantity - self.system_quantity
        super().save(*args, **kwargs)

    @property
    def abs_quantity_change(self):
        """Absolute value of quantity change"""
        return abs(self.quantity_change)

    @property
    def variance_value(self):
        """Financial impact of variance"""
        return abs(self.quantity_change) * self.unit_price

    @property
    def has_variance(self):
        """Check if this item has a variance"""
        return self.quantity_change != 0