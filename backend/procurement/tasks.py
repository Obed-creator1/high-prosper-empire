# backend/procurement/tasks.py  (Celery + Beat)
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail

from .ai_agent import ProsperBot
from .ai_scoring import calculate_supplier_score
from .models import Supplier, PurchaseOrder
from django.core.mail import EmailMessage
from django.conf import settings
from django.template.loader import render_to_string
from weasyprint import HTML
from io import BytesIO
import logging

logger = logging.getLogger(__name__)

@shared_task
def email_po_to_supplier_task(po_id):
    from procurement.models import PurchaseOrder

    try:
        po = PurchaseOrder.objects.get(id=po_id)
        supplier = po.supplier

        if not supplier.email:
            logger.warning(f"PO {po.po_number} has no supplier email")
            return

        # Generate PDF
        html_string = render_to_string('pdf/po_template.html', {
            'po': po,
            'company': {
                'name': 'High Prosper Ltd',
                'address': '123 Business Ave, Nairobi, Kenya',
                'phone': '+254 700 000 000',
                'email': 'procurement@highprosper.com'
            }
        })
        pdf_buffer = BytesIO()
        HTML(string=html_string).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)

        # Send email
        subject = f"Purchase Order {po.po_number} - High Prosper Ltd"
        body = f"Dear {supplier.contact_person or supplier.name},\n\nPlease find your Purchase Order attached.\n\nBest regards,\nHigh Prosper Team"

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[supplier.email],
            cc=[po.created_by.email] if po.created_by else [],
        )
        email.attach(f"PO-{po.po_number}.pdf", pdf_buffer.getvalue(), "application/pdf")
        email.send()

        # Update status
        po.status = 'sent'
        po.save(update_fields=['status'])

        logger.info(f"PO {po.po_number} emailed successfully")

    except Exception as e:
        logger.error(f"Failed to email PO {po_id}: {str(e)}")
        raise


@shared_task
def send_grn_reminders():
    today = timezone.now().date()
    reminder_date = today + timedelta(days=3)

    upcoming_pos = PurchaseOrder.objects.filter(
        expected_delivery_date=reminder_date,
        status__in=['sent', 'confirmed', 'partially_received']
    )

    for po in upcoming_pos:
        # Send to warehouse + procurement
        recipients = ['warehouse@highprosper.com', 'procurement@highprosper.com']
        if po.created_by and po.created_by.email:
            recipients.append(po.created_by.email)

        send_mail(
            subject=f"GRN Reminder: PO {po.po_number} Due in 3 Days",
            message=f"""
            Purchase Order {po.po_number} from {po.supplier.name} is due for delivery on {po.expected_delivery_date}.

            Please prepare to receive and inspect goods.

            Total Value: {po.currency} {po.grand_total:,.2f}
            Items: {po.items.count()}

            Create GRN here: https://erp.highprosper.com/procurement/grn/create/?po={po.id}
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipients,
            fail_silently=False,
        )

# tasks.py
@shared_task
def update_all_supplier_scores():
    for supplier in Supplier.objects.filter(is_approved=True):
        calculate_supplier_score(supplier)

@shared_task
def check_procurement_inbox():
    import imaplib
    import email

    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(settings.BOT_EMAIL, settings.BOT_PASSWORD)
    mail.select("inbox")

    status, messages = mail.search(None, '(FROM "field@highprosper.com" SUBJECT "need" OR "request" OR "buy")')
    for num in messages[0].split():
        res, msg = mail.fetch(num, "(RFC822)")
        raw = msg[0][1]
        msg = email.message_from_bytes(raw)

        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode()
        else:
            body = msg.get_payload(decode=True).decode()

        sender = msg["From"]
        ProsperBot().process_incoming_request("email", body, sender)