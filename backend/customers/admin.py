# backend/customers/admin.py
# HIGH PROSPER CUSTOMER ADMIN — VISION 2026 (FIXED & CLEAN)

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.contrib.humanize.templatetags.humanize import intcomma
from django.db.models import Sum, Count
from .models import Sector, Cell, Village, Customer, ServiceOrder, Complaint, LedgerEntry


# ========================
# INLINES (SAFE — NO RECURSION)
# ========================
class CustomerInline(admin.TabularInline):
    model = Customer
    extra = 0
    fields = ('name', 'phone', 'payment_account', 'status', 'monthly_fee', 'balance_display', 'risk_score')
    readonly_fields = ('balance_display', 'risk_score')
    show_change_link = True
    can_delete = False

    def balance_display(self, obj):
        if obj.pk:
            balance = obj.balance or 0
            color = "red" if balance > 0 else "green"
            return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(abs(balance)))
        return "-"
    balance_display.short_description = "Balance"


class VillageInline(admin.TabularInline):
    model = Village
    extra = 0
    fields = ('name', 'collector', 'customer_count', 'balance_total')
    readonly_fields = ('customer_count', 'balance_total')

    def customer_count(self, obj):
        if obj.pk:
            return obj.residents.count()
        return 0
    customer_count.short_description = "Customers"

    def balance_total(self, obj):
        if obj.pk:
            total = sum(c.balance or 0 for c in obj.residents.all())
            color = "red" if total > 0 else "green"
            return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(abs(total)))
        return "-"
    balance_total.short_description = "Balance"

    def outstanding_total(self, obj):
        if obj.pk:
            total = obj.customers.aggregate(t=Sum('outstanding'))['t'] or 0
            color = "red" if total > 0 else "green"
            return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(total))
        return "-"
    outstanding_total.short_description = "Outstanding"


# ========================
# ADMIN CLASSES
# ========================
@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'cell_count', 'village_count')
    search_fields = ('name', 'code')
    ordering = ('name',)

    def cell_count(self, obj):
        return obj.cells.count()
    cell_count.short_description = "Cells"

    def village_count(self, obj):
        return Village.objects.filter(cell__sector=obj).count()
    village_count.short_description = "Villages"


@admin.register(Cell)
class CellAdmin(admin.ModelAdmin):
    list_display = ('name', 'sector', 'village_count', 'customer_count')
    list_filter = ('sector',)
    search_fields = ('name', 'sector__name')
    inlines = [VillageInline]

    def village_count(self, obj):
        return obj.villages.count()
    village_count.short_description = "Villages"

    def customer_count(self, obj):
        return Customer.objects.filter(village__cell=obj).count()
    customer_count.short_description = "Customers"

@admin.register(Village)
class VillageAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'cell',
        'collectors_display',  # Updated to show multiple
        'customer_count',
        'balance_total_colored',
        'is_active'
    )
    list_filter = ('cell__sector', 'is_active', 'collectors')
    search_fields = ('name', 'collectors__username', 'collectors__phone')
    inlines = [CustomerInline]

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('residents', 'collectors')

    def collectors_display(self, obj):
        if obj.collectors.exists():
            links = []
            for collector in obj.collectors.all():
                url = reverse("admin:users_customuser_change", args=[collector.id])
                links.append(
                    f'<a href="{url}">{collector.get_full_name() or collector.username} <small>({collector.phone})</small></a>'
                )
            return format_html(", ".join(links))
        return "Unassigned"
    collectors_display.short_description = "Collectors"

    def customer_count(self, obj):
        return obj.residents.count()
    customer_count.short_description = "Customers"
    customer_count.admin_order_field = 'residents__count'

    def balance_total_colored(self, obj):
        total = obj.total_balance
        color = "red" if total > 500000 else "orange" if total > 100000 else "green"
        return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(abs(total)))
    balance_total_colored.short_description = "Total Balance"

    def outstanding_total_colored(self, obj):
        total = obj.residents.aggregate(t=Sum('outstanding'))['t'] or 0
        color = "red" if total > 500000 else "orange" if total > 100000 else "green"
        return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(total))
    outstanding_total_colored.short_description = "Outstanding"
    outstanding_total_colored.admin_order_field = 'outstanding_total'

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'phone_link', 'payment_account', 'collectors_display',
        'monthly_fee', 'balance_colored', 'balance_status', 'debt_summary', 'risk_badge', 'status', 'connection_date'
    )
    list_filter = (
        'status', 'village__cell__sector', 'village__collectors__username', 'type',
        'risk_score', 'connection_date'
    )
    search_fields = ('name', 'phone', 'payment_account', 'nid', 'email')
    readonly_fields = ('uid', 'balance', 'total_paid', 'days_delinquent', 'risk_score', 'collector', 'created_at', 'updated_at')
    fieldsets = (
        ('Personal Info', {'fields': ('uid', 'name', 'phone', 'email', 'nid', 'gender', 'date_of_birth')}),
        ('Location & Collector', {'fields': ('village', 'collector')}),
        ('Billing', {'fields': ('type', 'contract_no', 'contract_file', 'payment_account', 'monthly_fee', 'connection_date')}),
        ('Status & Risk', {'fields': ('status', 'tags', 'risk_score', 'days_delinquent', 'balance', 'total_paid')}),
        ('Audit', {'fields': ('created_at', 'updated_at', 'created_by', 'updated_by'), 'classes': ('collapse',)}),
    )
    actions = ['send_payment_reminder', 'mark_active', 'verify_email_admin', 'verify_phone_admin', 'activate_customer']


    def verify_email_admin(self, request, queryset):
        updated = queryset.filter(is_email_verified=False).update(is_email_verified=True)
        self.message_user(request, f"{updated} customers email verified by admin.")
    verify_email_admin.short_description = "Mark email as verified"

    def verify_phone_admin(self, request, queryset):
        updated = queryset.filter(is_phone_verified=False).update(is_phone_verified=True)
        self.message_user(request, f"{updated} customers phone verified by admin.")
    verify_phone_admin.short_description = "Mark phone as verified"

    def activate_customer(self, request, queryset):
        updated = queryset.filter(status='Pending').update(status='Active')
        self.message_user(request, f"{updated} customers activated by admin.")
    activate_customer.short_description = "Activate customer account"

    def phone_link(self, obj):
        if obj.phone:
            return format_html('<a href="tel:{}">{} WhatsApp</a>', obj.phone, obj.phone)
        return "-"
    phone_link.short_description = "Phone"

    def collectors_display(self, obj):
        """Display all collectors assigned to the customer's village"""
        if obj.village and obj.village.collectors.exists():
            collectors = obj.village.collectors.all()
            return ", ".join(c.get_full_name() or c.username for c in collectors)
        return "Unassigned"
    collectors_display.short_description = "Collectors"

    def balance_colored(self, obj):
        balance = obj.balance or 0
        color = "red" if balance > 0 else "green"
        return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(abs(balance)))
    balance_colored.short_description = "Balance"

    def balance_status(self, obj):
        balance = obj.balance or 0
        if balance > 0:
            return format_html('<span style="color:red;font-weight:bold">OWES RWF {}</span>', intcomma(balance))
        elif balance < 0:
            return format_html('<span style="color:green;font-weight:bold">OVERPAID RWF {}</span>', intcomma(abs(balance)))
        else:
            return format_html('<span style="color:blue;font-weight:bold">UP-TO-DATE</span>')
    balance_status.short_description = "Payment Status"

    def debt_summary(self, obj):
        if obj.balance > 0:
            return f"{obj.unpaid_months} months behind"
        elif obj.balance < 0:
            return f"{obj.overpaid_months} months ahead"
        return "Current"
    debt_summary.short_description = "Debt Summary"

    def risk_badge(self, obj):
        score = obj.risk_score or 0
        if score >= 80:
            badge = "bg-red-600 text-white"
        elif score >= 60:
            badge = "bg-orange-500 text-white"
        elif score >= 30:
            badge = "bg-yellow-500 text-black"
        else:
            badge = "bg-green-600 text-white"
        return format_html('<span class="px-3 py-1 rounded-full text-xs font-bold {}">RISK {}</span>', badge, int(score))
    risk_badge.short_description = "Risk"

    def send_payment_reminder(self, request, queryset):
        from notifications.utils import send_notification_with_fallback
        sent = 0
        for customer in queryset.filter(outstanding__gt=0):
            send_notification_with_fallback(
                customer.user,
                "Payment Reminder",
                f"You owe RWF {customer.outstanding:,}. Pay now!",
                "/dashboard"
            )
            sent += 1
        self.message_user(request, f"Reminders sent to {sent} customers.")
    send_payment_reminder.short_description = "Send payment reminder"

    def mark_active(self, request, queryset):
        updated = queryset.update(status='Active')
        self.message_user(request, f"{updated} customers marked active.")
    mark_active.short_description = "Mark as Active"


@admin.register(ServiceOrder)
class ServiceOrderAdmin(admin.ModelAdmin):
    list_display = ('title', 'customer_link', 'status', 'amount', 'assigned_to', 'created_at')
    list_filter = ('status', 'assigned_to')
    search_fields = ('title', 'description', 'customer__name')

    def customer_link(self, obj):
        url = reverse("admin:customers_customer_change", args=[obj.customer.id])
        return format_html('<a href="{}">{}</a>', url, obj.customer.name)
    customer_link.short_description = "Customer"


@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('title', 'customer_link', 'priority_badge', 'status', 'assigned_to', 'created_at', 'satisfaction_score')
    list_filter = ('priority', 'status', 'assigned_to', 'created_at')
    search_fields = ('title', 'description', 'customer__name')

    def priority_badge(self, obj):
        colors = {'Critical': 'bg-red-600', 'High': 'bg-orange-500', 'Medium': 'bg-yellow-500', 'Low': 'bg-gray-400'}
        color = colors.get(obj.priority, 'bg-gray-500')
        return format_html('<span class="px-3 py-1 rounded-full text-white text-xs font-bold {}">{}</span>', color, obj.priority)
    priority_badge.short_description = "Priority"

    def customer_link(self, obj):
        url = reverse("admin:customers_customer_change", args=[obj.customer.id])
        return format_html('<a href="{}">{}</a>', url, obj.customer.name)
    customer_link.short_description = "Customer"


@admin.register(LedgerEntry)
class LedgerEntryAdmin(admin.ModelAdmin):
    list_display = ('customer', 'created_at', 'description', 'debit', 'credit', 'balance')
    list_filter = ('customer',)
    search_fields = ('customer__name', 'description')
    readonly_fields = ('balance',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    def created_at(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M")
    created_at.short_description = "Date"
    created_at.admin_order_field = 'created_at'