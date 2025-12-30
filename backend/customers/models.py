# backend/customers/models.py (Vision 2026)

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.utils import timezone
from django.db.models import Sum, Q
from django.contrib.postgres.fields import ArrayField
import uuid

from users.models import CustomUser

User = get_user_model()

class TimestampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="created_%(class)ss")
    updated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="updated_%(class)ss")

    class Meta:
        abstract = True

# --- Geography ---
class Sector(TimestampedModel):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True, blank=True, null=True)

    def __str__(self): return f"{self.code or ''} - {self.name}"

class Cell(TimestampedModel):
    name = models.CharField(max_length=100)
    sector = models.ForeignKey(Sector, on_delete=models.CASCADE, related_name='cells')
    code = models.CharField(max_length=10, blank=True, null=True)

    class Meta:
        unique_together = ('name', 'sector')
    def __str__(self): return f"{self.name} ({self.sector})"

class Village(TimestampedModel):
    """
    Village model - now supports multiple collectors
    """
    name = models.CharField(max_length=100, unique=True)
    cell = models.ForeignKey('Cell', on_delete=models.CASCADE, related_name='villages')

    # CHANGED: Many-to-Many - one collector can manage multiple villages
    collectors = models.ManyToManyField(
        User,
        limit_choices_to={'role': 'collector'},  # Only collectors
        related_name='assigned_villages',
        blank=True,
        verbose_name="Collectors"
    )

    gps_coordinates = models.CharField(max_length=100, blank=True, null=True)
    population_estimate = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Estimated population of the village"
    )
    is_active = models.BooleanField(default=True, help_text="Is this village currently active?")

    class Meta:
        ordering = ['name']
        verbose_name = "Village"
        verbose_name_plural = "Villages"

    def __str__(self):
        collectors_str = ", ".join(c.username for c in self.collectors.all()) or "Unassigned"
        return f"{self.name} ({collectors_str})"

    @property
    def primary_collector(self):
        """For backward compatibility - returns first collector if any"""
        return self.collectors.first()

    @property
    def customer_count(self):
        return self.residents.count()

    @property
    def total_balance(self):
        return sum(customer.balance or 0 for customer in self.residents.all())

# --- Customer ---
class Customer(TimestampedModel):
    GENDER_CHOICES = (('M', 'Male'), ('F', 'Female'), ('O', 'Other'))
    TYPE_CHOICES = (('Individual', 'Individual'), ('Corporate', 'Corporate'))
    STATUS_CHOICES = (('Active', 'Active'), ('Suspended', 'Suspended'), ('Terminated', 'Terminated'))

    uid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="customer_profile", null=True, blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='Individual')
    name = models.CharField(max_length=200)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, unique=True)
    nid = models.CharField("National ID", max_length=30, blank=True, null=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    village = models.ForeignKey(Village, on_delete=models.SET_NULL, null=True, related_name="residents")
    contract_no = models.CharField(max_length=50, unique=True)
    contract_file = models.FileField(upload_to='contracts/', validators=[FileExtensionValidator(['pdf'])], blank=True, null=True)
    payment_account = models.CharField(max_length=50, unique=True)
    monthly_fee = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(0)])
    connection_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')

    # AI & Analytics
    risk_score = models.FloatField(default=0.0)  # 0-100
    tags = ArrayField(models.CharField(max_length=50), blank=True, default=list)
    notes = models.TextField(blank=True)
    device_token = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['phone']),
            models.Index(fields=['payment_account']),
            models.Index(fields=['village']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.name} ({self.phone})"

    @property
    def collector(self):
        return self.village.collector if self.village else None

    @property
    def total_paid(self):
        return self.payments.filter(status='Completed').aggregate(total=Sum('amount'))['total'] or 0

    @property
    def balance(self):
        return self.invoices.filter(status='Unpaid').aggregate(total=Sum('amount'))['total'] or 0

    @property
    def overpaid_months(self):
        overpayment = abs(self.balance) if (self.balance or 0) < 0 else 0
        return round(overpayment / (self.monthly_fee or 1), 1)

    @property
    def unpaid_months(self):
        debt = self.balance or 0
        return round(debt / (self.monthly_fee or 1), 1) if debt > 0 else 0

    @property
    def days_delinquent(self):
        last_payment = self.payments.filter(status='Successful').order_by('-completed_at').first()
        if not last_payment or not last_payment.completed_at:
            return (timezone.now().date() - (self.connection_date or timezone.now().date())).days
        days_since = (timezone.now().date() - last_payment.completed_at.date()).days
        return max(0, days_since - 30)

    def update_risk_score(self):
        score = 0
        if self.days_delinquent > 90: score += 70
        elif self.days_delinquent > 60: score += 50
        elif self.days_delinquent > 30: score += 30
        if self.balance > self.monthly_fee * 3: score += 30
        self.risk_score = min(100, score)
        self.save(update_fields=['risk_score'])

# --- Smart Ledger (Replace old outstanding) ---
class LedgerEntry(TimestampedModel):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='ledger')
    invoice = models.ForeignKey('payments.Invoice', null=True, blank=True, on_delete=models.SET_NULL)
    payment = models.ForeignKey('payments.Payment', null=True, blank=True, on_delete=models.SET_NULL)
    description = models.CharField(max_length=200)
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        prev = LedgerEntry.objects.filter(customer=self.customer).order_by('-created_at').first()
        self.balance = (prev.balance if prev else 0) + self.credit - self.debit
        super().save(*args, **kwargs)

# --- Orders & Complaints (Upgraded) ---
class ServiceOrder(TimestampedModel):
    STATUS_CHOICES = (('Pending', 'Pending'), ('In Progress', 'In Progress'), ('Completed', 'Completed'), ('Cancelled', 'Cancelled'))
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='orders')
    title = models.CharField(max_length=200)
    description = models.TextField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_orders')

    def __str__(self): return f"Order #{self.id} - {self.title}"

class Complaint(TimestampedModel):
    PRIORITY_CHOICES = [('Low', 'Low'), ('Medium', 'Medium'), ('High', 'High'), ('Critical', 'Critical')]
    STATUS_CHOICES = [('Open', 'Open'), ('In Progress', 'In Progress'), ('Resolved', 'Resolved'), ('Closed', 'Closed')]

    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='complaints')
    title = models.CharField(max_length=200)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    assigned_to = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='assigned_complaints')
    resolved_at = models.DateTimeField(null=True, blank=True)
    satisfaction_score = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5

    def __str__(self): return f"Complaint #{self.id} - {self.title}"

