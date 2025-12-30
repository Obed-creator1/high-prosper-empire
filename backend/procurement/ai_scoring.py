# backend/procurement/ai_scoring.py
from django.db.models import Avg, Count, F
from datetime import timedelta
from django.utils import timezone

from .models import GoodsReceipt


def calculate_supplier_score(supplier):
    score = 100.0
    reasons = []

    # 1. On-time delivery (40%)
    pos = supplier.purchaseorder_set.filter(status__in=['fully_received', 'closed'])
    total_pos = pos.count()
    if total_pos > 0:
        on_time = pos.filter(receipts__receipt_date__lte=F('expected_delivery_date')).count()
        delivery_rate = (on_time / total_pos) * 100
        score = score * (delivery_rate / 100)
        reasons.append(f"Delivery: {delivery_rate:.1f}%")

    # 2. Quality acceptance rate (30%)
    total_received = 0
    accepted = 0
    for grn in GoodsReceipt.objects.filter(purchase_order__supplier=supplier):
        for item in grn.items.all():
            total_received += item.quantity_received
            accepted += item.quantity_accepted
    if total_received > 0:
        quality_rate = (accepted / total_received) * 100
        score *= (quality_rate / 100) ** 0.3
        reasons.append(f"Quality: {quality_rate:.1f}%")

    # 3. Response time to RFQs (20%)
    # 4. Price competitiveness (10%)

    final_score = max(0, min(100, score))
    supplier.performance_score = round(final_score, 1)
    supplier.last_scored_at = timezone.now()
    supplier.save()

    return {
        "score": final_score,
        "grade": supplier.performance_grade,
        "reasons": reasons
    }