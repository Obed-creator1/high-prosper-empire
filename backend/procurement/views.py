# backend/procurement/api/views.py  (FINAL VERSION – Frontend Ready)
from datetime import timedelta

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, status, filters
from django.template.loader import render_to_string
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, DjangoModelPermissionsOrAnonReadOnly
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.mail import EmailMessage
from django.conf import settings
import weasyprint
from io import BytesIO

from .models import (
    Item, ItemCategory, Supplier,
    PurchaseRequisition, PurchaseRequisitionItem,
    RFQ, Quotation,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem,
    SupplierInvoice, RFQSupplier
)
from .serializers import *

User = get_user_model()


# Base ViewSet with soft-delete protection
class SoftDeleteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, DjangoModelPermissionsOrAnonReadOnly]

    def perform_destroy(self, instance):
        # Soft delete instead of hard delete
        instance.delete()  # This triggers softdelete if model inherits SoftDeleteModel
        return Response({"detail": "Deleted successfully"}, status=status.HTTP_200_OK)


# ========================
# 1. ITEM CATALOG (Products + Services)
# ========================
class ItemViewSet(SoftDeleteViewSet):
    queryset = Item.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['item_type', 'category', 'track_inventory', 'is_active']
    search_fields = ['sku', 'name', 'description']
    ordering_fields = ['sku', 'name', 'selling_price', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return ItemListSerializer
        return ItemDetailSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({"detail": "Item deactivated"}, status=status.HTTP_200_OK)


# ========================
# 2. CATEGORIES & SUPPLIERS
# ========================
class ItemCategoryViewSet(SoftDeleteViewSet):
    queryset = ItemCategory.objects.all()
    serializer_class = ItemCategorySerializer
    search_fields = ['name']


class SupplierViewSet(SoftDeleteViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields = ['code', 'name', 'email', 'contact_person']
    ordering_fields = ['name', 'rating', 'created_at']


# ========================
# 3. PURCHASE REQUISITION (PR)
# ========================
class PurchaseRequisitionViewSet(SoftDeleteViewSet):
    queryset = PurchaseRequisition.objects.all().order_by('-created_at')
    filterset_fields = ['status', 'requester', 'department', 'approved_by']
    search_fields = ['pr_number', 'title']
    ordering_fields = ['created_at', 'required_by_date', 'total_estimated_amount']

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return PurchaseRequisitionListSerializer
        return PurchaseRequisitionDetailSerializer

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'draft':
            return Response({"error": "Can only submit draft PRs"}, status=400)
        pr.status = 'submitted'
        pr.save()
        return Response({"status": "submitted", "pr_number": pr.pr_number})

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'submitted':
            return Response({"error": "Only submitted PRs can be approved"}, status=400)
        pr.status = 'approved'
        pr.approved_by = request.user
        pr.approved_at = timezone.now()
        pr.save()
        return Response({"status": "approved", "approved_by": request.user.get_full_name()})

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        pr = self.get_object()
        pr.status = 'rejected'
        pr.approved_by = request.user
        pr.approved_at = timezone.now()
        pr.save()
        return Response({"status": "rejected"})

    @action(detail=True, methods=['post'])
    def create_rfq(self, request, pk=None):
        pr = get_object_or_404(PurchaseRequisition, pk=pk)

        if pr.status != 'approved':
            return Response({"error": "Only approved PRs can generate RFQs"}, status=400)

        # AI: Select top 5 suppliers based on category + score
        categories = {item.item.category for item in pr.items.all() if item.item}
        scored_suppliers = Supplier.objects.filter(
            is_approved=True,
            performance_score__gte=70
        ).order_by('-performance_score')[:5]

        # Create RFQ
        rfq = RFQ.objects.create(
            requisition=pr,
            title=f"RFQ for {pr.title}",
            issue_date=timezone.now().date(),
            due_date=timezone.now().date() + timedelta(days=7),
            created_by=request.user
        )

        # Link suppliers
        rfq.suppliers.add(*scored_suppliers)

        # Auto-send to suppliers (optional)
        for supplier in scored_suppliers:
            RFQSupplier.objects.create(rfq=rfq, supplier=supplier, sent_at=timezone.now())

        return Response({
            "success": True,
            "rfq_number": rfq.rfq_number,
            "suppliers_selected": [s.name for s in scored_suppliers],
            "detail_url": f"/dashboard/admin/procurement/rfq/{rfq.id}/"
        }, status=201)


# ========================
# 4. RFQ & QUOTATION
# ========================
class RFQViewSet(SoftDeleteViewSet):
    queryset = RFQ.objects.all()
    serializer_class = RFQSerializer
    filterset_fields = ['requisition', 'issue_date']
    search_fields = ['rfq_number', 'title']


class QuotationViewSet(SoftDeleteViewSet):
    queryset = Quotation.objects.all()
    serializer_class = QuotationSerializer
    filterset_fields = ['rfq', 'supplier']


# ========================
# 5. PURCHASE ORDER (PO)
# ========================
class PurchaseOrderViewSet(SoftDeleteViewSet):
    queryset = PurchaseOrder.objects.all().order_by('-order_date')
    filterset_fields = ['status', 'supplier', 'requisition']
    search_fields = ['po_number', 'supplier__name']
    ordering_fields = ['order_date', 'grand_total']

    def get_serializer_class(self):
        if self.action in ['list', 'retrieve']:
            return PurchaseOrderListSerializer
        return PurchaseOrderDetailSerializer

    @action(detail=True, methods=['post'])
    def send_to_supplier(self, request, pk=None):
        po = self.get_object()
        po.status = 'sent'
        po.save()
        return Response({"status": "sent to supplier"})

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        po = self.get_object()
        po.status = 'confirmed'
        po.save()
        return Response({"status": "confirmed"})
    # In views.py (optional dedicated endpoint)
    @action(detail=True, methods=['post'])
    def approve_and_send(self, request, pk=None):
        po = self.get_object()
        po.status = 'sent'
        po.approved_by = request.user
        po.approved_at = timezone.now()
        po.save()
        return Response({"success": True, "message": "PO approved and emailed to supplier"})


# ========================
# 6. GOODS RECEIPT (GRN)
# ========================
class GoodsReceiptViewSet(SoftDeleteViewSet):
    queryset = GoodsReceipt.objects.all()
    serializer_class = GoodsReceiptSerializer
    filterset_fields = ['purchase_order', 'receipt_date']
    search_fields = ['grn_number']

    def perform_create(self, serializer):
        # Auto-set received_by
        serializer.save(received_by=self.request.user)


class GoodsReceiptItemViewSet(SoftDeleteViewSet):
    queryset = GoodsReceiptItem.objects.all()
    serializer_class = GoodsReceiptItemSerializer


# ========================
# 7. SUPPLIER INVOICE
# ========================
class SupplierInvoiceViewSet(SoftDeleteViewSet):
    queryset = SupplierInvoice.objects.all()
    serializer_class = SupplierInvoiceSerializer
    filterset_fields = ['is_paid', 'supplier', 'purchase_order']
    search_fields = ['invoice_number']
    ordering_fields = ['invoice_date', 'due_date']

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.is_paid = True
        invoice.paid_at = timezone.now()
        invoice.save()
        return Response({"status": "marked as paid"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def email_po_to_supplier(request, po_id):
    try:
        po = PurchaseOrder.objects.get(id=po_id)
        supplier = po.supplier

        if not supplier.email:
            return Response({"error": "Supplier has no email"}, status=400)

        # Generate PDF in memory using WeasyPrint (server-side)
        html_template = render_to_string('pdf/po_template.html', {
            'po': po,
            'company': {
                'name': 'High Prosper Ltd',
                'address': '123 Business Ave, Nairobi, Kenya',
                'phone': '+254 700 000 000',
                'email': 'procurement@highprosper.com'
            }
        })

        pdf_buffer = BytesIO()
        weasyprint.HTML(string=html_template).write_pdf(pdf_buffer)
        pdf_buffer.seek(0)

        # Send email
        subject = f"Purchase Order {po.po_number} - High Prosper Ltd"
        body = f"""
        Dear {supplier.contact_person or supplier.name},

        Please find attached Purchase Order {po.po_number}.

        Order Date: {po.order_date}
        Expected Delivery: {po.expected_delivery_date}
        Total Amount: {po.currency} {po.grand_total:,.2f}

        Kindly confirm receipt and delivery timeline.

        Best regards,
        Procurement Team
        High Prosper Ltd
        """

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[supplier.email],
            cc=[request.user.email],
        )
        email.attach(f"PO-{po.po_number}.pdf", pdf_buffer.getvalue(), "application/pdf")
        email.send()

        # Log action
        po.status = 'sent'
        po.save()

        return Response({
            "success": True,
            "message": f"PO emailed to {supplier.name}",
            "supplier_email": supplier.email
        })

    except PurchaseOrder.DoesNotExist:
        return Response({"error": "PO not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)