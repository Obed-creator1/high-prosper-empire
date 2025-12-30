# backend/procurement/signals.py
import logging
from io import BytesIO
from django.db import transaction
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from django.core.mail import EmailMessage, send_mail
from django.template.loader import render_to_string
from django.conf import settings
from weasyprint import HTML

from .models import (
    PurchaseRequisition,
    PurchaseOrder,
    GoodsReceiptItem,
    SupplierInvoice,
)
from .blockchain import verify_invoice_on_blockchain
from .whatsapp import send_po_whatsapp
from stock.models import WarehouseStock, StockTransaction
from billing.models import UsageRecord

logger = logging.getLogger(__name__)


# =============================================================================
# 1. PO: Auto Email + WhatsApp on 'sent' status
# =============================================================================
@receiver(post_save, sender=PurchaseOrder)
def auto_send_po_on_status_sent(sender, instance, created, **kwargs):
    """Send PO via email + WhatsApp when status changes to 'sent'"""
    if created:
        return

    # Only trigger on status change to 'sent'
    if instance.status == 'sent' and instance.tracker.previous('status') != 'sent':
        logger.info(f"PO {instance.po_number} status changed to 'sent' — triggering delivery")

        # WhatsApp
        try:
            if send_po_whatsapp(instance):
                logger.info(f"PO {instance.po_number} sent via WhatsApp")
        except Exception as e:
            logger.error(f"WhatsApp failed for PO {instance.po_number}: {e}")

        # Email with PDF
        try:
            supplier = instance.supplier
            if not supplier.email:
                logger.warning(f"PO {instance.po_number} has no supplier email")
                return

            html_string = render_to_string('pdf/po_template.html', {
                'po': instance,
                'company': {
                    'name': 'High Prosper Ltd',
                    'address': '123 Business Avenue, Nairobi, Kenya',
                    'phone': '+254 700 000 000',
                    'email': 'procurement@highprosper.com'
                }
            })
            pdf_buffer = BytesIO()
            HTML(string=html_string).write_pdf(pdf_buffer)
            pdf_buffer.seek(0)

            subject = f"Purchase Order {instance.po_number} - High Prosper Ltd"
            body = f"""
Dear {supplier.contact_person or supplier.name},

Your Purchase Order {instance.po_number} has been approved and issued.

Order Date: {instance.order_date}
Expected Delivery: {instance.expected_delivery_date}
Total Amount: {instance.currency} {instance.grand_total:,.2f}

Please confirm receipt and delivery schedule.

Thank you for your partnership.

Best regards,
Procurement Department
High Prosper Ltd
procurement@highprosper.com
            """

            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[supplier.email],
                cc=[instance.approved_by.email] if instance.approved_by else [],
                reply_to=[instance.approved_by.email or settings.DEFAULT_FROM_EMAIL],
            )
            email.attach(f"PO-{instance.po_number}.pdf", pdf_buffer.getvalue(), "application/pdf")
            email.send(fail_silently=False)

            logger.info(f"PO {instance.po_number} emailed to {supplier.email}")

        except Exception as e:
            logger.error(f"Failed to email PO {instance.po_number}: {e}")


# =============================================================================
# 2. PR: Notify on submission
# =============================================================================
@receiver(post_save, sender=PurchaseRequisition)
def notify_approver_on_pr_submit(sender, instance, created, **kwargs):
    if not created and instance.status == 'submitted':
        send_mail(
            subject=f"New PR {instance.pr_number} Needs Approval",
            message=f"""
Please review and approve/reject:

PR Number: {instance.pr_number}
Title: {instance.title}
Requester: {instance.requester.get_full_name() if instance.requester else 'Unknown'}
Department: {instance.department}
Required By: {instance.required_by_date}

View: https://erp.highprosper.com/admin/procurement/purchaserequisition/{instance.id}/change/
            """,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['procurement.manager@highprosper.com'],
        )


# =============================================================================
# 3. GRN: Update Stock on Receipt
# =============================================================================
@receiver(post_save, sender=GoodsReceiptItem)
def update_stock_from_grn(sender, instance, created, **kwargs):
    """When GRN item is saved, increase stock in warehouse"""
    if not created:
        return

    po_item = instance.po_item
    if not po_item.item or not po_item.item.track_inventory:
        return

    stock_record = po_item.item.stock_record
    if not stock_record:
        logger.warning(f"Item {po_item.item.sku} has no linked stock record")
        return

    warehouse = instance.goods_receipt.purchase_order.delivery_address_warehouse  # or default
    # Fallback to company default warehouse
    if not warehouse:
        warehouse = instance.goods_receipt.purchase_order.company.default_warehouse

    with transaction.atomic():
        ws, _ = WarehouseStock.objects.select_for_update().get_or_create(
            stock=stock_record,
            warehouse=warehouse,
            defaults={'unit_price': po_item.unit_price}
        )
        ws.quantity += instance.quantity_accepted
        ws.unit_price = po_item.unit_price  # Update cost
        ws.save()

        # Record transaction
        StockTransaction.objects.create(
            stock=stock_record,
            to_warehouse=warehouse,
            transaction_type='in',
            quantity=instance.quantity_accepted,
            unit_price=po_item.unit_price,
            reference=f"GRN-{instance.goods_receipt.grn_number}",
            user=instance.goods_receipt.received_by,
            notes=f"Received via GRN for PO {instance.goods_receipt.purchase_order.po_number}"
        )

        logger.info(f"Stock updated: +{instance.quantity_accepted} {stock_record.name}")


# =============================================================================
# 4. Invoice: Auto 3-Way Match + Blockchain Verify
# =============================================================================
@receiver(post_save, sender=SupplierInvoice)
def process_new_invoice(sender, instance, created, **kwargs):
    if not created:
        return

    # 3-Way Match
    po = instance.purchase_order
    if po:
        received_qty = {}
        for grn in po.receipts.all():
            for item in grn.items.all():
                received_qty[item.po_item.id] = received_qty.get(item.po_item.id, 0) + item.quantity_accepted

        matched = True
        discrepancies = []
        for inv_item in instance.items.all():  # assuming you have invoice line items
            ordered = inv_item.po_item.quantity_ordered
            received = received_qty.get(inv_item.po_item.id, 0)
            invoiced = inv_item.quantity

            if abs(ordered - received) > 0.01 or abs(received - invoiced) > 0.01:
                matched = False
                discrepancies.append(f"{inv_item.po_item.description}: O:{ordered} R:{received} I:{invoiced}")

        if matched:
            instance.status = 'matched'
            send_mail(
                "Invoice Auto-Matched ✓",
                f"Invoice {instance.invoice_number} fully matches PO {po.po_number} and GRNs.",
                settings.DEFAULT_FROM_EMAIL,
                ['finance@highprosper.com']
            )
        else:
            instance.status = 'discrepancy'
            instance.notes += f"\n3-Way Match Failed: {'; '.join(discrepancies)}"
        instance.save()

    # Blockchain Verification
    if instance.attachment:
        trusted_suppliers = ["Trusted Corp Ltd", "Global Solar Inc"]
        if instance.supplier.name in trusted_suppliers:
            try:
                if verify_invoice_on_blockchain(instance):
                    logger.info(f"Invoice {instance.invoice_number} blockchain verified")
            except Exception as e:
                logger.error(f"Blockchain verify failed: {e}")


# =============================================================================
# 5. Billing: Track PR Creation for Usage Limits
# =============================================================================
@receiver(post_save, sender=PurchaseRequisition)
def track_pr_for_billing(sender, instance, created, **kwargs):
    if not created:
        return

    company = instance.company
    UsageRecord.objects.create(
        company=company,
        metric='prs_created',
        quantity=1
    )

    # Enforce plan limits
    if hasattr(company, 'subscription') and company.subscription.plan.slug == 'starter':
        monthly_count = UsageRecord.objects.filter(
            company=company,
            metric='prs_created',
            recorded_at__gte=timezone.now().replace(day=1, hour=0, minute=0, second=0)
        ).count()

        if monthly_count > 50:
            send_mail(
                "PR Limit Reached",
                f"Company {company.name} has exceeded 50 PRs this month.",
                settings.DEFAULT_FROM_EMAIL,
                ['admin@highprosper.com']
            )