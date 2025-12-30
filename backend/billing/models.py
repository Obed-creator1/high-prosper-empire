# backend/billing/models.py
from django.db import models
from tenants.models import Company
import stripe

class Plan(models.Model):
    stripe_price_id_monthly = models.CharField(max_length=100, blank=True)
    stripe_price_id_yearly = models.CharField(max_length=100, blank=True)
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
    price_monthly = models.IntegerField(null=True, blank=True)  # cents
    price_yearly = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class Subscription(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='subscription')
    stripe_customer_id = models.CharField(max_length=100)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    plan = models.ForeignKey(Plan, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, default='trialing')  # active, past_due, canceled
    current_period_end = models.DateTimeField()
    trial_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.company.name} - {self.plan.name}"

class UsageRecord(models.Model):
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    metric = models.CharField(max_length=50)  # e.g., 'prs_created', 'pos_issued'
    quantity = models.PositiveIntegerField()
    recorded_at = models.DateTimeField(auto_now_add=True)