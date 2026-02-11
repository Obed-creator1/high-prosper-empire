# collector/models.py — HIGH PROSPER VISION 2026 (Integrated with Fleet)
from django.db import models
from django.utils import timezone
from django.contrib.gis.db import models as gis_models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField
from django.contrib.auth import get_user_model
from customers.models import Customer, Village
from django.core.validators import MinValueValidator, MaxValueValidator
from simple_history.models import HistoricalRecords
from fleet.models import Vehicle  # ← Import from fleet app

User = get_user_model()

class Collector(models.Model):
    """
    Collector Profile – Linked to CustomUser with role='collector'
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'collector'},
        related_name='collector_profile'
    )

    # Vehicle Assignment (from fleet app)
    assigned_vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_collectors'
    )

    # Shift Times
    shift_start = models.TimeField(null=True, blank=True)
    shift_end = models.TimeField(null=True, blank=True)

    # GPS & Tracking
    current_location = gis_models.PointField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)

    # Performance Metrics
    is_active = models.BooleanField(default=True)
    joined_date = models.DateField(default=timezone.now)
    total_customers = models.PositiveIntegerField(default=0, editable=False)

    # Collector Rating (1-5 stars)
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(5)],
        help_text="Average rating (1-5 stars)"
    )
    rating_count = models.PositiveIntegerField(default=0, editable=False)

    # Collection Efficiency
    expected_volume = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_volume = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    efficiency_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # AI Insights
    ai_insights = models.JSONField(default=dict, blank=True)
    last_ai_update = models.DateTimeField(null=True, blank=True)

    # Soft Delete
    is_deleted = models.BooleanField(default=False)

    # Search & History
    search_vector = SearchVectorField(null=True)
    history = HistoricalRecords()

    class Meta:
        indexes = [
            GinIndex(fields=['search_vector']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['rating']),
            models.Index(fields=['efficiency_percentage']),
        ]
        verbose_name = "Collector"
        verbose_name_plural = "Collectors"

    @property
    def phone(self):
        return self.user.phone or "-"

    @property
    def email(self):
        return self.user.email or "-"

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username

    @property
    def assigned_villages(self):
        return self.user.assigned_villages.all()  # ← uses Village.collectors

    @property
    def village_count(self):
        return self.user.assigned_villages.count()

    def __str__(self):
        return f"{self.full_name} ({self.user.username})"

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.user.username})"

    def soft_delete(self):
        self.is_deleted = True
        self.save(update_fields=['is_deleted'])

    def restore(self):
        self.is_deleted = False
        self.save(update_fields=['is_deleted'])

    def update_customer_count(self):
        self.total_customers = Customer.objects.filter(village__in=self.villages.all()).count()
        self.save(update_fields=['total_customers'])

    def update_efficiency(self):
        if self.expected_volume > 0:
            self.efficiency_percentage = (self.actual_volume / self.expected_volume) * 100
        else:
            self.efficiency_percentage = 0
        self.save(update_fields=['efficiency_percentage', 'actual_volume', 'expected_volume'])

    def update_rating(self, new_rating: float):
        self.rating_count += 1
        self.rating = ((self.rating * (self.rating_count - 1)) + new_rating) / self.rating_count
        self.save(update_fields=['rating', 'rating_count'])


class WasteCollectionSchedule(models.Model):
    """
    Waste Collection Calendar / Schedule per Village per Day
    """
    village = models.ForeignKey(Village, on_delete=models.CASCADE, related_name='collection_schedules')
    collector = models.ForeignKey(Collector, on_delete=models.SET_NULL, null=True, related_name='assigned_schedules')
    vehicle = models.ForeignKey(
        'fleet.Vehicle',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_schedules'
    )

    # Schedule Details
    day_of_week = models.PositiveSmallIntegerField(
        choices=[
            (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'), (3, 'Thursday'),
            (4, 'Friday'), (5, 'Saturday'), (6, 'Sunday')
        ],
        verbose_name="Day of Week"
    )
    week_number = models.PositiveSmallIntegerField(default=1)
    year = models.PositiveSmallIntegerField(default=timezone.now().year)

    # Status & Reporting
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    collected_waste_volume = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='approved_schedules')
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('village', 'day_of_week', 'week_number', 'year')
        indexes = [
            models.Index(fields=['collector', 'is_completed']),
            models.Index(fields=['day_of_week', 'week_number', 'year']),
        ]

    def __str__(self):
        return f"{self.village} - {self.get_day_of_week_display()} (Week {self.week_number}, {self.year})"


class VehicleTurnCount(models.Model):
    """
    Daily/Monthly Vehicle Turn Count per Village
    """
    vehicle = models.ForeignKey('fleet.Vehicle', on_delete=models.CASCADE)
    village = models.ForeignKey(Village, on_delete=models.CASCADE)
    date = models.DateField()
    turn_count = models.PositiveIntegerField(default=0)
    monthly_total = models.PositiveIntegerField(default=0, editable=False)

    class Meta:
        unique_together = ('vehicle', 'village', 'date')
        indexes = [
            models.Index(fields=['vehicle', 'village', 'date']),
            models.Index(fields=['monthly_total']),
        ]

    def __str__(self):
        return f"{self.vehicle} - {self.village} - {self.date} ({self.turn_count} turns)"


class CollectorTask(models.Model):
    """
    Daily/Weekly AI-generated tasks for collectors
    """
    collector = models.ForeignKey(Collector, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    description = models.TextField()
    priority = models.CharField(max_length=20, choices=[
        ('high', 'High'), ('medium', 'Medium'), ('low', 'Low')
    ], default='medium')
    due_date = models.DateTimeField()
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ai_generated = models.BooleanField(default=True)

    class Meta:
        ordering = ['-priority', 'due_date']

    def __str__(self):
        return f"{self.title} ({self.collector})"


class CollectorLocationHistory(models.Model):
    """
    GPS tracking history for collectors
    """
    collector = models.ForeignKey(Collector, on_delete=models.CASCADE, related_name='location_history')
    location = gis_models.PointField()
    timestamp = models.DateTimeField(default=timezone.now)
    speed = models.FloatField(null=True, blank=True)  # km/h
    battery_level = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['collector', '-timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.collector} at {self.timestamp}"


