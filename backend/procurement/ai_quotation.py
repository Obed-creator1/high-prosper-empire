# backend/procurement/ai_quotation.py
from datetime import timedelta

from django.utils import timezone

from .models import PurchaseOrderItem, PurchaseOrder


def select_winning_quotation(rfq):
    quotations = rfq.quotations.all()
    if not quotations:
        return None

    best = None
    best_score = -1

    for quote in quotations:
        supplier = quote.supplier

        # Weighted scoring
        price_score = (min(q.total_amount for q in quotations) / quote.total_amount) * 100  # Lower price = higher score
        delivery_score = 100 - (quote.delivery_lead_time_days or 30) * 2  # Faster = better
        supplier_score = supplier.performance_score or 50

        # Final weighted score
        total_score = (price_score * 0.5) + (delivery_score * 0.3) + (supplier_score * 0.2)

        if total_score > best_score:
            best_score = total_score
            best = quote

    # Auto-create PO from winning quote
    if best:
        po = PurchaseOrder.objects.create(
            requisition=rfq.requisition,
            quotation=best,
            supplier=best.supplier,
            expected_delivery_date=timezone.now().date() + timedelta(days=best.delivery_lead_time_days or 14),
            total_amount=best.total_amount,
            grand_total=best.total_amount,
            currency='USD',
            payment_terms=best.payment_terms,
            delivery_address=rfq.requisition.department + " Warehouse",
            created_by=rfq.created_by,
            status='draft'
        )

        # Copy items
        for item in rfq.requisition.items.all():
            PurchaseOrderItem.objects.create(
                purchase_order=po,
                item=item.item,
                description=item.description,
                quantity_ordered=item.quantity,
                unit_price=best.total_amount / rfq.requisition.items.count(),  # Simplified
            )

        return {"winner": best, "po": po, "score": best_score}

    return None