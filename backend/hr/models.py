import datetime
from decimal import Decimal
from django.contrib.auth import get_user_model
from celery import current_app
from django.conf import settings
from django.db import models
from django.utils import timezone
from notifications.signals import notify
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from webpush import send_user_notification
from django.core.exceptions import ObjectDoesNotExist
from users.models import CustomUser
import logging
from django.core.mail import EmailMessage
from django.template.loader import render_to_string
from weasyprint import HTML

logger = logging.getLogger(__name__)
User = get_user_model()

class Staff(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('On Leave', 'On Leave'),
    ]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='staff_profile')
    department = models.CharField(max_length=50)
    position = models.CharField(max_length=100, blank=True, null=True, default="Employee")
    contract = models.TextField(blank=True)
    contract_file = models.FileField(upload_to='staff_contracts/', blank=True, null=True)
    profile_photo = models.ImageField(upload_to='staff_photos/', blank=True, null=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    journal_entry = models.ForeignKey('accounting.JournalEntry', on_delete=models.SET_NULL, null=True, related_name='staff_records')

    def __str__(self):
        return self.user.username

class PerformanceScore(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    month = models.DateField()
    attendance = models.FloatField()
    productivity = models.FloatField()
    quality = models.FloatField()
    teamwork = models.FloatField()
    initiative = models.FloatField()
    leadership = models.FloatField()
    overall_score = models.FloatField()
    created_at = models.DateTimeField(auto_now_add=True)

class SentimentFeedback(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    comment = models.TextField()
    sentiment_score = models.FloatField()  # -1 to 1
    sentiment_label = models.CharField(max_length=20)  # positive/neutral/negative
    created_at = models.DateTimeField(auto_now_add=True)

class Payroll(models.Model):
    staff = models.ForeignKey('hr.Staff', on_delete=models.CASCADE, related_name='payrolls')
    month = models.IntegerField(
        choices=[(i, name) for i, name in enumerate([
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ], 1)]
    )
    year = models.IntegerField()
    bonus = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    advance_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cnps_employee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    family_allowance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    communal_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    irpp_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_pay = models.DecimalField(max_digits=12, decimal_places=2, editable=False, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('staff', 'month', 'year')
        ordering = ['-year', '-month']

    def calculate_taxes(self):
        gross = (self.staff.salary or Decimal('0')) + self.bonus

        # CNPS & Taxes
        self.cnps_employee = round(gross * Decimal('0.042'), 2)
        self.family_allowance = round(gross * Decimal('0.015'), 2)
        self.communal_tax = round(gross * Decimal('0.0075'), 2)

        taxable = gross - self.cnps_employee
        annual_taxable = taxable * 12

        # IRPP 2025 Progressive Tax (Cameroon)
        if annual_taxable <= 2_000_000:
            irpp_annual = Decimal('0')
        elif annual_taxable <= 3_000_000:
            irpp_annual = (annual_taxable - 2_000_000) * Decimal('0.10')
        elif annual_taxable <= 5_000_000:
            irpp_annual = Decimal('100000') + (annual_taxable - 3_000_000) * Decimal('0.15')
        elif annual_taxable <= 10_000_000:
            irpp_annual = Decimal('400000') + (annual_taxable - 5_000_000) * Decimal('0.25')
        else:
            irpp_annual = Decimal('1650000') + (annual_taxable - 10_000_000) * Decimal('0.35')

        self.irpp_tax = round(irpp_annual / 12, 2)

        deductions = self.cnps_employee + self.irpp_tax + self.family_allowance + self.communal_tax
        base_net = gross - deductions
        return base_net

    def save(self, *args, **kwargs):
        is_new = self.pk is None

        # 1. Calculate total & taxes BEFORE saving
        self.total = (self.staff.salary or Decimal('0')) + self.bonus
        base_net_pay = self.calculate_taxes()

        # 2. Save first to get created_at and pk
        super().save(*args, **kwargs)

        # 3. NOW safe to use self.created_at
        advance_deduction = Decimal('0')

        if self.staff:
            from .models import SalaryAdvanceRepayment  # Lazy import to avoid circular

            pending_repayments = SalaryAdvanceRepayment.objects.filter(
                advance__staff=self.staff,
                advance__status='approved',
                paid=False,
                due_date__lte=self.created_at.date()
            )

            for repayment in pending_repayments:
                advance_deduction += repayment.amount
                repayment.paid = True
                repayment.paid_at = timezone.now()
                repayment.payroll = self
                repayment.save(update_fields=['paid', 'paid_at', 'payroll'])

        self.advance_deduction = advance_deduction
        self.net_pay = base_net_pay - advance_deduction
        super().save(update_fields=['advance_deduction', 'net_pay'])  # Final save

        # 4. Only run side effects on creation
        if is_new:
            # Auto-create approval
            PayrollApproval.objects.get_or_create(payroll=self, defaults={'status': 'pending'})

            # Journal Entry
            try:
                from accounting.models import JournalEntry
                JournalEntry.objects.create(
                    staff=self.staff,
                    amount=self.total,
                    date=self.created_at.date(),
                    description=f"Payroll {self.get_month_display()} {self.year}"
                )
            except Exception as e:
                logger.warning(f"JournalEntry failed: {e}")

            # Email Payslip
            try:
                html_string = render_to_string('payroll/payslip_email.html', {
                    'payroll': self,
                    'staff': self.staff,
                })
                pdf_file = HTML(string=html_string).write_pdf()

                email = EmailMessage(
                    subject=f"Your Payslip — {self.get_month_display()} {self.year}",
                    body="See attached payslip.",
                    from_email="payroll@highprosper.com",
                    to=[self.staff.user.email],
                )
                filename = f"Payslip_{self.staff.user.username}_{self.month}_{self.year}.pdf"
                email.attach(filename, pdf_file, 'application/pdf')
                email.send()
            except Exception as e:
                logger.error(f"Payslip email failed: {e}")

    def get_month_display(self):
        import calendar
        return calendar.month_name[self.month]

    def __str__(self):
        return f"{self.staff} — {self.get_month_display()} {self.year}"

class PayrollApproval(models.Model):
    payroll = models.OneToOneField(Payroll, on_delete=models.CASCADE, related_name='approval')
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    approved_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    comments = models.TextField(blank=True)
    signature = models.TextField(blank=True)  # Base64 PNG

    def __str__(self):
        return f"Approval for {self.payroll}"

    def save(self, *args, **kwargs):
        if self.status == 'approved' and not self.approved_at:
            self.approved_at = timezone.now()
            self.approved_by = getattr(settings, 'CURRENT_USER', None)  # Optional: set from request
        super().save(*args, **kwargs)


class SalaryAdvance(models.Model):
    staff = models.ForeignKey('hr.Staff', on_delete=models.CASCADE, related_name='salaryadvance_set')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ], default='pending')
    approved_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    approved_at = models.DateTimeField(null=True, blank=True)
    paid = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        # Detect if just approved
        if self.pk:
            old = SalaryAdvance.objects.get(pk=self.pk)
            was_approved = old.status == 'approved'
        else:
            was_approved = False

        is_now_approved = self.status == 'approved'
        is_newly_approved = is_now_approved and not was_approved

        super().save(*args, **kwargs)

        # Auto-create 3-month repayment schedule
        if is_newly_approved and not self.repayments.exists():
            monthly = self.amount / Decimal('3')
            today = timezone.now().date()

            for i in range(1, 4):
                due = today + timezone.timedelta(days=30 * i)
                SalaryAdvanceRepayment.objects.create(
                    advance=self,
                    amount=round(monthly, 2) if i < 3 else (self.amount - monthly * 2),  # Avoid rounding error
                    due_date=due
                )

            self.paid = True
            self.save(update_fields=['paid'])


class SalaryAdvanceRepayment(models.Model):
    advance = models.ForeignKey(SalaryAdvance, on_delete=models.CASCADE, related_name='repayments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField()
    paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    payroll = models.ForeignKey(Payroll, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ['due_date']


    def __str__(self):
        return f"{self.advance.staff} - {self.amount} CFA - {self.due_date}"

class Leave(models.Model):
    STATUS_CHOICES = [('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')]
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='leaves')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

class Attendance(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='attendances')
    date = models.DateField()
    status = models.CharField(max_length=20, choices=[('Present', 'Present'), ('Absent', 'Absent'), ('Late', 'Late')])
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)

class Mission(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='missions')
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=[('Assigned', 'Assigned'), ('Completed', 'Completed')])

class ExtraWork(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='extra_works')
    date = models.DateField()
    hours = models.DecimalField(max_digits=5, decimal_places=2)
    description = models.TextField(blank=True)
    approved = models.BooleanField(default=False)

class Vacation(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='vacations')
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')])

class Complaint(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='complaints')
    subject = models.CharField(max_length=100)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=[('Open', 'Open'), ('Resolved', 'Resolved')])

class Loan(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='loans')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    purpose = models.TextField()
    status = models.CharField(max_length=20, choices=[('Pending', 'Pending'), ('Approved', 'Approved'), ('Rejected', 'Rejected')])
    created_at = models.DateTimeField(auto_now_add=True)

class Report(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='reports')
    subject = models.CharField(max_length=100)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)


class Task(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
    ]
    PRIORITY_CHOICES = [
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    ]
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    assigned_to = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title