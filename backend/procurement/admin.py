# backend/procurement/admin.py
from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse, path
from django.utils.safestring import mark_safe
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.contrib import messages

from .models import (
    ItemCategory, Item,
    Supplier,
    PurchaseRequisition, PurchaseRequisitionItem,
    RFQ, RFQSupplier, Quotation,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem,
    SupplierInvoice
)

from .ai_quotation import select_winning_quotation  # Your AI winner logic
from .tasks import email_po_to_supplier_task  # Celery task for email


# ================================================
# 1. ITEM CATALOG ADMIN
# ================================================
@admin.register(ItemCategory)
class ItemCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_service_category', 'item_count']
    list_filter = ['is_service_category']
    search_fields = ['name']

    def item_count(self, obj):
        return obj.item_set.count()
    item_count.short_description = "Items"


@admin.register(Item)
class ItemAdmin(admin.ModelAdmin):
    list_display = [
        'sku', 'name', 'item_type_badge', 'category',
        'unit_of_measure', 'cost_price', 'selling_price',
        'track_inventory', 'is_active'
    ]
    list_filter = [
        'item_type', 'category__is_service_category', 'track_inventory',
        'is_active', 'currency'
    ]
    search_fields = ['sku', 'name', 'description']
    readonly_fields = ['created_at', 'updated_at']


    def item_type_badge(self, obj):
        color = "27ae60" if obj.item_type == 'product' else "2980b9"
        label = obj.get_item_type_display().upper()
        return format_html(
            '<span style="background:#{}; color:white; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:bold;">{}</span>',
            color, label
        )
    item_type_badge.short_description = "Type"


# ================================================
# 2. SUPPLIER ADMIN — With AI Scoring + Blockchain
# ================================================
@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'email', 'phone', 'is_approved', 'performance_badge', 'rating_stars']
    list_filter = ['is_approved', 'rating', 'payment_terms_days', 'kyc_status']
    search_fields = ['code', 'name', 'email', 'contact_person']
    readonly_fields = ['created_at', 'updated_at', 'performance_score', 'last_scored_at']

    def performance_badge(self, obj):
        if not obj.performance_score:
            return "—"
        score = obj.performance_score
        grade = obj.performance_grade
        color = "emerald" if score >= 90 else "green" if score >= 80 else "yellow" if score >= 70 else "red"
        return format_html(
            '<div class="text-center"><div class="font-bold text-lg">{}</div><div class="text-xs bg-{}-500 text-white px-3 py-1 rounded-full inline-block">{}</div></div>',
            score, color, grade
        )
    performance_badge.short_description = "AI Score"


    def rating_stars(self, obj):
        if not obj.rating:
            return "—"
        return "★" * obj.rating + "☆" * (5 - obj.rating)
    rating_stars.short_description = "Rating"


# ================================================
# 3. PURCHASE REQUISITION
# ================================================
class PurchaseRequisitionItemInline(admin.TabularInline):
    model = PurchaseRequisitionItem
    extra = 1
    autocomplete_fields = ['item']
    readonly_fields = ['total_estimated']


@admin.register(PurchaseRequisition)
class PurchaseRequisitionAdmin(admin.ModelAdmin):
    list_display = [
        'pr_number', 'title', 'requester', 'department',
        'required_by_date', 'status_colored', 'total_estimated_amount', 'create_rfq_action'
    ]
    list_filter = ['status', 'created_at', 'required_by_date', 'department']
    search_fields = ['pr_number', 'title', 'requester__username']
    inlines = [PurchaseRequisitionItemInline]
    readonly_fields = ['pr_number', 'created_at', 'updated_at']
    autocomplete_fields = ['requester', 'approved_by']
    actions = ['approve_selected', 'reject_selected', 'create_rfq_from_selected']

    def status_colored(self, obj):
        colors = {
            'draft': 'gray', 'submitted': 'orange', 'approved': 'green',
            'rejected': 'red', 'cancelled': 'black'
        }
        return format_html(
            '<span style="color:white; background:{}; padding:4px 10px; border-radius:6px; font-weight:bold;">{}</span>',
            colors.get(obj.status, 'gray'), obj.get_status_display()
        )
    status_colored.short_description = "Status"

    def create_rfq_action(self, obj):
        if obj.status == 'approved':
            url = reverse('admin:create_rfq_from_pr', args=[obj.id])
            return format_html('<a class="button" href="{}">Create RFQ →</a>', url)
        return "—"
    create_rfq_action.short_description = "RFQ"

    def approve_selected(self, request, queryset):
        updated = queryset.update(status='approved', approved_by=request.user, approved_at=timezone.now())
        messages.success(request, f"{updated} PRs approved.")
    approve_selected.short_description = "Approve selected"

    def reject_selected(self, request, queryset):
        updated = queryset.update(status='rejected', approved_by=request.user, approved_at=timezone.now())
        messages.success(request, f"{updated} PRs rejected.")
    reject_selected.short_description = "Reject selected"

    def create_rfq_from_selected(self, request, queryset):
        approved = queryset.filter(status='approved')
        if not approved:
            messages.error(request, "Only approved PRs can generate RFQs.")
            return
        # Redirect to custom view or handle bulk
        messages.info(request, "Bulk RFQ creation coming soon.")
    create_rfq_from_selected.short_description = "Create RFQ from selected"


# Custom view for one-click RFQ
def create_rfq_from_pr_view(request, pr_id):
    pr = get_object_or_404(PurchaseRequisition, id=pr_id)
    # Use your existing create_rfq logic here
    # For simplicity, redirect to RFQ add with prefill
    return HttpResponseRedirect(reverse('admin:procurement_rfq_add') + f"?requisition={pr.id}")

admin.site.add_action(create_rfq_from_pr_view, 'create_rfq_from_pr')


# ================================================
# 4. RFQ & QUOTATION — With AI Winner Selection
# ================================================
@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ['rfq_number', 'title', 'requisition_link', 'issue_date', 'due_date', 'supplier_count', 'ai_winner_action']
    list_filter = ['issue_date', 'due_date']
    search_fields = ['rfq_number', 'title']

    def requisition_link(self, obj):
        if obj.requisition:
            url = reverse("admin:procurement_purchaserequisition_change", args=[obj.requisition.id])
            return format_html('<a href="{}">{}</a>', url, obj.requisition.pr_number)
        return "—"
    requisition_link.short_description = "PR"

    def supplier_count(self, obj):
        return obj.suppliers.count()
    supplier_count.short_description = "Suppliers"

    def ai_winner_action(self, obj):
        if obj.quotations.exists():
            return format_html('<a class="button" href="{}">AI Select Winner</a>',
                               reverse('admin:select_winning_quote', args=[obj.id]))
        return "No quotes"
    ai_winner_action.short_description = "Winner"


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['rfq', 'supplier', 'quotation_ref', 'total_amount', 'validity_date', 'submitted_at']
    list_filter = ['submitted_at', 'validity_date']
    search_fields = ['quotation_ref', 'supplier__name']


# AI Winner Selection View
def select_winning_quote_view(request, rfq_id):
    rfq = get_object_or_404(RFQ, id=rfq_id)
    result = select_winning_quotation(rfq)
    if result:
        messages.success(request, f"Winner: {result['winner'].supplier.name} | PO {result['po'].po_number} created!")
    else:
        messages.warning(request, "No quotations available.")
    return HttpResponseRedirect(reverse('admin:procurement_rfq_change', args=[rfq_id]))

admin.site.add_action(select_winning_quote_view, 'select_winning_quote')


# ================================================
# 5. PURCHASE ORDER — With Email + Contract
# ================================================
class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    autocomplete_fields = ['item']
    readonly_fields = ['line_total']


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = [
        'po_number', 'supplier', 'requisition_link', 'order_date',
        'expected_delivery_date', 'status_colored', 'grand_total', 'currency',
        'email_action', 'contract_action'
    ]
    list_filter = ['status', 'order_date', 'supplier']
    search_fields = ['po_number', 'supplier__name']
    inlines = [PurchaseOrderItemInline]
    readonly_fields = ['po_number', 'grand_total', 'created_at', 'updated_at']
    autocomplete_fields = ['requisition', 'quotation', 'supplier', 'created_by', 'approved_by']

    def status_colored(self, obj):
        colors = {'draft': 'gray', 'sent': 'blue', 'confirmed': 'indigo', 'partially_received': 'yellow', 'fully_received': 'green', 'closed': 'emerald', 'cancelled': 'red'}
        return format_html(
            '<span style="color:white; background:{}; padding:4px 10px; border-radius:6px; font-weight:bold;">{}</span>',
            colors.get(obj.status, 'gray'), obj.get_status_display()
        )
    status_colored.short_description = "Status"

    def requisition_link(self, obj):
        if obj.requisition:
            url = reverse("admin:procurement_purchaserequisition_change", args=[obj.requisition.id])
            return format_html('<a href="{}">{}</a>', url, obj.requisition.pr_number)
        return "—"
    requisition_link.short_description = "PR"

    def email_action(self, obj):
        if obj.status in ['draft', 'sent']:
            return format_html('<a class="button" href="{}">Email Supplier</a>',
                               reverse('admin:email_po', args=[obj.id]))
        return "Sent"
    email_action.short_description = "Email"

    def contract_action(self, obj):
        return format_html('<a class="button" href="{}" target="_blank">Generate Contract PDF</a>',
                           reverse('admin:generate_contract', args=[obj.id]))
    contract_action.short_description = "Contract"


# Email PO Action
def email_po_view(request, po_id):
    po = get_object_or_404(PurchaseOrder, id=po_id)
    email_po_to_supplier_task.delay(po.id)  # Celery async
    po.status = 'sent'
    po.save()
    messages.success(request, f"PO {po.po_number} emailed to supplier!")
    return HttpResponseRedirect(reverse('admin:procurement_purchaseorder_change', args=[po_id]))

admin.site.add_action(email_po_view, 'email_po')


# Placeholder for Contract PDF (implement with WeasyPrint or frontend)
def generate_contract_view(request, po_id):
    # Redirect to frontend PDF generator
    return HttpResponseRedirect(f"/po/{po_id}/contract-pdf/")

admin.site.add_action(generate_contract_view, 'generate_contract')


# ================================================
# 6. GOODS RECEIPT & INVOICE
# ================================================
class GoodsReceiptItemInline(admin.TabularInline):
    model = GoodsReceiptItem
    extra = 1
    readonly_fields = ['quantity_rejected']


@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ['grn_number', 'purchase_order', 'receipt_date', 'received_by']
    list_filter = ['receipt_date']
    search_fields = ['grn_number', 'purchase_order__po_number']
    inlines = [GoodsReceiptItemInline]
    autocomplete_fields = ['purchase_order', 'received_by']


@admin.register(SupplierInvoice)
class SupplierInvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'supplier', 'purchase_order_link', 'invoice_date', 'due_date', 'grand_total', 'is_paid', 'blockchain_badge']
    list_filter = ['is_paid', 'invoice_date', 'due_date']
    search_fields = ['invoice_number', 'supplier__name']
    autocomplete_fields = ['purchase_order', 'supplier']

    def purchase_order_link(self, obj):
        if obj.purchase_order:
            url = reverse("admin:procurement_purchaseorder_change", args=[obj.purchase_order.id])
            return format_html('<a href="{}">{}</a>', url, obj.purchase_order.po_number)
        return "—"
    purchase_order_link.short_description = "PO"

    def blockchain_badge(self, obj):
        if getattr(obj, 'blockchain_verified', False):
            return format_html('<span class="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">Blockchain Verified</span>')
        return "—"
    blockchain_badge.short_description = "Verification"

class TenantAdmin(admin.ModelAdmin):
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_global_admin:
            return qs
        if request.user.company:
            return qs.filter(company=request.user.company)
        return qs.none()