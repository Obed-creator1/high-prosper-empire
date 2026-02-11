# collector/admin.py — FULL MANAGEMENT WITH REAL NOTIFICATIONS
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.template.loader import render_to_string
from django.utils.html import format_html
from django.urls import reverse
from django.contrib import messages
from django.utils.translation import gettext_lazy as _
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from .models import (
    Collector, WasteCollectionSchedule, VehicleTurnCount,
    CollectorTask, CollectorLocationHistory
)
from fleet.models import Vehicle
from users.models import CustomUser
from .utils.notifications import notify_collector  # Import unified notifier
from notifications.signals import notify
from django.http import HttpResponse
import csv
from weasyprint import HTML
from io import BytesIO
import matplotlib.pyplot as plt
import io
import base64


# Custom filter (unchanged)
class ActiveFilter(admin.SimpleListFilter):
    title = _('Active')
    parameter_name = 'active'

    def lookups(self, request, model_admin):
        return (
            ('yes', _('Yes')),
            ('no', _('No')),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(is_active=True)
        if self.value() == 'no':
            return queryset.filter(is_active=False)
        return queryset


# ====================================================
# Collector Admin
# ====================================================
@admin.register(Collector)
class CollectorAdmin(GISModelAdmin):
    list_display = (
        'full_name_display', 'username', 'phone_display', 'email_display',
        'village_count_display', 'total_customers', 'rating_display',
        'efficiency_display', 'is_active', 'view_map', 'assigned_villages_list'
    )
    list_filter = (
        'is_active',
        'rating',
        'efficiency_percentage',
        ActiveFilter,  # ← Correct: pass the class, Django instantiates it
    )
    search_fields = (
        'user__username', 'user__first_name', 'user__last_name',
        'user__phone', 'user__email'
    )
    readonly_fields = (
        'phone_display', 'email_display', 'full_name_display',
        'total_customers', 'rating', 'rating_count', 'efficiency_percentage',
        'village_count_display', 'assigned_villages_list'
    )
    actions = ['send_notification', 'assign_task', 'mark_active', 'mark_inactive']

    fieldsets = (
        (_('User Info'), {
            'fields': ('user', 'full_name_display', 'phone_display', 'email_display')
        }),
        (_('Assignment'), {
            'fields': ('assigned_vehicle', 'assigned_villages_list',)  # ← we'll define this
        }),
        (_('Shift'), {
            'fields': ('shift_start', 'shift_end')
        }),
        (_('Performance'), {
            'fields': ('total_customers', 'rating', 'rating_count', 'expected_volume', 'actual_volume', 'efficiency_percentage')
        }),
        (_('Location & Status'), {
            'fields': ('current_location', 'last_location_update', 'is_active', 'is_deleted')
        }),
        (_('AI Insights'), {
            'fields': ('ai_insights', 'last_ai_update'),
            'classes': ('collapse',)
        }),
    )

    # Display methods
    def full_name_display(self, obj):
        return obj.full_name
    full_name_display.short_description = "Name"

    def username(self, obj):
        return obj.user.username
    username.short_description = "Username"

    def phone_display(self, obj):
        return obj.phone
    phone_display.short_description = "Phone"

    def email_display(self, obj):
        return obj.email
    email_display.short_description = "Email"

    def village_count_display(self, obj):
        return obj.village_count
    village_count_display.short_description = "Villages"

    # Show assigned villages (read-only)
    def assigned_villages_list(self, obj):
        villages = obj.assigned_villages
        if not villages.exists():
            return "None"
        return ", ".join(v.name for v in villages)
    assigned_villages_list.short_description = "Assigned Villages"
    def rating_display(self, obj):
        return f"{obj.rating:.1f} ★" if obj.rating > 0 else "-"
    rating_display.short_description = "Rating"

    def efficiency_display(self, obj):
        return f"{obj.efficiency_percentage:.1f}%"
    efficiency_display.short_description = "Efficiency"

    def view_map(self, obj):
        if obj.current_location:
            url = reverse('admin:collector_collectorlocationhistory_changelist') + f'?collector__id__exact={obj.id}'
            return format_html('<a href="{}">View Location History</a>', url)
        return "-"
    view_map.short_description = "Location"

    # Bulk actions with notifications
    @admin.action(description="Send notification to selected collectors")
    def send_notification(self, request, queryset):
        for collector in queryset:
            notify_collector(
                collector=collector,
                title="High Prosper Update",
                message="Your collection schedule has been updated. Check your tasks.",
                notification_type='info'
            )
        messages.success(request, f"Notifications sent to {queryset.count()} collectors.")

    @admin.action(description="Assign task to selected collectors")
    def assign_task(self, request, queryset):
        for collector in queryset:
            # Example: create a task
            task = CollectorTask.objects.create(
                collector=collector,
                title="Daily Collection Check",
                description="Verify all customers in assigned villages.",
                priority='high',
                due_date=timezone.now() + timezone.timedelta(days=1),
                ai_generated=False
            )
            notify_collector(
                collector=collector,
                title="New Task Assigned",
                message=f"Task: {task.title} - Due: {task.due_date.date()}",
                notification_type='task',
                target=task
            )
        messages.success(request, f"Tasks assigned to {queryset.count()} collectors.")

    @admin.action(description="Mark selected as active")
    def mark_active(self, request, queryset):
        queryset.update(is_active=True)
        for collector in queryset:
            notify_collector(
                collector=collector,
                title="Status Update",
                message="Your account has been activated.",
                notification_type='status'
            )
        messages.success(request, f"{queryset.count()} collectors marked active.")

    @admin.action(description="Mark selected as inactive")
    def mark_inactive(self, request, queryset):
        queryset.update(is_active=False)
        for collector in queryset:
            notify_collector(
                collector=collector,
                title="Status Update",
                message="Your account has been deactivated. Contact admin.",
                notification_type='status'
            )
        messages.success(request, f"{queryset.count()} collectors marked inactive.")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(is_deleted=False)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Limit user choices to collectors only"""
        if db_field.name == "user":
            kwargs["queryset"] = CustomUser.objects.filter(role='collector')
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    @admin.action(description="Export selected collectors to CSV")
    def export_to_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="collectors.csv"'
        writer = csv.writer(response)
        writer.writerow(['Name', 'Phone', 'Email', 'Rating', 'Efficiency', 'Customers'])
        for obj in queryset:
            writer.writerow([
                obj.full_name,
                obj.phone,
                obj.email,
                obj.rating,
                obj.efficiency_percentage,
                obj.total_customers
            ])
        return response

    @admin.action(description="Export selected collectors to PDF with charts")
    def export_to_pdf(self, request, queryset):
        # Generate charts
        efficiency_data = [c.efficiency_percentage for c in queryset]
        names = [c.full_name for c in queryset]

        # Efficiency Chart
        plt.figure(figsize=(10, 6))
        plt.bar(names, efficiency_data, color='#6b46c1')
        plt.xlabel('Collectors')
        plt.ylabel('Efficiency (%)')
        plt.title('Collector Efficiency')
        plt.xticks(rotation=45)
        efficiency_img = io.BytesIO()
        plt.savefig(efficiency_img, format='png', bbox_inches='tight')
        efficiency_img.seek(0)
        efficiency_chart_url = f"data:image/png;base64,{base64.b64encode(efficiency_img.getvalue()).decode()}"

        # Rating Chart
        plt.figure(figsize=(10, 6))
        ratings = [c.rating for c in queryset]
        plt.bar(names, ratings, color='#ec4899')
        plt.xlabel('Collectors')
        plt.ylabel('Rating (Stars)')
        plt.title('Collector Ratings')
        plt.xticks(rotation=45)
        rating_img = io.BytesIO()
        plt.savefig(rating_img, format='png', bbox_inches='tight')
        rating_img.seek(0)
        rating_chart_url = f"data:image/png;base64,{base64.b64encode(rating_img.getvalue()).decode()}"

        context = {
            'collectors': queryset,
            'now': timezone.now(),
            'efficiency_chart_url': efficiency_chart_url,
            'rating_chart_url': rating_chart_url
        }

        html_string = render_to_string('admin/collector_export.html', context)
        html = HTML(string=html_string, base_url=request.build_absolute_uri())
        result = html.write_pdf()

        response = HttpResponse(result, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="collectors_report_{timezone.now().strftime("%Y%m%d")}.pdf"'
        return response


# ====================================================
# Waste Collection Schedule Admin
# ====================================================
@admin.register(WasteCollectionSchedule)
class WasteCollectionScheduleAdmin(admin.ModelAdmin):
    list_display = ('village', 'collector', 'vehicle', 'get_day_of_week_display', 'week_number', 'year', 'is_completed', 'approved')
    list_filter = ('is_completed', 'approved', 'day_of_week', 'week_number', 'year')
    search_fields = ('village__name', 'collector__user__username')
    raw_id_fields = ('collector', 'vehicle')
    actions = ['mark_completed', 'approve_schedules']

    def mark_completed(self, request, queryset):
        for schedule in queryset:
            schedule.is_completed = True
            schedule.completed_at = timezone.now()
            schedule.save()
            if schedule.collector:
                notify_collector(
                    collector=schedule.collector,
                    title="Collection Completed",
                    message=f"Village {schedule.village.name} marked as collected.",
                    notification_type='collection'
                )
        messages.success(request, f"{queryset.count()} schedules marked completed.")

    def approve_schedules(self, request, queryset):
        for schedule in queryset:
            schedule.approved = True
            schedule.approved_by = request.user
            schedule.approved_at = timezone.now()
            schedule.save()
            if schedule.collector:
                notify_collector(
                    collector=schedule.collector,
                    title="Schedule Approved",
                    message=f"Your collection in {schedule.village.name} has been approved.",
                    notification_type='approval'
                )
        messages.success(request, f"{queryset.count()} schedules approved.")


# ====================================================
# Vehicle Turn Count Admin
# ====================================================
@admin.register(VehicleTurnCount)
class VehicleTurnCountAdmin(admin.ModelAdmin):
    list_display = ('vehicle', 'village', 'date', 'turn_count', 'monthly_total')
    list_filter = ('date', 'vehicle', 'village')
    search_fields = ('vehicle__number_plate', 'village__name')
    date_hierarchy = 'date'



# ====================================================
# Collector Task Admin
# ====================================================
@admin.register(CollectorTask)
class CollectorTaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'collector', 'priority', 'due_date', 'completed', 'ai_generated')
    list_filter = ('priority', 'completed', 'ai_generated', 'due_date')
    search_fields = ('title', 'description', 'collector__user__username')
    date_hierarchy = 'due_date'


# ====================================================
# Collector Location History Admin
# ====================================================
@admin.register(CollectorLocationHistory)
class CollectorLocationHistoryAdmin(GISModelAdmin):
    list_display = ('collector', 'timestamp', 'speed', 'battery_level')
    list_filter = ('timestamp', 'collector')
    search_fields = ('collector__user__username',)
    date_hierarchy = 'timestamp'
    display_raw = True  # Show raw coordinates