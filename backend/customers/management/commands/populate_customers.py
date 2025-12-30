from django.core.management.base import BaseCommand
from customers.models import Customer
import random

SECTORS = ['Sector A', 'Sector B', 'Sector C']
CELLS = ['Cell 1', 'Cell 2', 'Cell 3']
VILLAGES = ['Village I', 'Village II', 'Village III']

class Command(BaseCommand):
    help = "Populate the database with dummy customers"

    def handle(self, *args, **kwargs):
        Customer.objects.all().delete()
        for i in range(1, 1001):  # 1,000 dummy customers
            c = Customer.objects.create(
                type=random.choice(['individual','corporate']),
                names=f'Customer {i}',
                contact_no=f'0788{random.randint(100000,999999)}',
                account_number=f'AC{i:05d}',
                monthly_fee=random.randint(1000,5000),
                outstanding=random.randint(0,2000),
                status=random.choice(['active','passive']),
                sector=random.choice(SECTORS),
                cell=random.choice(CELLS),
                village=random.choice(VILLAGES)
            )
        self.stdout.write(self.style.SUCCESS('Successfully populated 1000 customers'))
