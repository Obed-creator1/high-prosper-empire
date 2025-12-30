# backend/payments/admin.py
# HIGH PROSPER PAYMENTS COMMAND CENTER — VISION 2026

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from django.contrib.humanize.templatetags.humanize import intcomma
from django.db.models import Sum, Count, F
from .models import Invoice, Payment, PaymentMethod
from customers.models import Customer


# ========================
# CUSTOM FILTERS
# ========================
class PaymentMethodFilter(admin.SimpleListFilter):
    title = 'Payment Method'
    parameter_name = 'method'

    def lookups(self, request, model_admin):
        methods = PaymentMethod.objects.filter(is_active=True)
        return [(m.id, m.get_name_display()) for m in methods]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(method_id=self.value())
        return queryset


class PaymentStatusFilter(admin.SimpleListFilter):
    title = 'Status'
    parameter_name = 'status'

    def lookups(self, request, model_admin): Payment.STATUS_CHOICES

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(status=self.value())
        return queryset


# ========================
# PAYMENT METHOD ADMIN
# ========================
@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'fee_percent', 'supports_offline', 'total_volume_colored')
    list_editable = ('is_active', 'fee_percent', 'supports_offline')
    list_filter = ('is_active', 'supports_offline')
    search_fields = ('name',)

    def total_volume_colored(self, obj):
        total = Payment.objects.filter(method=obj, status='Successful').aggregate(t=Sum('amount'))['t'] or 0
        color = "green" if total > 1_000_000_000 else "orange" if total > 100_000_000 else "gray"
        return format_html(f'<b style="color:{color};font-size:1.1em">RWF {intcomma(total)}</b>')
    total_volume_colored.short_description = "Total Volume"


# ========================
# INVOICE ADMIN — THE MONEY PRINTER
# ========================
@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        'uid_link', 'customer_link', 'amount_colored', 'paid_amount_colored',
        'remaining_colored', 'status_with_balance', 'due_date', 'status_badge', 'period', 'sent_via_list', 'collectors_display'
    )
    list_filter = (
        'status', 'due_date', 'period_month', 'period_year',
        'customer__village__cell__sector', 'customer__village__collectors__username'
    )
    search_fields = ('uid', 'customer__name', 'customer__payment_account', 'customer__phone')
    readonly_fields = ('uid', 'paid_amount', 'remaining_display', 'remaining_safe', 'created_at', 'updated_at')
    date_hierarchy = 'due_date'
    actions = ['mark_as_paid', 'send_reminder_all', 'generate_pdf_bulk']
    list_per_page = 50

    fieldsets = (
        ('Invoice Details', {
            'fields': ('uid', 'customer', 'amount', 'due_date', 'period_month', 'period_year')
        }),
        ('Payment Status', {
            'fields': ('paid_amount', 'remaining_display', 'status'),
        }),
        ('Delivery', {
            'fields': ('sent_via', 'pdf_file'),
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def uid_link(self, obj):
        url = reverse("admin:payments_invoice_change", args=[obj.id])
        return format_html('<a href="{}"><code>{}</code></a>', url, str(obj.uid)[:8])
    uid_link.short_description = "Invoice ID"

    def customer_link(self, obj):
        url = reverse("admin:customers_customer_change", args=[obj.customer.id])
        return format_html('<a href="{}">{}</a><br><small>{}</small>', url, obj.customer.name, obj.customer.payment_account)
    customer_link.short_description = "Customer"

    def collectors_display(self, obj):
        """Display all collectors assigned to the customer's village"""
        if obj.customer.village and obj.customer.village.collectors.exists():
            collectors = obj.customer.village.collectors.all()
            return ", ".join(c.get_full_name() or c.username for c in collectors)
        return "Unassigned"
    collectors_display.short_description = "Collectors"

    def amount_colored(self, obj):
        return format_html('<b style="color:#1e40af">RWF {}</b>', intcomma(obj.amount))
    amount_colored.short_description = "Amount"

    def paid_amount_colored(self, obj):
        color = "green" if obj.paid_amount >= obj.amount else "gray"
        return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(obj.paid_amount))
    paid_amount_colored.short_description = "Paid"

    def remaining_colored(self, obj):
        remaining = obj.remaining
        color = "red" if remaining > 0 else "green"
        return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(remaining))
    remaining_colored.short_description = "Remaining"

    def remaining_display(self, obj):
        """Safe display of remaining — only when object exists"""
        if obj.pk:
            remaining = obj.remaining or 0
            color = "red" if remaining > 0 else "green"
            return format_html('<b style="color:{}">RWF {}</b>', color, intcomma(abs(remaining)))
        return "— (Save to calculate)"
    remaining_display.short_description = "Remaining Balance"

    def remaining_safe(self, obj):
        """Only show remaining if object exists (not on add form)"""
        if obj.pk:
            return format_html('<b>RWF {}</b>', intcomma(obj.remaining))
        return "(Will be calculated after saving)"
    remaining_safe.short_description = "Remaining Balance"

    def get_readonly_fields(self, request, obj=None):
        """Hide calculated fields on add form"""
        if obj is None:  # Adding new invoice
            return ('uid', 'paid_amount', 'created_at', 'updated_at', 'remaining_display')
        return self.readonly_fields

    def status_with_balance(self, obj):
        remaining = obj.remaining
        if remaining > 0:
            return format_html('<span style="color:red">OWES RWF {}</span>', intcomma(remaining))
        elif remaining < 0:
            return format_html('<span style="color:green">OVERPAID RWF {}</span>', intcomma(abs(remaining)))
        return format_html('<span style="color:blue">PAID</span>')
    status_with_balance.short_description = "Balance Status"


    def status_badge(self, obj):
        colors = {
            'Paid': 'bg-green-600',
            'Pending': 'bg-yellow-500',
            'Overdue': 'bg-red-600',
            'Waived': 'bg-gray-600'
        }
        color = colors.get(obj.status, 'bg-gray-400')
        return format_html('<span class="px-4 py-2 rounded-full text-white text-xs font-bold {}">{}</span>', color, obj.status)
    status_badge.short_description = "Status"

    def period(self, obj):
        return f"{obj.period_month:02d}/{obj.period_year}"
    period.short_description = "Period"

    def sent_via_list(self, obj):
        """Ultra-safe display of sent_via channels — handles any data format"""
        if not obj.sent_via:
            return "—"

        channels = set()  # Use set to avoid duplicates

        channel_map = {
            'sms': 'SMS',
            'push': 'Push',
            'whatsapp': 'WhatsApp',
            'ussd': 'USSD',
            'email': 'Email',
            'voice_call': 'Voice Call',
            'field_visit': 'Collector Visit',
            'drone': 'Drone Drop'
        }

        data = obj.sent_via

        # Case 1: List of strings (ideal)
        if isinstance(data, list):
            for item in data:
                if isinstance(item, str):
                    channels.add(channel_map.get(item.lower(), item.title()))

        # Case 2: Dict of {channel: bool}
        elif isinstance(data, dict):
            for key, value in data.items():
                # If value is True/False or truthy
                if value:
                    if isinstance(key, str):
                        channels.add(channel_map.get(key.lower(), key.title()))
                    # If key is dict (nested), extract string keys
                    elif isinstance(key, dict):
                        for subkey in key.keys():
                            if isinstance(subkey, str):
                                channels.add(channel_map.get(subkey.lower(), subkey.title()))

        # Fallback: just show raw (truncated)
        else:
            return str(data)[:50] + ("..." if len(str(data)) > 50 else "")

        if not channels:
            return "—"

        return " • ".join(sorted(channels))

    sent_via_list.short_description = "Sent Via"
    sent_via_list.admin_order_field = None  # Cannot reliably sort JSON

    # Actions
    def mark_as_paid(self, request, queryset):
        updated = 0
        for invoice in queryset.filter(status='Pending'):
            invoice.status = 'Paid'
            invoice.paid_amount = invoice.amount
            invoice.save()
            updated += 1
        self.message_user(request, f"{updated} invoices marked as paid.")
    mark_as_paid.short_description = "Mark selected invoices as paid"

    def send_reminder_all(self, request, queryset):
        from notifications.utils import send_notification_with_fallback
        sent = 0
        for invoice in queryset.filter(status__in=['Pending', 'Overdue']):
            send_notification_with_fallback(
                invoice.customer.user,
                "Invoice Due",
                f"Invoice {invoice.uid[:8]} of RWF {invoice.amount:,} is due on {invoice.due_date}. Pay now!",
                "/dashboard"
            )
            invoice.sent_via.append('push')
            invoice.save()
            sent += 1
        self.message_user(request, f"Reminders sent to {sent} customers.")
    send_reminder_all.short_description = "Send reminder (Push + SMS)"


# ========================
# PAYMENT ADMIN — THE MONEY RIVER
# ========================
@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'reference','reference_link', 'customer_link', 'amount_colored', 'method_badge',
        'status_badge', 'completed_at', 'hpc_minted_badge', 'drone_used'
    )
    list_filter = (
        PaymentStatusFilter, PaymentMethodFilter,
        'completed_at', 'method', 'customer__village'
    )
    search_fields = (
        'reference', 'transaction_id', 'customer__name',
        'customer__payment_account', 'customer__phone', 'uid'
    )
    readonly_fields = (
        'uid', 'reference', 'completed_at', 'created_at', 'metadata'
    )
    date_hierarchy = 'completed_at'
    list_per_page = 100
    actions = ['retry_failed', 'refund_payment']

    def reference_link(self, obj):
        return format_html('<code class="font-mono">{}</code>', obj.reference)
    reference_link.short_description = "Ref"

    def customer_link(self, obj):
        url = reverse("admin:customers_customer_change", args=[obj.customer.id])
        return format_html('<a href="{}"><b>{}</b></a><br><small>{}</small>', url, obj.customer.name, obj.customer.phone)
    customer_link.short_description = "Customer"

    def amount_colored(self, obj):
        color = "green" if obj.status == 'Successful' else "gray"
        return format_html('<b style="color:{};font-size:1.2em">RWF {}</b>', color, intcomma(obj.amount))
    amount_colored.short_description = "Amount"

    def method_badge(self, obj):
        colors = {
            'momo': 'bg-orange-500',
            'hpc': 'bg-purple-600',
            'qr': 'bg-blue-600',
            'ussd': 'bg-green-600',
            'drone_cash': 'bg-red-600',
        }
        color = colors.get(obj.method.name, 'bg-gray-500')
        return format_html('<span class="px-3 py-1 rounded-full text-white text-xs font-bold {}">{}</span>', color, obj.method.get_name_display())
    method_badge.short_description = "Method"

    def status_badge(self, obj):
        colors = {'Successful': 'bg-green-600', 'Failed': 'bg-red-600', 'Pending': 'bg-yellow-600'}
        color = colors.get(obj.status, 'bg-gray-500')
        return format_html('<span class="px-3 py-1 rounded-full text-white font-bold {}">{}</span>', color, obj.status)
    status_badge.short_description = "Status"

    def hpc_minted_badge(self, obj):
        if 'hpc_minted' in obj.metadata:
            return format_html('<span class="text-green-600 font-bold">HPC MINED</span>')
        return "—"
    hpc_minted_badge.short_description = "HPC"

    def drone_used(self, obj):
        if obj.method.name == 'drone_cash':
            return format_html('<span class="text-red-600 text-2xl">Drone</span>')
        return "—"
    drone_used.short_description = "Drone"

    def retry_failed(self, request, queryset):
        retried = queryset.filter(status='Failed').update(status='Pending')
        self.message_user(request, f"{retried} failed payments queued for retry.")
    retry_failed.short_description = "Retry failed payments"