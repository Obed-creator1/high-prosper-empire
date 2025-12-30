import csv
import re
import os
from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings
from customers.models import Customer, Village, Cell, Sector
from users.models import CustomUser
from django.contrib.auth.hashers import make_password
from datetime import datetime
from django.db.models import Count

class Command(BaseCommand):
    help = "Import or update customers from CSV, auto-create hierarchy, assign collectors, initialize balance, normalize phone, assign default email, send notifications, log errors."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_file",
            type=str,
            help="Path to the CSV file containing customers."
        )
        parser.add_argument(
            "--log_dir",
            type=str,
            default="import_logs",
            help="Directory to save the import error log."
        )

    def normalize_phone(self, phone: str) -> str:
        """Normalize phone number to start with 250 (Rwanda)."""
        phone = re.sub(r"[^\d]", "", phone)
        if phone.startswith("0"):
            phone = "250" + phone[1:]
        elif phone.startswith("250"):
            pass
        elif phone.startswith("7") or phone.startswith("78") or phone.startswith("79"):
            phone = "250" + phone
        return phone

    @transaction.atomic
    def handle(self, *args, **options):
        csv_file = options["csv_file"]
        log_dir = options["log_dir"]

        imported_count = 0
        updated_count = 0
        skipped_count = 0
        errors = []

        os.makedirs(log_dir, exist_ok=True)
        log_file_path = os.path.join(
            log_dir, f"import_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )

        # Pre-fetch collectors
        collectors = CustomUser.objects.filter(role='collector').annotate(village_count=Count('villages')).order_by('village_count')

        # Base default phone
        default_phone_base = 250780000000

        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)

            for row_number, row in enumerate(reader, start=2):
                try:
                    name = row.get("name")
                    phone = row.get("phone")
                    email = row.get("email")
                    customer_type = row.get("type", "Individual")
                    sector_name = row.get("sector", "Default Sector")
                    cell_name = row.get("cell", "Default Cell")
                    village_name = row.get("village")
                    monthly_fee = float(row.get("monthly_fee", 0))
                    unpaid_months = int(row.get("unpaid_months", 0))
                    overpaid_months = int(row.get("overpaid_months", 0))

                    if not name:
                        raise ValueError("Missing required field: 'name'")

                    log_message = f"Row {row_number}: {name} - "

                    # Assign default phone if missing
                    used_default_phone = False
                    if not phone:
                        candidate_phone = default_phone_base + 1
                        while CustomUser.objects.filter(phone=str(candidate_phone)).exists():
                            candidate_phone += 1
                        phone = str(candidate_phone)
                        used_default_phone = True
                        log_message += f"default phone {phone}; "

                    # Normalize phone
                    phone_clean = self.normalize_phone(phone)

                    # Validate phone
                    if not re.match(r"^250\d{9}$", phone_clean):
                        skipped_count += 1
                        errors.append(f"Row {row_number}: Invalid phone number '{phone}' after normalization")
                        self.stdout.write(self.style.WARNING(f"Skipped invalid phone row {row_number}: {phone}"))
                        continue

                    # Assign default email if missing
                    used_default_email = False
                    if not email:
                        email = f"customer{phone_clean}@example.com"
                        used_default_email = True
                        log_message += f"default email {email}; "

                    # Ensure sector
                    sector, _ = Sector.objects.get_or_create(name=sector_name)

                    # Ensure cell
                    cell, _ = Cell.objects.get_or_create(name=cell_name, sector=sector)

                    # Handle village
                    village = None
                    if village_name:
                        village = Village.objects.filter(name=village_name).first()
                        if not village:
                            collector = collectors.first() if collectors.exists() else None
                            if collector:
                                collectors = collectors.annotate(village_count=Count('villages')).order_by('village_count')
                            village = Village.objects.create(name=village_name, cell=cell, collector=collector)
                            collector_name = collector.username if collector else "None"
                            self.stdout.write(self.style.SUCCESS(
                                f"Auto-created village '{village_name}' under cell '{cell.name}' with collector '{collector_name}'"
                            ))

                    # Check if user exists
                    user = CustomUser.objects.filter(phone=phone_clean).first()
                    if user:
                        # Update user info
                        user.email = email
                        user.username = phone_clean
                        user.is_active = True
                        user.save()
                        customer, created = Customer.objects.update_or_create(
                            user=user,
                            defaults={
                                "name": name,
                                "phone": phone_clean,
                                "email": email,
                                "village": village,
                                "monthly_fee": monthly_fee,
                                "type": customer_type
                            }
                        )
                        updated_count += 1
                        self.stdout.write(self.style.SUCCESS(f"Updated customer: {name}"))
                    else:
                        # Create new user
                        user = CustomUser.objects.create(
                            username=phone_clean,
                            password=make_password("default123"),
                            phone=phone_clean,
                            email=email,
                            is_active=True,
                        )
                        customer = Customer.objects.create(
                            user=user,
                            name=name,
                            phone=phone_clean,
                            email=email,
                            village=village,
                            monthly_fee=monthly_fee,
                            type=customer_type
                        )
                        imported_count += 1
                        self.stdout.write(self.style.SUCCESS(f"Imported customer: {name}"))

                    # Initialize balance
                    customer.calculate_outstanding(unpaid_months=unpaid_months, overpaid_months=overpaid_months)

                    # Log defaults
                    if used_default_phone or used_default_email:
                        log_message += "Imported/Updated with defaults."
                        errors.append(log_message)

                except Exception as e:
                    error_message = f"Row {row_number}: {e}"
                    errors.append(error_message)
                    self.stdout.write(self.style.ERROR(f"Failed to import/update row {row_number}: {e}"))

        # Write log file
        if errors:
            with open(log_file_path, "w", encoding="utf-8") as log_file:
                log_file.write("\n".join(errors))
            self.stdout.write(self.style.WARNING(f"Import log saved to: {log_file_path}"))

        self.stdout.write(self.style.SUCCESS(f"Successfully imported {imported_count} new customers"))
        self.stdout.write(self.style.SUCCESS(f"Successfully updated {updated_count} existing customers"))
        self.stdout.write(self.style.WARNING(f"Skipped {skipped_count} customers due to invalid data"))
