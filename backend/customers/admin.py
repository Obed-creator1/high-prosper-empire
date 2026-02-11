# backend/customers/admin.py
# HIGH PROSPER CUSTOMER ADMIN — VISION 2026 (FIXED & CLEAN)

from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse
from django.contrib.humanize.templatetags.humanize import intcomma
from django.db.models import Sum, Count
from .models import Sector, Cell, Village, Customer, ServiceOrder, Complaint, LedgerEntry, ServiceRequest
from payments.models import Payment


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

# === SERVICE REQUEST ADMIN ===
class PaymentInline(admin.TabularInline):
    model = Payment
    fields = ('amount', 'status', 'completed_at', 'method', 'reference')
    readonly_fields = ('completed_at', 'reference')
    extra = 0
    can_delete = False


# ========================
# ADMIN CLASSES
# ========================
@admin.register(Sector)
class SectorAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'cell_count', 'village_count', 'get_manager_names', 'get_supervisor_names')
    search_fields = ('name', 'code')
    ordering = ('name',)
    filter_horizontal = ['managers', 'supervisors']  # Nice UI for M2M

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
        'sector_display',
        'collectors_display',
        'customer_count',
        'monthly_revenue_target_colored',
        'collected_this_month_colored',
        'revenue_percentage_badge',
        'new_customers_this_month',
        'new_customers_target_colored',
        'growth_percentage_badge',
        'overall_target_score',
        'performance_rank_badge',
        'is_active'
    )
    list_filter = (
        'cell__sector',
        'is_active',
        'target_month',
        'target_year',
        'collectors'
    )
    search_fields = (
        'name',
        'cell__name',
        'cell__sector__name',
        'collectors__username',
        'collectors__first_name',
        'collectors__last_name'
    )
    inlines = [CustomerInline]
    readonly_fields = (
        'customer_count', 'collected_this_month', 'new_customers_this_month',
        'revenue_target_percentage', 'new_customers_target_percentage',
        'overall_target_score', 'performance_rank_badge'
    )
    fieldsets = (
        ("Basic Information", {
            'fields': ('name', 'cell', 'collectors', 'gps_coordinates', 'population_estimate', 'is_active')
        }),
        ("Monthly Targets", {
            'fields': (
                ('target_month', 'target_year'),
                ('monthly_revenue_target', 'monthly_new_customers_target')
            ),
            'description': '<p class="text-sm text-gray-600 mt-2">Set targets for the selected month/year. System auto-calculates progress daily.</p>'
        }),
        ("Current Performance (Auto-Updated)", {
            'fields': (
                'collected_this_month', 'new_customers_this_month',
                'revenue_target_percentage', 'new_customers_target_percentage',
                'overall_target_score', 'performance_rank_badge'
            ),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'cell__sector'
        ).prefetch_related('collectors', 'residents')

    # === DISPLAY METHODS ===
    def sector_display(self, obj):
        return obj.cell.sector.name if obj.cell and obj.cell.sector else "-"
    sector_display.short_description = "Sector"
    sector_display.admin_order_field = 'cell__sector__name'

    def collectors_display(self, obj):
        if obj.collectors.exists():
            links = []
            for collector in obj.collectors.all():
                url = reverse("admin:users_customuser_change", args=[collector.id])
                links.append(
                    format_html(
                        '<a href="{}" class="text-blue-600 hover:underline">{}</a>',
                        url,
                        collector.get_full_name() or collector.username
                    )
                )
            return format_html("<br>".join(links))
        return format_html('<span class="text-gray-500">Unassigned</span>')
    collectors_display.short_description = "Collectors"

    def customer_count(self, obj):
        count = obj.residents.count()
        return format_html('<b class="text-2xl">{}</b>', count)
    customer_count.short_description = "Customers"

    def monthly_revenue_target_colored(self, obj):
        target = obj.monthly_revenue_target
        if target > 0:
            return format_html(
                '<b class="text-green-600">RWF {}</b>',
                intcomma(target)
            )
        return "-"
    monthly_revenue_target_colored.short_description = "Revenue Target"

    def collected_this_month_colored(self, obj):
        collected = obj.collected_this_month
        color = "green" if collected >= obj.monthly_revenue_target else "orange" if collected > 0 else "gray"
        return format_html(
            '<b class="text-{}">RWF {}</b>',
            color, intcomma(collected)
        )
    collected_this_month_colored.short_description = "Collected"

    def revenue_percentage_badge(self, obj):
        pct = obj.revenue_target_percentage
        pct_str = f"{pct:.1f}"  # Format BEFORE format_html
        if pct >= 100:
            badge_class = "bg-green-600"
            text = "On Target"
        elif pct >= 80:
            badge_class = "bg-yellow-600"
            text = "Near Target"
        elif pct > 0:
            badge_class = "bg-red-600"
            text = "Behind"
        else:
            badge_class = "bg-gray-600"
            text = "No Progress"
        return format_html(
            '<span class="px-3 py-1 rounded-full text-white text-sm font-bold {badge_class}">'
            '{pct}% {text}'
            '</span>',
            badge_class=badge_class,
            pct=pct_str,
            text=text
        )
    revenue_percentage_badge.short_description = "Revenue %"
    revenue_percentage_badge.admin_order_field = 'revenue_target_percentage'

    def new_customers_target_colored(self, obj):
        target = obj.monthly_new_customers_target
        if target > 0:
            return format_html('<b class="text-blue-600">+{}</b>', target)
        return "-"
    new_customers_target_colored.short_description = "New Cust Target"

    def new_customers_this_month(self, obj):
        count = obj.new_customers_this_month
        return format_html('<b class="text-purple-600 text-xl">+{}</b>', count)
    new_customers_this_month.short_description = "New This Month"

    def growth_percentage_badge(self, obj):
        pct = obj.new_customers_target_percentage
        pct_str = f"{pct:.1f}"  # Format BEFORE format_html
        if pct >= 100:
            badge_class = "bg-emerald-600"
        elif pct >= 80:
            badge_class = "bg-cyan-600"
        elif pct > 0:
            badge_class = "bg-orange-600"
        else:
            badge_class = "bg-gray-600"
        return format_html(
            '<span class="px-3 py-1 rounded-full text-white text-sm font-bold {badge_class}">'
            '{pct}%'
            '</span>',
            badge_class=badge_class,
            pct=pct_str
        )
    growth_percentage_badge.short_description = "Growth %"
    growth_percentage_badge.admin_order_field = 'new_customers_target_percentage'

    def overall_target_score(self, obj):
        score = obj.overall_target_percentage
        score_str = f"{score:.1f}"  # Format BEFORE format_html
        if score >= 100:
            color = "text-emerald-500"
            medal = "🥇"
        elif score >= 90:
            color = "text-cyan-500"
            medal = "🥈"
        elif score >= 80:
            color = "text-yellow-500"
            medal = "🥉"
        else:
            color = "text-gray-500"
            medal = ""
        return format_html(
            '<b class="text-2xl {color}">{medal}{score}%</b>',
            color=color,
            medal=medal,
            score=score_str
        )
    overall_target_score.short_description = "Overall Score"
    overall_target_score.admin_order_field = 'overall_target_percentage'

    def performance_rank_badge(self, obj):
        rank = obj.performance_rank
        if rank:
            if rank == 1:
                badge_class = "bg-gradient-to-r from-yellow-400 to-amber-600 text-white shadow-lg"
                emoji = "👑"
            elif rank <= 3:
                badge_class = "bg-gradient-to-r from-gray-400 to-gray-600 text-white shadow-md"
                emoji = "🏅"
            elif rank <= 10:
                badge_class = "bg-gradient-to-r from-orange-600 to-yellow-600 text-white shadow-md"
                emoji = "🎖️"
            else:
                badge_class = "bg-gray-600 text-white"
                emoji = "📍"

            return format_html(
                '<span class="inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-lg {badge_class}">'
                '{emoji} #{rank}'
                '</span>',
                badge_class=badge_class,
                emoji=emoji,
                rank=rank
            )
        return format_html('<span class="text-gray-400 italic">Unranked</span>')
    performance_rank_badge.short_description = "Rank"
    performance_rank_badge.admin_order_field = 'performance_rank'

    def avg_risk_level(self, obj):
        risk = obj.avg_risk
        if risk > 70:
            color = "red"
            label = "Critical"
        elif risk > 40:
            color = "orange"
            label = "High"
        elif risk > 20:
            color = "yellow"
            label = "Medium"
        else:
            color = "green"
            label = "Low"
        return format_html(
            '<span class="px-3 py-1 rounded-full text-white font-bold" style="background-color:{}">{}</span>',
            color, f"{risk:.1f} — {label}"
        )
    avg_risk_level.short_description = "Risk Level"

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

@admin.register(ServiceRequest)
class ServiceRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'title_link', 'requester_info', 'village_link', 'quoted_amount',
        'payment_status_badge', 'status_badge', 'assigned_to', 'requested_date', 'created_at'
    ]
    list_filter = [
        'status', 'payment_status', 'village__cell__sector', 'village', 'assigned_to', 'requested_date'
    ]
    search_fields = ['title', 'requester_name', 'requester_phone', 'requester_email', 'description']
    readonly_fields = ['created_at', 'updated_at', 'total_payments', 'balance_due']
    fieldsets = (
        ("Requester Information", {
            'fields': ('requester_name', 'requester_phone', 'requester_email', 'requester_nid', 'customer')
        }),
        ("Service Details", {
            'fields': ('title', 'description', 'village', 'address_details', 'requested_date')
        }),
        ("Quotation & Payment", {
            'fields': ('quoted_amount', 'final_amount', 'payment_status', 'total_payments', 'balance_due')
        }),
        ("Assignment & Status", {
            'fields': ('status', 'assigned_to', 'completed_at', 'satisfaction_score')
        }),
        ("Notes & Audit", {
            'fields': ('notes', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    inlines = [PaymentInline]
    actions = ['mark_as_quoted', 'mark_as_accepted', 'mark_as_completed']

    def title_link(self, obj):
        url = reverse('admin:customers_servicerequest_change', args=[obj.id])
        return format_html('<a href="{}"><strong>{}</strong></a>', url, obj.title[:50])
    title_link.short_description = "Title"

    def requester_info(self, obj):
        info = f"<strong>{obj.requester_name}</strong><br>{obj.requester_phone}"
        if obj.requester_email:
            info += f"<br>{obj.requester_email}"
        if obj.customer:
            url = reverse('admin:customers_customer_change', args=[obj.customer.id])
            info += format_html('<br><a href="{}">→ Existing Customer</a>', url)
        return format_html(info)
    requester_info.short_description = "Requester"

    def village_link(self, obj):
        if obj.village:
            url = reverse('admin:customers_village_change', args=[obj.village.id])
            return format_html('<a href="{}">{}</a>', url, obj.village.name)
        return "-"
    village_link.short_description = "Village"

    def status_badge(self, obj):
        colors = {
            'pending': 'bg-gray-500',
            'quoted': 'bg-blue-500',
            'accepted': 'bg-indigo-500',
            'in_progress': 'bg-yellow-500',
            'completed': 'bg-green-500',
            'cancelled': 'bg-red-500',
            'rejected': 'bg-pink-500',
        }
        color = colors.get(obj.status, 'bg-gray-500')
        return format_html(
            '<span class="px-3 py-1 rounded-full text-white text-xs font-bold {}">{}</span>',
            color, obj.status.replace('_', ' ').title()
        )
    status_badge.short_description = "Status"

    def payment_status_badge(self, obj):
        colors = {
            'unpaid': 'bg-red-500',
            'partially_paid': 'bg-yellow-500',
            'paid': 'bg-green-500',
            'refunded': 'bg-purple-500',
        }
        color = colors.get(obj.payment_status, 'bg-gray-500')
        return format_html(
            '<span class="px-3 py-1 rounded-full text-white text-xs font-bold {}">{}</span>',
            color, obj.payment_status.replace('_', ' ').title()
        )
    payment_status_badge.short_description = "Payment"

    def total_payments(self, obj):
        return f"RWF {obj.total_payments:,.0f}"
    total_payments.short_description = "Paid"

    def balance_due(self, obj):
        due = obj.balance_due
        if due > 0:
            return format_html('<strong class="text-red-600">RWF {:,.0f}</strong>', due)
        return "Paid"
    balance_due.short_description = "Balance Due"

    # Bulk Actions
    def mark_as_quoted(self, request, queryset):
        updated = queryset.update(status='quoted')
        self.message_user(request, f"{updated} requests marked as quoted.")
    mark_as_quoted.short_description = "Mark selected as Quoted"

    def mark_as_accepted(self, request, queryset):
        updated = queryset.update(status='accepted')
        self.message_user(request, f"{updated} requests marked as accepted.")
    mark_as_accepted.short_description = "Mark selected as Accepted"

    def mark_as_completed(self, request, queryset):
        updated = queryset.filter(status='in_progress').update(status='completed', completed_at=timezone.now())
        self.message_user(request, f"{updated} requests marked as completed.")
    mark_as_completed.short_description = "Mark selected as Completed"

    class Media:
        css = {"all": ("admin/css/custom_admin.css",)}  # Optional custom styling