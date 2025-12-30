# payments/management/commands/send_invoice_reminders.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from payments.models import Invoice
from hr.services import SMSReminderService

class Command(BaseCommand):
    help = 'Send SMS invoice reminders (7 days before, due day, 3 days late)'

    def handle(self, *args, **options):
        today = timezone.now().date()
        target_dates = [
            today + timezone.timedelta(days=7),  # 7 days before
            today,                                # Due today
            today - timezone.timedelta(days=3),   # 3 days overdue
        ]

        reminders_sent = 0
        for due_date in target_dates:
            invoices = Invoice.objects.filter(
                due_date=due_date,
                status__in=['Pending', 'Overdue'],
                customer__phone__isnull=False
            )
            for invoice in invoices:
                if SMSReminderService.send_invoice_reminder(invoice):
                    reminders_sent += 1
                    # Optional: log sent reminder
                    invoice.sent_via.append('sms')
                    invoice.save(update_fields=['sent_via'])

        self.stdout.write(
            self.style.SUCCESS(f"SMS reminders sent: {reminders_sent}")
        )