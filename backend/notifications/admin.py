# notifications/admin.py — HIGH PROSPER NOTIFICATIONS ADMIN (CUSTOMUSER SUPPORT)
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from django.urls import reverse
from django.http import HttpResponse
from django.db.models import Q, Count
from datetime import datetime, timedelta
import csv
from django.utils import timezone

from .models import PushSubscription, UnsubscribeToken
from notifications.base.admin import AbstractNotificationAdmin
from swapper import load_model
from users.models import CustomUser  # ← Your custom user model

Notification = load_model('notifications', 'Notification')


# ────────────────────────────────────────────────
# CUSTOM ACTIONS
# ────────────────────────────────────────────────

@admin.action(description=_("Mark selected as unread"))
def mark_unread(modeladmin, request, queryset):
    queryset.update(unread=True)


@admin.action(description=_("Mark selected as read"))
def mark_read(modeladmin, request, queryset):
    queryset.update(unread=False)


@admin.action(description=_("Deactivate selected push subscriptions"))
def deactivate_subscriptions(modeladmin, request, queryset):
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f"{updated} subscriptions deactivated.")


@admin.action(description=_("Activate selected push subscriptions"))
def activate_subscriptions(modeladmin, request, queryset):
    updated = queryset.update(is_active=True)
    modeladmin.message_user(request, f"{updated} subscriptions activated.")


@admin.action(description=_("Revoke selected unsubscribe tokens"))
def revoke_tokens(modeladmin, request, queryset):
    updated = queryset.update(is_active=False)
    modeladmin.message_user(request, f"{updated} tokens revoked.")


@admin.action(description=_("Send test push to selected subscriptions"))
def send_test_push_to_selected(modeladmin, request, queryset):
    success = 0
    failed = 0
    for sub in queryset.filter(is_active=True):
        try:
            from .utils import send_push_to_subscription
            send_push_to_subscription(
                sub,
                title="Test Notification — Admin Panel",
                message="This is a test push sent from Django admin.",
                url="/dashboard/",
                data={"source": "admin_test"}
            )
            success += 1
        except Exception as e:
            modeladmin.message_user(request, f"Failed for {sub.id}: {str(e)}", level='error')
            failed += 1

    modeladmin.message_user(request, f"Test push sent to {success} subscriptions. Failed: {failed}")


@admin.action(description=_("Export selected subscriptions — Extended CSV"))
def export_subscriptions_extended_csv(modeladmin, request, queryset):
    response = HttpResponse(content_type="text/csv")
    response['Content-Disposition'] = f'attachment; filename="push_subscriptions_{datetime.now().strftime("%Y%m%d_%H%M")}.csv"'

    writer = csv.writer(response)
    writer.writerow([
        "ID", "User ID", "Username/Email", "Phone", "Device ID",
        "Endpoint (short)", "Browser", "Platform", "Active", "Health Score",
        "Created", "Last Updated", "Last Successful Push", "Push Count",
        "Keys p256dh Length", "Keys Auth Length"
    ])

    for obj in queryset:
        health_score = obj.health_score() if hasattr(obj, 'health_score') else "N/A"
        user_info = (
            f"{obj.user.id} - {obj.user.username}" if obj.user else
            obj.phone or obj.device_id or "Anonymous"
        )
        writer.writerow([
            obj.id,
            obj.user.id if obj.user else "",
            obj.user.username if obj.user else "",
            obj.phone or "",
            obj.device_id or "",
            obj.endpoint[:80] + "..." if len(obj.endpoint) > 80 else obj.endpoint,
            obj.browser,
            obj.platform,
            "Yes" if obj.is_active else "No",
            health_score,
            obj.created_at.strftime("%Y-%m-%d %H:%M"),
            obj.updated_at.strftime("%Y-%m-%d %H:%M") if obj.updated_at else "",
            obj.last_push_sent.strftime("%Y-%m-%d %H:%M") if obj.last_push_sent else "",
            obj.push_count or 0,
            len(obj.keys_p256dh) if obj.keys_p256dh else 0,
            len(obj.keys_auth) if obj.keys_auth else 0,
            ])

    return response


# ────────────────────────────────────────────────
# NOTIFICATION ADMIN
# ────────────────────────────────────────────────

@admin.register(Notification)
class NotificationAdmin(AbstractNotificationAdmin):
    list_display = (
        'recipient_link',
        'level_colored',
        'verb_short',
        'unread_badge',
        'timestamp',
        'public_badge'
    )
    list_filter = ('level', 'unread', 'public', 'timestamp')
    search_fields = ('recipient__username', 'recipient__email', 'verb', 'description')
    date_hierarchy = 'timestamp'
    readonly_fields = ('timestamp', 'action_object_url', 'actor_object_url', 'target_object_url')
    raw_id_fields = ('recipient',)
    list_per_page = 50

    def recipient_link(self, obj):
        if obj.recipient:
            url = reverse("admin:users_customuser_change", args=[obj.recipient.id])
            return format_html('<a href="{}">{}</a>', url, obj.recipient)
        return "-"
    recipient_link.short_description = _("Recipient")

    def level_colored(self, obj):
        colors = {
            'success': 'bg-green-100 text-green-800',
            'info': 'bg-blue-100 text-blue-800',
            'warning': 'bg-yellow-100 text-yellow-800',
            'error': 'bg-red-100 text-red-800',
        }
        cls = colors.get(obj.level, 'bg-gray-100 text-gray-800')
        return format_html('<span class="px-2 py-1 rounded-full {}">{}</span>', cls, obj.get_level_display())
    level_colored.short_description = _("Level")

    def verb_short(self, obj):
        return obj.verb[:40] + "..." if len(obj.verb) > 40 else obj.verb
    verb_short.short_description = _("Verb")

    def unread_badge(self, obj):
        return format_html(
            '<span class="px-2 py-1 rounded-full {}">{}</span>',
            'bg-red-500 text-white' if obj.unread else 'bg-gray-300 text-gray-700',
            'Unread' if obj.unread else 'Read'
        )
    unread_badge.short_description = _("Status")

    def public_badge(self, obj):
        return format_html(
            '<span class="px-2 py-1 rounded-full {}">{}</span>',
            'bg-purple-600 text-white' if obj.public else 'bg-gray-400 text-gray-800',
            'Public' if obj.public else 'Private'
        )
    public_badge.short_description = _("Visibility")

    actions = [mark_read, mark_unread]


# ────────────────────────────────────────────────
# HEALTH RANGE FILTER
# ────────────────────────────────────────────────

class HealthScoreRangeFilter(admin.SimpleListFilter):
    title = _('Health Score')
    parameter_name = 'health_score'

    def lookups(self, request, model_admin):
        return (
            ('90-100',   _('Excellent (90–100)')),
            ('70-89',    _('Good (70–89)')),
            ('50-69',    _('Average (50–69)')),
            ('30-49',    _('Poor (30–49)')),
            ('0-29',     _('Critical (0–29)')),
            ('inactive', _('Inactive / No Score')),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        val = self.value()

        if val == '90-100':
            return queryset.filter(
                is_active=True,
                last_push_sent__gte=now - timedelta(days=7)
            )

        elif val == '70-89':
            return queryset.filter(
                is_active=True,
                last_push_sent__lt=now - timedelta(days=7),
                last_push_sent__gte=now - timedelta(days=14)
            )

        elif val == '50-69':
            return queryset.filter(
                is_active=True,
                last_push_sent__lt=now - timedelta(days=14),
                last_push_sent__gte=now - timedelta(days=30)
            )

        elif val == '30-49':
            return queryset.filter(
                is_active=True,
                last_push_sent__lt=now - timedelta(days=30),
                last_push_sent__gte=now - timedelta(days=60)
            )

        elif val == '0-29':
            return queryset.filter(
                is_active=True,
                last_push_sent__lt=now - timedelta(days=60)
            ).filter(
                last_push_sent__isnull=True
            ) | queryset.filter(
                is_active=True,
                last_push_sent__isnull=True
            )

        elif val == 'inactive':
            return queryset.filter(is_active=False)

        return queryset


# ────────────────────────────────────────────────
# PUSH SUBSCRIPTION ADMIN
# ────────────────────────────────────────────────

@admin.register(PushSubscription)
class PushSubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        'identifier_link',
        'browser_platform',
        'is_active_badge',
        'health_progress_bar',
        'push_count_badge',
        'last_push_sent_display',
        'created_at'
    )
    list_filter = (
        HealthScoreRangeFilter,
        'is_active',
        'browser',
        'platform',
        'created_at',
        'updated_at'
    )
    search_fields = (
        'user__username',
        'user__email',
        'phone',
        'device_id',
        'endpoint'
    )
    date_hierarchy = 'created_at'
    readonly_fields = (
        'created_at',
        'updated_at',
        'endpoint_preview',
        'browser',
        'platform',
        'push_count_badge',
        'health_progress_bar_detail'
    )
    list_per_page = 30

    fieldsets = (
        (_('Ownership'), {
            'fields': ('user', 'phone', 'device_id')
        }),
        (_('Subscription'), {
            'fields': ('endpoint_preview', 'browser', 'platform', 'is_active')
        }),
        (_('Health & Activity'), {
            'fields': ('push_count_badge', 'health_progress_bar_detail', 'last_push_sent_display', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    # ── Custom display methods ────────────────────────────────────────────────

    def identifier_link(self, obj):
        if obj.user:
            url = reverse("admin:users_customuser_change", args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.username or obj.user.email or "User")
        return obj.phone or obj.device_id or "Anonymous"
    identifier_link.short_description = _("User / Phone / Device")

    def browser_platform(self, obj):
        return f"{obj.browser} • {obj.platform}"
    browser_platform.short_description = _("Browser / Platform")

    def is_active_badge(self, obj):
        return format_html(
            '<span class="px-3 py-1 rounded-full text-xs font-medium {}">{}',
            'bg-green-100 text-green-800' if obj.is_active else 'bg-red-100 text-red-800',
            'Active' if obj.is_active else 'Inactive'
        )
    is_active_badge.short_description = _("Status")

    def health_progress_bar(self, obj):
        score = obj.health_score()
        color = "#10b981" if score >= 80 else "#f59e0b" if score >= 50 else "#ef4444"
        return format_html(
            '''
            <div class="relative w-32 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div class="absolute h-full transition-all" 
                     style="width: {}%; background: linear-gradient(to right, {}, #ffffff);"></div>
                <div class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
                    {}%
                </div>
            </div>
            ''',
            score, color, score
        )
    health_progress_bar.short_description = _("Health")

    def health_progress_bar_detail(self, obj):
        score = obj.health_score()
        color = "#10b981" if score >= 80 else "#f59e0b" if score >= 50 else "#ef4444"
        return format_html(
            '''
            <div class="w-full h-8 bg-gray-200 rounded-full overflow-hidden mb-3 relative">
                <div class="absolute h-full transition-all flex items-center justify-center text-white font-bold text-sm drop-shadow-md"
                     style="width: {}%; background: linear-gradient(to right, {}, #ffffff);">
                    {}%
                </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400">
                Last successful push: {}
            </p>
            ''',
            score, color, score,
            obj.last_push_sent.strftime("%Y-%m-%d %H:%M") if obj.last_push_sent else "Never"
        )
    health_progress_bar_detail.short_description = _("Health Score")

    def push_count_badge(self, obj):
        count = obj.push_count or 0
        color = 'bg-green-100 text-green-800' if count > 0 else 'bg-gray-100 text-gray-800'
        return format_html('<span class="px-3 py-1 rounded-full text-xs font-medium {}">{}</span>', color, count)
    push_count_badge.short_description = _("Pushes Sent")

    def last_push_sent_display(self, obj):
        if obj.last_push_sent:
            return obj.last_push_sent.strftime("%Y-%m-%d %H:%M")
        return format_html('<span class="text-gray-500">Never</span>')
    last_push_sent_display.short_description = _("Last Push")

    def endpoint_preview(self, obj):
        return format_html('<code title="{}">{}</code>', obj.endpoint, obj.endpoint[:80] + '...')
    endpoint_preview.short_description = _("Endpoint")

    # Stats banner + chart data
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}

        total = PushSubscription.objects.count()
        active = PushSubscription.objects.filter(is_active=True).count()
        healthy = PushSubscription.objects.filter(
            is_active=True,
            last_push_sent__gte=timezone.now() - timedelta(days=7)
        ).count()
        recent = PushSubscription.objects.filter(updated_at__gte=timezone.now() - timedelta(days=7)).count()

        # Chart data — last 30 days activity
        from django.db.models.functions import TruncDay
        chart_data = PushSubscription.objects.filter(
            last_push_sent__gte=timezone.now() - timedelta(days=30)
        ).annotate(
            day=TruncDay('last_push_sent')
        ).values('day').annotate(
            count=Count('id')
        ).order_by('day')

        chart_labels = [entry['day'].strftime("%b %d") for entry in chart_data]
        chart_values = [entry['count'] for entry in chart_data]

        extra_context.update({
            'admin_stats': {
                'total': total,
                'active': active,
                'healthy': healthy,
                'recent': recent,
                'health_rate': round(healthy / active * 100, 1) if active > 0 else 0,
            },
            'chart_data': {
                'labels': chart_labels,
                'values': chart_values,
            }
        })

        return super().changelist_view(request, extra_context=extra_context)

    change_list_template = "admin/notifications/pushsubscription/change_list.html"

    actions = [
        activate_subscriptions,
        deactivate_subscriptions,
        send_test_push_to_selected,
        export_subscriptions_extended_csv,
    ]


# ────────────────────────────────────────────────
# SUBSCRIPTION INLINE (for CustomUser admin)
# ────────────────────────────────────────────────

class SubscriptionInline(admin.TabularInline):
    model = PushSubscription
    fields = ('browser', 'platform', 'is_active', 'created_at', 'last_push_sent_display', 'health_progress_bar_detail')
    readonly_fields = ('browser', 'platform', 'created_at', 'last_push_sent_display', 'health_progress_bar_detail')
    extra = 0
    can_delete = True
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False  # Only view/edit existing

    # Define methods for readonly_fields
    def last_push_sent_display(self, obj):
        if obj.last_push_sent:
            return obj.last_push_sent.strftime("%Y-%m-%d %H:%M")
        return format_html('<span class="text-gray-500">Never</span>')
    last_push_sent_display.short_description = _("Last Push")

    def health_progress_bar_detail(self, obj):
        score = obj.health_score()
        color = "#10b981" if score >= 80 else "#f59e0b" if score >= 50 else "#ef4444"
        return format_html(
            '''
            <div class="w-full h-8 bg-gray-200 rounded-full overflow-hidden mb-3 relative">
                <div class="absolute h-full transition-all flex items-center justify-center text-white font-bold text-sm drop-shadow-md"
                     style="width: {}%; background: linear-gradient(to right, {}, #ffffff);">
                    {}%
                </div>
            </div>
            <p class="text-sm text-gray-600">
                Last successful push: {}
            </p>
            ''',
            score, color, score,
            obj.last_push_sent.strftime("%Y-%m-%d %H:%M") if obj.last_push_sent else "Never"
        )
    health_progress_bar_detail.short_description = _("Health Score")


# ────────────────────────────────────────────────
# CUSTOM USER ADMIN OVERRIDE
# ────────────────────────────────────────────────

admin.site.unregister(CustomUser)

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):  # or inherit from your original CustomUserAdmin
    inlines = [SubscriptionInline]

    # Add your original CustomUserAdmin fields, list_display, etc. here if needed
    # Example:
    list_display = ('username', 'email', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    list_filter = ('is_staff', 'is_active')


# ────────────────────────────────────────────────
# UNSUBSCRIBE TOKEN ADMIN
# ────────────────────────────────────────────────

@admin.register(UnsubscribeToken)
class UnsubscribeTokenAdmin(admin.ModelAdmin):
    list_display = (
        'token_short',
        'channel_colored',
        'identifier',
        'status_badge',
        'created_at',
        'used_at'
    )
    list_filter = ('channel', 'is_active', 'created_at', 'used_at')
    search_fields = ('token', 'email', 'phone', 'user__username')
    date_hierarchy = 'created_at'
    readonly_fields = ('token', 'created_at', 'used_at')
    list_per_page = 40

    def token_short(self, obj):
        return format_html('<code title="{}">{}</code>', obj.token, obj.token[:12] + '...')
    token_short.short_description = _("Token")

    def channel_colored(self, obj):
        colors = {
            'email': 'bg-blue-100 text-blue-800',
            'sms': 'bg-green-100 text-green-800',
            'push': 'bg-purple-100 text-purple-800',
        }
        cls = colors.get(obj.channel, 'bg-gray-100 text-gray-800')
        return format_html('<span class="px-2 py-1 rounded-full {}">{}</span>', cls, obj.channel.upper())
    channel_colored.short_description = _("Channel")

    def identifier(self, obj):
        if obj.user:
            url = reverse("admin:users_customuser_change", args=[obj.user.id])
            return format_html('<a href="{}">{}</a>', url, obj.user.username or obj.user.email)
        return obj.email or obj.phone or "-"
    identifier.short_description = _("User / Email / Phone")

    def status_badge(self, obj):
        if obj.used_at:
            return format_html('<span class="px-3 py-1 rounded-full bg-amber-100 text-amber-800">Used</span>')
        if not obj.is_active:
            return format_html('<span class="px-3 py-1 rounded-full bg-red-100 text-red-800">Revoked</span>')
        if obj.expires_at and obj.expires_at < timezone.now():
            return format_html('<span class="px-3 py-1 rounded-full bg-orange-100 text-orange-800">Expired</span>')
        return format_html('<span class="px-3 py-1 rounded-full bg-green-100 text-green-800">Active</span>')
    status_badge.short_description = _("Status")

    actions = [revoke_tokens]