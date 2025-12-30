# payments/management/commands/send_voice_reminders.py
from django.core.management.base import BaseCommand
from payments.models import Invoice
from hr.services import AIVoiceReminderService

class Command(BaseCommand):
    help = 'Initiate AI voice calls for 3-day overdue invoices'

    def handle(self, *args, **options):
        overdue_invoices = Invoice.objects.filter(
            status__in=['Pending', 'Overdue'],
            remaining__gt=0,
            customer__phone__isnull=False
        )

        calls_made = 0
        for invoice in overdue_invoices:
            if AIVoiceReminderService.initiate_voice_reminder(invoice):
                calls_made += 1

        self.stdout.write(self.style.SUCCESS(f"AI voice calls initiated: {calls_made}"))