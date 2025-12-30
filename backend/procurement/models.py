# backend/procurement/models.py
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError
from django_fsm import FSMField
from model_utils import FieldTracker

# Soft Delete Support
from safedelete.models import SafeDeleteModel
from safedelete.managers import SafeDeleteManager

from .managers import TenantManager

User = get_user_model()


# ================================================
# 1. UNIFIED ITEM CATALOG – Products + Services
# ================================================
class ItemCategory(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_service_category = models.BooleanField(
        default=False,
        help_text="Check if this category contains only services (e.g., Consulting, Maintenance)"
    )

    class Meta:
        verbose_name_plural = "Item Categories"

    def __str__(self):
        return self.name


class Item(SafeDeleteModel):
    """
    Single source of truth for everything you buy or sell:
    - Physical Products (tracked in inventory)
    - Services (hourly, project-based, subscriptions, etc.)
    """
    objects = TenantManager()
    all_objects = models.Manager()

    ITEM_TYPE_CHOICES = [
        ('product', 'Product'),
        ('service', 'Service'),
    ]

    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=10, choices=ITEM_TYPE_CHOICES, default='product')
    sku = models.CharField(max_length=50, unique=True, help_text="Unique code: PROD-001 or SERV-100")
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    category = models.ForeignKey(ItemCategory, on_delete=models.SET_NULL, null=True, blank=True)

    # Flexible Unit of Measure
    unit_of_measure = models.CharField(
        max_length=20,
        choices=[
            ('pcs', 'Pieces'),
            ('kg', 'Kilogram'),
            ('m', 'Meter'),
            ('ltr', 'Liter'),
            ('box', 'Box'),
            ('set', 'Set'),
            ('hour', 'Hour'),
            ('day', 'Day'),
            ('month', 'Month'),
            ('project', 'Project'),
            ('session', 'Session'),
            ('license', 'License'),
            ('unit', 'Unit'),
        ],
        default='pcs'
    )

    # Pricing
    cost_price = models.DecimalField(max_digits=14, decimal_places=4, default=0, help_text="Purchase cost")
    selling_price = models.DecimalField(max_digits=14, decimal_places=4, default=0, help_text="Default selling price")
    currency = models.CharField(max_length=3, default='USD')

    # Inventory control
    track_inventory = models.BooleanField(default=True, help_text="Uncheck for services and non-stock items")
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    stock_record = models.OneToOneField(
        'stock.Stock',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='procurement_item'
    )

    class Meta:
        ordering = ['sku']
        verbose_name = "Item (Product or Service)"
        verbose_name_plural = "Items (Products & Services)"

    def __str__(self):
        type_label = "SERVICE" if self.item_type == 'service' else "PRODUCT"
        return f"[{type_label}] {self.sku} - {self.name}"

    def clean(self):
        # Services should never track inventory
        if self.item_type == 'service':
            self.track_inventory = False

    # Auto-create stock record on save
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.track_inventory and not self.stock_record:
            from stock.models import Stock
            stock = Stock.objects.create(
                item_code=self.sku,
                name=self.name,
                description=self.description,
                category=None,  # Map later
                supplier=None,
                default_warehouse=None,
                unit_price=self.cost_price,
                status='active',
                is_active=True
            )
            self.stock_record = stock
            self.save(update_fields=['stock_record'])

# ================================================
# 2. SUPPLIER (unchanged – still perfect)
# ================================================
class Supplier(SafeDeleteModel):
    objects = SafeDeleteManager()
    all_objects = models.Manager()

    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='suppliers')
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True, verbose_name="Tax/VAT ID")
    payment_terms_days = models.PositiveIntegerField(default=30)
    currency = models.CharField(max_length=3, default='USD')
    is_approved = models.BooleanField(default=False)
    rating = models.PositiveSmallIntegerField(null=True, blank=True, choices=[(i, f"{i} Star") for i in range(1, 6)])
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    performance_score = models.FloatField(default=50.0, help_text="AI-generated score 0-100")
    last_scored_at = models.DateTimeField(null=True, blank=True)
    kyc_status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', 'Pending'),
        ('verified', 'KYC Verified'),
        ('rejected', 'Rejected'),
    ])
    blockchain_id = models.CharField(max_length=100, blank=True, help_text="DID or Polygon Address")
    kyc_documents = models.JSONField(default=dict)  # { "id": "url", "business_reg": "url" }
    verified_at = models.DateTimeField(null=True, blank=True)

    @property
    def performance_grade(self):
        if self.performance_score >= 90: return "A+"
        if self.performance_score >= 80: return "A"
        if self.performance_score >= 70: return "B"
        if self.performance_score >= 60: return "C"
        return "D"

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.code} - {self.name}"


# ================================================
# 3. PURCHASE REQUISITION (PR)
# ================================================
class PurchaseRequisition(SafeDeleteModel):
    objects = SafeDeleteManager()
    all_objects = models.Manager()

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='requisitions')
    pr_number = models.CharField(max_length=25, unique=True, editable=False)
    title = models.CharField(max_length=255)
    requester = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='requisitions')
    department = models.CharField(max_length=100, blank=True)
    required_by_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    total_estimated_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_prs')
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pr_number:
            self.pr_number = self._generate_pr_number()
        super().save(*args, **kwargs)

    def _generate_pr_number(self):
        today = timezone.now().strftime('%Y%m%d')
        count = PurchaseRequisition.objects.filter(pr_number__startswith=f"PR-{today}").count() + 1
        return f"PR-{today}-{count:04d}"

    def __str__(self):
        return f"{self.pr_number} | {self.title}"

    class Meta:
        ordering = ['-created_at']


class PurchaseRequisitionItem(models.Model):
    requisition = models.ForeignKey(PurchaseRequisition, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=300)
    quantity = models.DecimalField(max_digits=12, decimal_places=3, validators=[MinValueValidator(Decimal('0.001'))])
    unit_price_estimated = models.DecimalField(max_digits=14, decimal_places=4, null=True, blank=True)
    total_estimated = models.DecimalField(max_digits=16, decimal_places=2, editable=False, default=0)

    def save(self, *args, **kwargs):
        # Auto-fill from Item
        if self.item:
            self.description = self.description or self.item.name
            if self.unit_price_estimated is None:
                self.unit_price_estimated = self.item.selling_price or self.item.cost_price

        if self.unit_price_estimated and self.quantity:
            self.total_estimated = self.quantity * self.unit_price_estimated

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} × {self.quantity} {self.item.unit_of_measure if self.item else ''}"


# ================================================
# 4. RFQ → Quotation
# ================================================
class RFQ(SafeDeleteModel):
    objects = SafeDeleteManager()
    all_objects = models.Manager()

    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='rfqs')
    rfq_number = models.CharField(max_length=25, unique=True, editable=False)
    requisition = models.ForeignKey(PurchaseRequisition, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=255)
    issue_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    suppliers = models.ManyToManyField(Supplier, through='RFQSupplier')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.rfq_number:
            self.rfq_number = self._generate_rfq_number()
        super().save(*args, **kwargs)

    def _generate_rfq_number(self):
        today = timezone.now().strftime('%Y%m%d')
        count = RFQ.objects.filter(rfq_number__startswith=f"RFQ-{today}").count() + 1
        return f"RFQ-{today}-{count:04d}"

    def __str__(self):
        return self.rfq_number


class RFQSupplier(models.Model):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    sent_at = models.DateTimeField(null=True, blank=True)
    responded = models.BooleanField(default=False)

    class Meta:
        unique_together = ('rfq', 'supplier')


class Quotation(SafeDeleteModel):
    objects = SafeDeleteManager()
    all_objects = models.Manager()

    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='quotations')
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    quotation_ref = models.CharField(max_length=100, blank=True)
    total_amount = models.DecimalField(max_digits=16, decimal_places=2)
    validity_date = models.DateField()
    payment_terms = models.CharField(max_length=300, blank=True)
    delivery_lead_time_days = models.PositiveIntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    attachment = models.FileField(upload_to='quotations/', blank=True, null=True)

    def __str__(self):
        return f"Quote {self.quotation_ref or self.id} - {self.supplier}"


# ================================================
# 5. PURCHASE ORDER (PO)
# ================================================
class PurchaseOrder(SafeDeleteModel):
    objects = SafeDeleteManager()
    all_objects = models.Manager()

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent to Supplier'),
        ('confirmed', 'Confirmed'),
        ('partially_received', 'Partially Received'),
        ('fully_received', 'Fully Received'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
    ]

    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE, related_name='pos')
    po_number = models.CharField(max_length=25, unique=True, editable=False)
    requisition = models.ForeignKey(PurchaseRequisition, on_delete=models.SET_NULL, null=True, blank=True)
    quotation = models.ForeignKey(Quotation, on_delete=models.SET_NULL, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    order_date = models.DateField(default=timezone.now)
    expected_delivery_date = models.DateField()
    status = FSMField(max_length=25, choices=STATUS_CHOICES, default='draft')
    tracker = FieldTracker()
    total_amount = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=16, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    payment_terms = models.CharField(max_length=300, blank=True)
    delivery_address = models.TextField()
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_pos')
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_pos')
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to='purchase_orders/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.po_number:
            self.po_number = self._generate_po_number()
        self.grand_total = self.total_amount + self.tax_amount
        super().save(*args, **kwargs)

    def _generate_po_number(self):
        today = timezone.now().strftime('%Y%m%d')
        count = PurchaseOrder.objects.filter(po_number__startswith=f"PO-{today}").count() + 1
        return f"PO-{today}-{count:04d}"

    def __str__(self):
        return self.po_number

    class Meta:
        ordering = ['-order_date']


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=300)
    quantity_ordered = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price = models.DecimalField(max_digits=14, decimal_places=4)
    tax_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=16, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        if self.item:
            self.description = self.description or self.item.name
            if not self.unit_price:
                self.unit_price = self.item.selling_price or self.item.cost_price

        self.line_total = self.quantity_ordered * self.unit_price * (1 + self.tax_rate / 100)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} × {self.quantity_ordered}"


# ================================================
# 6. GOODS RECEIPT (GRN) – Only for Products
# ================================================
class GoodsReceipt(SafeDeleteModel):
    objects = SafeDeleteManager()
    all_objects = models.Manager()

    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE)
    grn_number = models.CharField(max_length=25, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='receipts')
    receipt_date = models.DateField(default=timezone.now)
    received_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True)
    attachment = models.FileField(upload_to='grn/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.grn_number:
            self.grn_number = self._generate_grn_number()
        super().save(*args, **kwargs)

    def _generate_grn_number(self):
        today = timezone.now().strftime('%Y%m%d')
        count = GoodsReceipt.objects.filter(grn_number__startswith=f"GRN-{today}").count() + 1
        return f"GRN-{today}-{count:04d}"

    def __str__(self):
        return self.grn_number


class GoodsReceiptItem(models.Model):
    goods_receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='items')
    po_item = models.ForeignKey(PurchaseOrderItem, on_delete=models.CASCADE)
    quantity_received = models.DecimalField(max_digits=12, decimal_places=3)
    quantity_accepted = models.DecimalField(max_digits=12, decimal_places=3)
    quantity_rejected = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    notes = models.TextField(blank=True)

    def clean(self):
        if self.po_item.item and self.po_item.item.item_type == 'service':
            raise ValidationError("Cannot create Goods Receipt for Service items.")

    def save(self, *args, **kwargs):
        self.quantity_rejected = self.quantity_received - self.quantity_accepted
        super().save(*args, **kwargs)


# ================================================
# 7. SUPPLIER INVOICE
# ================================================
class SupplierInvoice(SafeDeleteModel):
    objects = SafeDeleteManager()
    all_objects = models.Manager()

    company = models.ForeignKey('tenants.Company', on_delete=models.CASCADE)
    invoice_number = models.CharField(max_length=100, unique=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE)
    invoice_date = models.DateField()
    due_date = models.DateField()
    total_amount = models.DecimalField(max_digits=16, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=16, decimal_places=2)
    attachment = models.FileField(upload_to='invoices/supplier/', blank=True, null=True)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"INV {self.invoice_number} - {self.supplier}"

    class Meta:
        ordering = ['-invoice_date']