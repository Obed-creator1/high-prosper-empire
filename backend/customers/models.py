# backend/customers/models.py (Vision 2026)
from django.apps import apps
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

    # Sector Leadership — Many-to-Many for flexibility
    managers = models.ManyToManyField(
        CustomUser,
        limit_choices_to={'role': 'manager'},
        related_name='managed_sectors',
        blank=True,
        help_text="Field Sector Managers responsible for this sector"
    )

    supervisors = models.ManyToManyField(
        CustomUser,
        limit_choices_to={'role': 'supervisor'},
        related_name='supervised_sectors',
        blank=True,
        help_text="Field Site Supervisors operating in this sector"
    )

    class Meta:
        verbose_name = "Sector"
        verbose_name_plural = "Sectors"
        ordering = ['name']

    def __str__(self):
        return f"{self.code or 'SECTOR'} - {self.name}"

    def get_manager_names(self):
        return ", ".join([u.get_full_name() or u.username for u in self.managers.all()]) or "No Manager Assigned"

    def get_supervisor_names(self):
        return ", ".join([u.get_full_name() or u.username for u in self.supervisors.all()]) or "No Supervisor Assigned"

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
    monthly_revenue_target = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Monthly revenue collection target (RWF)"
    )

    # Customer Growth Target
    monthly_new_customers_target = models.PositiveIntegerField(
        default=0,
        help_text="Target number of new customers to acquire this month"
    )

    # Current Month/Year for Targets
    target_month = models.PositiveSmallIntegerField(
        default=timezone.now().month,
        help_text="Month this target applies to"
    )
    target_year = models.PositiveSmallIntegerField(
        default=timezone.now().year,
        help_text="Year this target applies to"
    )

    # === AUTO-CALCULATED FROM REAL DATA ===
    collected_this_month = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, editable=False
    )
    previous_month_collected = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, editable=False
    )

    # === RANKING — Auto-calculated monthly ===
    performance_rank = models.PositiveSmallIntegerField(
        null=True, blank=True, editable=False,
        help_text="Village rank this month by target achievement (1 = best)"
    )

    new_customers_this_month = models.PositiveIntegerField(default=0, editable=False)
    previous_month_new_customers = models.PositiveIntegerField(default=0, editable=False)
    is_active = models.BooleanField(default=True, help_text="Is this village currently active?")

    class Meta:
        ordering = ['-performance_rank', 'name']  # Best performers first
        verbose_name = "Village"
        verbose_name_plural = "Villages"
        indexes = [
            models.Index(fields=['target_month', 'target_year']),
            models.Index(fields=['performance_rank']),
            models.Index(fields=['monthly_revenue_target']),
            models.Index(fields=['monthly_new_customers_target']),
        ]

    def __str__(self):
        collectors_str = ", ".join(c.username for c in self.collectors.all()) or "Unassigned"
        return f"{self.name} ({collectors_str})"

    def save(self, *args, **kwargs):
        # Remove transient flags before actual save
        if hasattr(self, '_metrics_updated'):
            del self._metrics_updated
        super().save(*args, **kwargs)

    # === REVENUE PROPERTIES ===
    @property
    def revenue_target_percentage(self):
        if self.monthly_revenue_target > 0:
            # Convert Decimal to float for calculation
            return round(float(self.collected_this_month) / float(self.monthly_revenue_target) * 100, 2)
        return 0.0

    @property
    def remaining_revenue_target(self):
        return max(self.monthly_revenue_target - self.collected_this_month, 0)

    # === CUSTOMER GROWTH PROPERTIES ===
    @property
    def new_customers_target_percentage(self):
        if self.monthly_new_customers_target > 0:
            return round((self.new_customers_this_month / self.monthly_new_customers_target) * 100, 2)
        return 0.0

    @property
    def remaining_new_customers_target(self):
        return max(self.monthly_new_customers_target - self.new_customers_this_month, 0)

    # === OVERALL PERFORMANCE ===
    @property
    def overall_target_percentage(self):
        """Weighted: 70% revenue + 30% growth"""
        return round(
            (self.revenue_target_percentage * 0.7) +
            (self.new_customers_target_percentage * 0.3),
            2
        )

    # === UPDATE METHODS ===
    def update_collected_and_growth(self):
        """Call daily via cron or signal"""
        today = timezone.now()
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        Payment = apps.get_model('payments', 'Payment')

        # Revenue
        collected = Payment.objects.filter(
            customer__village=self,
            status='Successful',
            completed_at__gte=month_start
        ).aggregate(total=Sum('amount'))['total'] or 0

        # New customers
        new_customers = Customer.objects.filter(
            village=self,
            created_at__gte=month_start
        ).count()

        self.collected_this_month = collected
        self.new_customers_this_month = new_customers
        self.save(update_fields=[
            'collected_this_month',
            'new_customers_this_month'
        ])

    # === UPDATE & RANK METHOD ===
    def update_performance_and_rank(self):
        """Update collected/growth and recalculate rank"""
        today = timezone.now()
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        Payment = apps.get_model('payments', 'Payment')

        # Update real data
        collected = Payment.objects.filter(
            customer__village=self,
            status='Successful',
            completed_at__gte=month_start
        ).aggregate(total=Sum('amount'))['total'] or 0

        new_customers = Customer.objects.filter(
            village=self,
            created_at__gte=month_start
        ).count()

        self.collected_this_month = collected
        self.new_customers_this_month = new_customers
        self.save(update_fields=['collected_this_month', 'new_customers_this_month'])

    @classmethod
    def update_all_ranks(cls, month=None, year=None):
        """
        Run monthly (via cron) to rank all villages
        """
        if month is None:
            month = timezone.now().month
        if year is None:
            year = timezone.now().year

        # Get all villages with targets for this month
        villages = cls.objects.filter(
            target_month=month,
            target_year=year,
            monthly_revenue_target__gt=0  # Only ranked if target set
        )

        # Force update performance
        for village in villages:
            village.update_performance_and_rank()

        # Reload with fresh data
        villages = villages.order_by('-overall_target_percentage')

        # Assign ranks
        for rank, village in enumerate(villages, start=1):
            village.performance_rank = rank
            village.save(update_fields=['performance_rank'])

        # Clear rank for villages without target
        cls.objects.filter(
            Q(target_month=month, target_year=year) &
            Q(monthly_revenue_target=0)
        ).update(performance_rank=None)

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

    @property
    def avg_risk(self):
        """Average risk score of all customers in this village"""
        risk_scores = [
            c.risk_score for c in self.residents.all()
            if c.risk_score is not None and c.risk_score > 0
        ]
        if risk_scores:
            return round(sum(risk_scores) / len(risk_scores), 2)
        return 0.0

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

class ServiceRequest(TimestampedModel):
    """
    One-off service requests (gigs) — can be from customers or non-customers
    Examples: Water tank cleaning, pipe repair, new connection setup, etc.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('quoted', 'Quoted'),
        ('accepted', 'Accepted'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('rejected', 'Rejected'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('unpaid', 'Unpaid'),
        ('partially_paid', 'Partially Paid'),
        ('paid', 'Paid'),
        ('refunded', 'Refunded'),
    ]

    # Requester info (non-customer friendly)
    requester_name = models.CharField(max_length=200)
    requester_phone = models.CharField(max_length=20)
    requester_email = models.EmailField(blank=True, null=True)
    requester_nid = models.CharField(max_length=30, blank=True, null=True)

    # Link to existing customer (optional)
    customer = models.ForeignKey(
        'Customer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='service_requests',
        help_text="If requester is an existing customer"
    )

    # Location
    village = models.ForeignKey(
        Village,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='service_requests'
    )
    address_details = models.TextField(help_text="Full address or landmarks")

    # Request details
    title = models.CharField(max_length=200)
    description = models.TextField()
    requested_date = models.DateField(null=True, blank=True, help_text="Preferred service date")

    # Quotation & Payment
    quoted_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Amount quoted by staff"
    )
    final_amount = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Final amount after service"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')

    # Assignment
    assigned_to = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_service_requests',
        limit_choices_to={'role__in': ['staff', 'supervisor', 'collector']}
    )

    # Completion
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, help_text="Internal notes or completion report")
    satisfaction_score = models.PositiveSmallIntegerField(null=True, blank=True)  # 1-5 stars

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['requester_phone']),
            models.Index(fields=['village']),
        ]

    def __str__(self):
        return f"Request #{self.id} - {self.title} by {self.requester_name}"

    @property
    def is_overdue(self):
        if self.status in ['pending', 'quoted', 'accepted'] and self.requested_date:
            return self.requested_date < timezone.now().date()
        return False

    @property
    def total_payments(self):
        return self.payments.filter(status='Successful').aggregate(total=Sum('amount'))['total'] or 0

    @property
    def balance_due(self):
        return max(self.final_amount - self.total_payments, 0)

