# reports/admin.py - COMPLETE FIXED VERSION
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from .models import ReportCategory, ReportTemplate, Report, ReportLog


@admin.register(ReportCategory)
class ReportCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    list_editable = ['is_active']
    ordering = ['name']


@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'category', 'is_active', 'created_by']
    list_filter = ['category', 'report_type', 'is_active', 'created_at']
    search_fields = ['name', 'description']
    raw_id_fields = ['category', 'created_by']
    autocomplete_fields = ['category']
    ordering = ['category', 'name']


class ReportLogInline(admin.TabularInline):
    model = ReportLog
    fields = ['level', 'message', 'timestamp']
    readonly_fields = ['level', 'message', 'timestamp']
    extra = 0
    max_num = 10
    can_delete = False


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    """Enhanced admin for Report model"""
    list_display = [
        'title', 'template_link', 'category', 'status_badge',
        'priority', 'format', 'user_link', 'completed_at', 'duration_display'
    ]
    list_filter = [
        'status', 'priority', 'format', 'category', 'template__report_type',
        'created_at', 'completed_at'
    ]
    search_fields = ['title', 'parameters__name', 'user__username']
    readonly_fields = [
        'id', 'created_at', 'updated_at', 'task_id', 'duration_seconds',
        'row_count', 'generated_at', 'completed_at', 'file_size'
    ]
    raw_id_fields = ['user', 'template']
    inlines = [ReportLogInline]

    # ✅ FIXED: Proper field ordering
    fields = [
        'title', 'template', 'category', 'user', 'parameters', 'priority', 'format',
        'status', 'task_id',  # ✅ This field now exists
        ('generated_at', 'completed_at'),
        ('duration_seconds', 'row_count'),
        'file', 'file_size',
        'error_message',
        'created_at', 'updated_at'
    ]

    # Custom actions
    actions = ['mark_completed', 'mark_failed', 'retry_failed']

    def get_queryset(self, request):
        """Optimize queryset for admin"""
        return super().get_queryset(request).select_related(
            'template', 'category', 'user'
        ).prefetch_related('logs')

    def title(self, obj):
        return obj.title
    title.short_description = 'Report Title'
    title.admin_order_field = 'title'

    def template_link(self, obj):
        url = reverse('admin:reports_reporttemplate_change', args=[obj.template.id]) if obj.template else '#'
        return format_html(
            '<a href="{}">{}</a>',
            url, obj.template.name if obj.template else 'N/A'
        )
    template_link.short_description = 'Template'

    def user_link(self, obj):
        url = reverse('admin:auth_user_change', args=[obj.user.id]) if obj.user else '#'
        return format_html(
            '<a href="{}">{}</a>',
            url, obj.user.username if obj.user else 'N/A'
        )
    user_link.short_description = 'User'

    def status_badge(self, obj):
        colors = {
            'completed': 'success',
            'generating': 'warning',
            'pending': 'info',
            'failed': 'danger',
            'cancelled': 'secondary'
        }
        color = colors.get(obj.status, 'secondary')
        return format_html(
            '<span class="badge badge-{}">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    status_badge.admin_order_field = 'status'

    def duration_display(self, obj):
        if obj.duration_seconds:
            minutes, seconds = divmod(obj.duration_seconds, 60)
            return f"{minutes}m {seconds}s"
        return '-'
    duration_display.short_description = 'Duration'
    duration_display.admin_order_field = 'duration_seconds'

    def mark_completed(self, request, queryset):
        """Mark selected reports as completed"""
        updated = queryset.update(status='completed')
        self.message_user(request, f'{updated} report(s) marked as completed.')
    mark_completed.short_description = "Mark selected reports as completed"
    mark_completed.allowed_permissions = ('change',)

    def mark_failed(self, request, queryset):
        """Mark selected reports as failed"""
        updated = queryset.update(status='failed')
        self.message_user(request, f'{updated} report(s) marked as failed.')
    mark_failed.short_description = "Mark selected reports as failed"
    mark_failed.allowed_permissions = ('change',)

    def retry_failed(self, request, queryset):
        """Retry failed reports"""
        from .tasks import generate_report_task
        retried = 0
        for report in queryset.filter(status='failed'):
            task = generate_report_task.delay(
                report_id=str(report.id),
                template_id=str(report.template.id),
                parameters=report.parameters,
                format=report.format,
                priority=report.priority
            )
            report.task_id = task.id
            report.status = 'pending'
            report.save()
            retried += 1
        self.message_user(request, f'{retried} failed report(s) queued for retry.')
    retry_failed.short_description = "Retry failed reports"
    retry_failed.allowed_permissions = ('change',)

    def get_readonly_fields(self, request, obj=None):
        """Dynamic readonly fields"""
        readonly_fields = list(self.readonly_fields)
        if obj and obj.status in ['completed', 'failed', 'cancelled']:
            readonly_fields.append('title')
            readonly_fields.append('parameters')
            readonly_fields.append('priority')
            readonly_fields.append('format')
        return readonly_fields


@admin.register(ReportLog)
class ReportLogAdmin(admin.ModelAdmin):
    list_display = ['report_link', 'level', 'message_preview', 'timestamp']
    list_filter = ['level', 'timestamp']
    search_fields = ['message', 'metadata']
    raw_id_fields = ['report']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']

    def report_link(self, obj):
        url = reverse('admin:reports_report_change', args=[obj.report.id])
        return format_html('<a href="{}">Report #{}</a>', url, obj.report.id)
    report_link.short_description = 'Report'

    def message_preview(self, obj):
        return obj.message[:100] + '...' if len(obj.message) > 100 else obj.message
    message_preview.short_description = 'Message Preview'