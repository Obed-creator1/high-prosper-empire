# backend/tenants/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify
from django.core.validators import RegexValidator

User = get_user_model()


class Company(models.Model):
    """
    Represents a tenant/company in the multi-tenant system.
    Each company has its own isolated users, branches, data, and branding.
    """
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Official company/organization name"
    )
    slug = models.SlugField(
        max_length=255,
        unique=True,
        blank=True,
        help_text="Used for subdomains (e.g. company.highprosper.com)"
    )
    logo = models.ImageField(
        upload_to='companies/logos/',
        blank=True,
        null=True,
        help_text="Company logo (recommended 200x200 px)"
    )
    website = models.URLField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Website URL"
    )
    email = models.EmailField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Primary company contact email"
    )
    phone_regex = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
    )
    phone = models.CharField(
        validators=[phone_regex],
        max_length=17,
        blank=True,
        null=True,
        help_text="Primary contact phone number (international format)"
    )
    address = models.TextField(
        blank=True,
        null=True,
        help_text="Full physical address"
    )
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, default='Rwanda')
    currency = models.CharField(
        max_length=3,
        default='RWF',
        help_text="ISO 4217 currency code (e.g. RWF, USD)"
    )
    timezone = models.CharField(
        max_length=63,
        default='Africa/Kigali',
        help_text="IANA timezone name"
    )
    tax_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="VAT/TIN Number"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the company is active in the system"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies_created',
        help_text="Admin who created this company"
    )

    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        ordering = ['name']
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def subdomain_url(self):
        """Example: http://company-name.highprosper.com"""
        return f"http://{self.slug}.highprosper.com"


class Branch(models.Model):
    """
    Physical or logical branch/office of a Company.
    Users can be assigned to specific branches.
    """
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name='branches',
        help_text="Parent company this branch belongs to"
    )
    name = models.CharField(
        max_length=255,
        help_text="Branch name (e.g. Kigali Headquarters, Rubavu Depot)"
    )
    slug = models.SlugField(max_length=255, blank=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    manager = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_branches',
        help_text="Branch manager (optional)"
    )

    class Meta:
        verbose_name = "Branch"
        verbose_name_plural = "Branches"
        unique_together = ['company', 'name']
        ordering = ['company__name', 'name']
        indexes = [
            models.Index(fields=['company', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} ({self.company.name})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.company.name}-{self.name}")
        super().save(*args, **kwargs)