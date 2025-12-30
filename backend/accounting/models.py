from django.db import models
from django.conf import settings  # import settings for custom user model
from django.utils import timezone
from customers.models import Customer
from users.models import CustomUser


class Account(models.Model):
    ACCOUNT_TYPES = [
        ('Asset', 'Asset'),
        ('Liability', 'Liability'),
        ('Equity', 'Equity'),
        ('Revenue', 'Revenue'),
        ('Expense', 'Expense'),
    ]
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=200)
    type = models.CharField(max_length=20, choices=ACCOUNT_TYPES, default="Asset")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class JournalEntry(models.Model):
    DEBIT_CREDIT = [('debit', 'Debit'), ('credit', 'Credit')]

    date = models.DateField(default=timezone.now)
    description = models.CharField(max_length=500)
    reference = models.CharField(max_length=100, blank=True)
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name='entries')
    debit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_posted = models.BooleanField(default=True)

    class Meta:
        ordering = ['-date', '-id']

    def save(self, *args, **kwargs):
        # Auto-balance check
        if self.debit > 0 and self.credit > 0:
            raise ValueError("Entry cannot have both debit and credit")
        super().save(*args, **kwargs)

        # Update account balance
        if self.is_posted:
            if self.debit > 0:
                self.account.balance += self.debit
            if self.credit > 0:
                self.account.balance -= self.credit
            self.account.save()

    def __str__(self):
        return f"{self.date} | {self.description[:50]}"

class Receivable(models.Model):
    customer = models.ForeignKey('customers.Customer', on_delete=models.PROTECT)
    invoice_number = models.CharField(max_length=50)
    date = models.DateField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='Pending', choices=[
        ('Pending', 'Pending'), ('Partially Paid', 'Partially Paid'), ('Paid', 'Paid'), ('Overdue', 'Overdue')
    ])

    @property
    def outstanding(self):
        return self.amount - self.paid_amount

    def save(self, *args, **kwargs):
        if self.outstanding <= 0:
            self.status = 'Paid'
        elif self.paid_amount > 0:
            self.status = 'Partially Paid'
        elif self.due_date < timezone.now().date():
            self.status = 'Overdue'
        super().save(*args, **kwargs)

class Payable(models.Model):
    supplier_name = models.CharField(max_length=200)
    bill_number = models.CharField(max_length=50)
    date = models.DateField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default='Pending')

    @property
    def outstanding(self):
        return self.amount - self.paid_amount

class Revenue(models.Model):
    date = models.DateField(default=timezone.now)
    source = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"Revenue from {self.source} - {self.amount}"

class Expense(models.Model):
    date = models.DateField(default=timezone.now)
    category = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"Expense {self.category} - {self.amount}"


class GeneralLedger(models.Model):
    date = models.DateField(default=timezone.now)
    account = models.CharField(max_length=100)
    debit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.account} - {self.date}"

    def clean(self):
        if self.debit > 0 and self.credit > 0:
            raise ValueError("An entry cannot have both debit and credit amounts.")