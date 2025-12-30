# stock/admin.py
import csv
from datetime import datetime
from django.contrib import admin, messages
from django.db.models import F, Sum, Q
from django.http import HttpResponse, HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import (
    Warehouse, Category, ValuationMethod,
    Stock, WarehouseStock, StockBatch, StockTransaction,
    WarehouseTransfer, TransferItem,
    InventoryAdjustment, InventoryAdjustmentItem,
    InventoryAudit, AuditItem,
    StockAlert, TurnoverAnalysis, StockReport
)


# =============================================================================
# CUSTOM ADMIN ACTIONS (Reusable across models)
# =============================================================================
def export_to_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type='text/csv')
    filename = f"{modeladmin.model.__name__}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)
    fields = [f for f in modeladmin.model._meta.fields if f.name != 'id']
    writer.writerow([f.verbose_name or f.name for f in fields])

    for obj in queryset:
        writer.writerow([str(getattr(obj, f.name)) for f in fields])

    messages.success(request, f"Exported {queryset.count()} records to CSV")
    return response
export_to_csv.short_description = "Export selected to CSV"


def duplicate_stock_items(modeladmin, request, queryset):
    count = 0
    for item in queryset:
        item.pk = None
        item.item_code = f"{item.item_code}-COPY-{timezone.now().strftime('%H%M%S')}"
        item.name = f"[COPY] {item.name}"
        item.save()
        count += 1
    messages.success(request, f"Duplicated {count} stock items")
duplicate_stock_items.short_description = "Duplicate selected items"


def approve_and_post_adjustments(modeladmin, request, queryset):
    posted = 0
    for adj in queryset.filter(status='draft'):
        adj.status = 'approved'
        adj.save()
        try:
            adj.post_adjustment(request.user)
            posted += 1
        except Exception as e:
            messages.error(request, f"Failed to post {adj.reference}: {e}")
    if posted:
        messages.success(request, f"{posted} adjustments approved & posted")
approve_and_post_adjustments.short_description = "Approve & Post Selected"


# =============================================================================
# INLINES
# =============================================================================
class WarehouseStockInline(admin.TabularInline):
    model = WarehouseStock
    extra = 0
    fields = ('warehouse', 'quantity', 'reserved_quantity', 'available_quantity', 'unit_price')
    readonly_fields = ('available_quantity',)
    autocomplete_fields = ['warehouse']


class StockBatchInline(admin.TabularInline):
    model = StockBatch
    extra = 0
    fields = ('batch_number', 'initial_quantity', 'remaining_quantity', 'unit_price', 'expiry_date')
    readonly_fields = ('remaining_quantity',)


class TransferItemInline(admin.TabularInline):
    model = TransferItem
    extra = 1
    autocomplete_fields = ['stock']


class InventoryAdjustmentItemInline(admin.TabularInline):
    model = InventoryAdjustmentItem
    extra = 0
    autocomplete_fields = ['stock']
    readonly_fields = ('quantity_change', 'variance_value')


class AuditItemInline(admin.TabularInline):
    model = AuditItem
    extra = 0
    autocomplete_fields = ['stock']


# =============================================================================
# ADMIN CLASSES
# =============================================================================
@admin.register(Warehouse)
class WarehouseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'city', 'utilization_percentage', 'is_active')
    list_filter = ('is_active', 'country', 'city')
    search_fields = ('code', 'name', 'city', 'manager__username', 'manager__first_name', 'manager__last_name', 'manager__email')
    autocomplete_fields = ['manager']  # Now works perfectly
    actions = [export_to_csv]

    def utilization_percentage(self, obj):
        return f"{obj.utilization_percentage:.1f}%"
    utilization_percentage.short_description = "Utilization"


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)
    actions = [export_to_csv]


@admin.register(ValuationMethod)
class ValuationMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'is_active')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = ('item_code', 'name', 'category', 'total_available_quantity', 'total_value', 'stock_status_colored', 'is_active')
    list_filter = ('status', 'is_active', 'category', 'supplier')
    search_fields = ('item_code', 'barcode', 'name')
    autocomplete_fields = ['category', 'supplier', 'default_warehouse', 'valuation_method']
    inlines = [WarehouseStockInline, StockBatchInline]
    readonly_fields = ('total_quantity', 'total_available_quantity', 'total_value')
    actions = [export_to_csv, duplicate_stock_items]

    def stock_status_colored(self, obj):
        status = obj.get_stock_status()
        colors = {'critical': '#ef4444', 'low': '#f97316', 'normal': '#10b981'}
        return format_html(f'<b style="color:{colors.get(status, "#6b7280")}">● {status.upper()}</b>')
    stock_status_colored.short_description = "Status"


@admin.register(WarehouseStock)
class WarehouseStockAdmin(admin.ModelAdmin):
    list_display = ('stock', 'warehouse', 'quantity', 'available_quantity', 'total_value')
    list_filter = ('warehouse',)
    search_fields = ('stock__item_code', 'stock__name')
    autocomplete_fields = ['stock', 'warehouse']
    actions = [export_to_csv]


@admin.register(StockTransaction)
class StockTransactionAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'stock', 'transaction_type', 'quantity', 'from_warehouse', 'to_warehouse', 'user')
    list_filter = ('transaction_type', 'created_at', 'from_warehouse', 'to_warehouse')
    search_fields = ('stock__item_code', 'stock__name')
    date_hierarchy = 'created_at'
    readonly_fields = ('total_value',)
    actions = [export_to_csv]


@admin.register(WarehouseTransfer)
class WarehouseTransferAdmin(admin.ModelAdmin):
    list_display = ('transfer_number', 'from_warehouse', 'to_warehouse', 'status', 'total_quantity', 'created_by', 'transfer_date')
    list_filter = ('status', 'from_warehouse', 'to_warehouse')
    search_fields = ('transfer_number',)
    inlines = [TransferItemInline]
    readonly_fields = ('total_quantity', 'total_value')
    date_hierarchy = 'transfer_date'
    actions = [export_to_csv, 'mark_in_transit', 'mark_completed']

    def mark_in_transit(self, request, queryset):
        updated = queryset.update(status='in_transit')
        messages.success(request, f"{updated} transfers → In Transit")
    mark_in_transit.short_description = "Mark as In Transit"

    def mark_completed(self, request, queryset):
        updated = queryset.update(status='completed', actual_delivery_date=timezone.now())
        messages.success(request, f"{updated} transfers → Completed")
    mark_completed.short_description = "Mark as Completed"


@admin.register(InventoryAdjustment)
class InventoryAdjustmentAdmin(admin.ModelAdmin):
    list_display = ('reference', 'warehouse', 'adjustment_type', 'status', 'net_adjustment', 'adjustment_date')
    list_filter = ('status', 'adjustment_type', 'warehouse', 'adjustment_date')
    search_fields = ('reference',)
    inlines = [InventoryAdjustmentItemInline]
    readonly_fields = ('total_increase', 'total_decrease', 'net_adjustment')
    actions = [export_to_csv, 'approve_selected', approve_and_post_adjustments]

    def approve_selected(self, request, queryset):
        updated = queryset.update(status='approved')
        messages.success(request, f"{updated} adjustments approved")
    approve_selected.short_description = "Approve Selected"


@admin.register(InventoryAudit)
class InventoryAuditAdmin(admin.ModelAdmin):
    list_display = ('audit_number', 'warehouse', 'status', 'total_discrepancies', 'audit_date')
    list_filter = ('status', 'warehouse', 'audit_date')
    search_fields = ('audit_number',)
    inlines = [AuditItemInline]


@admin.register(StockAlert)
class StockAlertAdmin(admin.ModelAdmin):
    list_display = ('stock', 'warehouse', 'alert_type', 'severity', 'current_quantity', 'threshold_value', 'is_resolved')
    list_filter = ('severity', 'alert_type', 'is_resolved', 'warehouse')
    search_fields = ('stock__item_code', 'stock__name')
    actions = ['resolve_selected', export_to_csv]

    def resolve_selected(self, request, queryset):
        updated = queryset.update(is_resolved=True, resolved_at=timezone.now())
        messages.success(request, f"{updated} alerts resolved")
    resolve_selected.short_description = "Mark as Resolved"


@admin.register(TurnoverAnalysis)
class TurnoverAnalysisAdmin(admin.ModelAdmin):
    list_display = ('stock', 'warehouse', 'period_start', 'period_end', 'turnover_ratio', 'get_turnover_category')
    list_filter = ('warehouse', 'period_start', 'period_end')  # Only real fields!
    search_fields = ('stock__item_code', 'stock__name', 'warehouse__name')
    readonly_fields = ('turnover_ratio', 'get_turnover_category', 'days_inventory_outstanding')
    date_hierarchy = 'period_start'

    def get_turnover_category(self, obj):
        return obj.turnover_category  # or obj.get_turnover_category_display() if it's a choice
    get_turnover_category.short_description = "Turnover Category"
    get_turnover_category.admin_order_field = 'turnover_ratio'  # Optional: allow sorting



@admin.register(StockReport)
class StockReportAdmin(admin.ModelAdmin):
    list_display = ('title', 'report_type', 'warehouse', 'report_date', 'total_value')
    list_filter = ('report_type', 'warehouse', 'report_date')
    search_fields = ('title',)


# =============================================================================
# INTERACTIVE LIVE DASHBOARD WITH WAREHOUSE FILTERING
# =============================================================================
class StockEmpireAdminSite(admin.AdminSite):
    site_header = "HIGH PROSPER — STOCK EMPIRE"
    site_title = "HPS Control Center"
    index_title = "EMPIRE COMMAND CENTER"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('dashboard/', self.admin_view(self.interactive_dashboard), name='stock-dashboard'),
            path('api/dashboard/live/', self.admin_view(self.live_dashboard_data), name='dashboard-live'),
        ]
        return custom_urls + urls

    def interactive_dashboard(self, request):
        warehouses = Warehouse.objects.filter(is_active=True).order_by('name')
        selected = request.GET.get('warehouse', 'all')

        context = {
            **self.each_context(request),
            'title': 'STOCK EMPIRE — LIVE COMMAND CENTER',
            'warehouses': warehouses,
            'selected_warehouse': selected,
        }
        return TemplateResponse(request, 'admin/stock_interactive_dashboard.html', context)

    def live_dashboard_data(self, request):
        warehouse_id = request.GET.get('warehouse')
        now = timezone.now()
        today = now.date()

        ws_qs = WarehouseStock.objects.select_related('stock', 'warehouse')
        trans_qs = StockTransaction.objects.select_related('stock', 'from_warehouse', 'to_warehouse', 'user')
        alert_qs = StockAlert.objects.select_related('stock', 'warehouse')

        if warehouse_id and warehouse_id != 'all':
            ws_qs = ws_qs.filter(warehouse_id=warehouse_id)
            trans_qs = trans_qs.filter(Q(from_warehouse_id=warehouse_id) | Q(to_warehouse_id=warehouse_id))
            alert_qs = alert_qs.filter(warehouse_id=warehouse_id)

        data = {
            'timestamp': now.isoformat(),
            'stats': {
                'total_value': float(ws_qs.aggregate(v=Sum(F('quantity') * F('unit_price')))['v'] or 0),
                'critical_items': alert_qs.filter(severity='critical', is_resolved=False).count(),
                'low_items': alert_qs.filter(severity__in=['high', 'medium'], is_resolved=False).count(),
                'active_transfers': WarehouseTransfer.objects.filter(
                    Q(from_warehouse_id=warehouse_id) | Q(to_warehouse_id=warehouse_id),
                    status__in=['pending', 'in_transit']
                ).count() if warehouse_id and warehouse_id != 'all' else WarehouseTransfer.objects.filter(status__in=['pending', 'in_transit']).count(),
                'today_in': trans_qs.filter(transaction_type='in', created_at__date=today).aggregate(q=Sum('quantity'))['q'] or 0,
                'today_out': abs(trans_qs.filter(transaction_type='out', created_at__date=today).aggregate(q=Sum('quantity'))['q'] or 0),
            },
            'live_alerts': list(alert_qs.filter(is_resolved=False).order_by('-created_at')[:10].values(
                'stock__item_code', 'stock__name', 'warehouse__name', 'alert_type', 'severity', 'current_quantity', 'threshold_value'
            )),
            'recent_activity': list(trans_qs.order_by('-created_at')[:15].values(
                'stock__name', 'stock__item_code', 'transaction_type', 'quantity',
                'from_warehouse__name', 'to_warehouse__name', 'user__username', 'created_at'
            )),
        }
        return TemplateResponse(request, 'admin/live_data.json', data, content_type='application/json')






