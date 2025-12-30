# backend/tenants/admin.py
from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe

from .models import Company


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """
    Admin interface for multi-tenant Company (Tenant) management
    """
    list_display = [
        'name',
        'slug',
        'currency',
        'timezone',
        'is_active',
        'created_at',
        'user_count',
        'view_on_site_link',
    ]
    list_filter = ['is_active', 'currency', 'timezone', 'created_at']
    search_fields = ['name', 'slug']
    readonly_fields = ['created_at', 'logo_preview', 'slug_preview']
    prepopulated_fields = {"slug": ("name",)}  # Auto-generate slug from name
    fieldsets = (
        ('Company Information', {
            'fields': ('name', 'slug', 'logo', 'currency', 'timezone')
        }),
        ('Status', {
            'fields': ('is_active',),
        }),
        ('Branding Preview', {
            'fields': ('slug_preview', 'logo_preview'),
            'classes': ('collapse',),
        }),
        ('Metadata', {
            'fields': ('created_at',),
            'classes': ('collapse',),
        }),
    )

    def slug_preview(self, obj):
        if obj.slug:
            return format_html(
                '<code class="bg-gray-100 px-3 py-1 rounded">{}.highprosper.com</code>',
                obj.slug
            )
        return "—"
    slug_preview.short_description = "Subdomain Preview"

    def logo_preview(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{}" style="max-height: 150px; border-radius: 8px;" />',
                obj.logo.url
            )
        return "(No logo uploaded)"
    logo_preview.short_description = "Current Logo"

    def user_count(self, obj):
        count = obj.users.count()
        url = reverse("admin:users_customuser_changelist") + f"?company__id__exact={obj.id}"
        return format_html('<a href="{}">{} Users</a>', url, count)
    user_count.short_description = "Users"

    def view_on_site_link(self, obj):
        if obj.slug:
            url = f"https://{obj.slug}.highprosper.com"
            return format_html('<a href="{}" target="_blank">Open Tenant →</a>', url)
        return "—"
    view_on_site_link.short_description = "Live Site"

    class Media:
        css = {
            'all': ('admin/css/tenants.css',)  # Optional: custom styling
        }

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # Optional: restrict non-superusers to their company
        return qs.filter(id=request.user.company.id) if request.user.company else qs.none()