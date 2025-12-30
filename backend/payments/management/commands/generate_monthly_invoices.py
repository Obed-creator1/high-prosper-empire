# payments/management/commands/generate_monthly_invoices.py
from django.contrib.humanize.templatetags.humanize import intcomma
from django.core.management.base import BaseCommand
from django.utils import timezone
from customers.models import Customer
from payments.models import Invoice
from django.conf import settings
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from django.core.files.base import ContentFile

class Command(BaseCommand):
    help = 'Generate monthly invoices with PDFs for all active customers'

    def handle(self, *args, **options):
        today = timezone.now().date()
        active_customers = Customer.objects.filter(status='Active', monthly_fee__gt=0)

        generated = 0
        for customer in active_customers:
            invoice, created = Invoice.objects.get_or_create(
                customer=customer,
                period_month=today.month,
                period_year=today.year,
                defaults={
                    'amount': customer.monthly_fee,
                    'due_date': today.replace(day=25),  # Due 25th
                    'status': 'Pending',
                }
            )

            if created:
                # Generate PDF
                pdf_buffer = self.generate_pdf(invoice)
                filename = f"invoice_{invoice.uid}.pdf"
                invoice.pdf_file.save(filename, ContentFile(pdf_buffer.getvalue()))
                invoice.save()
                generated += 1

        self.stdout.write(self.style.SUCCESS(f"Generated {generated} new invoices with PDFs"))

    def generate_pdf(self, invoice):
        from io import BytesIO
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        p.setFont("Helvetica-Bold", 20)
        p.drawString(2*cm, height - 3*cm, "HIGH PROSPER INVOICE")

        p.setFont("Helvetica", 12)
        p.drawString(2*cm, height - 5*cm, f"Customer: {invoice.customer.name}")
        p.drawString(2*cm, height - 6*cm, f"Account: {invoice.customer.payment_account}")
        p.drawString(2*cm, height - 7*cm, f"Period: {invoice.period_month:02d}/{invoice.period_year}")
        p.drawString(2*cm, height - 9*cm, f"Amount Due: RWF {intcomma(invoice.amount)}")
        p.drawString(2*cm, height - 10*cm, f"Due Date: {invoice.due_date}")

        p.drawImage("static/logo.png", width - 8*cm, height - 4*cm, width=6*cm, height=2*cm)

        p.showPage()
        p.save()
        buffer.seek(0)
        return buffer