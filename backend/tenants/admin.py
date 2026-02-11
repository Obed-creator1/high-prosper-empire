# backend/tenants/admin.py
import csv
from datetime import timedelta

from django.contrib.admin.sites import AdminSite
from django.contrib import admin, messages
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.utils.html import format_html
from django.urls import reverse, path
from django.utils.safestring import mark_safe
from django import forms
from django.utils.translation import gettext_lazy as _
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO

from .models import Company, Branch

from django.contrib.auth import get_user_model

User = get_user_model()

class CustomAdminSite(AdminSite):
    """
    Custom admin site with enhanced dashboard stats
    """
    site_header = _("High Prosper Admin")
    site_title = _("High Prosper Admin Portal")
    index_title = _("Dashboard")

    def get_app_list(self, request):
        """
        Optional: Customize app list order or visibility if needed
        """
        app_list = super().get_app_list(request)
        # You can reorder apps here if desired
        return app_list

    def each_context(self, request):
        """
        Add global context variables available to ALL admin templates
        This is the right place for dashboard stats
        """
        context = super().each_context(request)

        # Compute real stats
        stats = {
            # Company stats
            'active_companies_count': Company.objects.filter(is_active=True).count(),
            'total_companies': Company.objects.count(),
            'new_companies_this_month': Company.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=30)
            ).count(),

            # Branch stats
            'total_branches': Branch.objects.count(),
            'active_branches': Branch.objects.filter(is_active=True).count(),
            'branches_without_manager': Branch.objects.filter(manager__isnull=True).count(),

            # User stats (adjust related_name if different)
            'total_active_users': User.objects.filter(is_active=True).count(),
            'new_users_this_month': User.objects.filter(
                date_joined__gte=timezone.now() - timedelta(days=30)
            ).count(),
        }

        # Add stats to context
        context.update(stats)

        return context

    def index(self, request, extra_context=None):
        """
        Optional: Customize the index page context if needed
        """
        extra_context = extra_context or {}
        # You can add more specific index-only context here if desired
        return super().index(request, extra_context=extra_context)


admin_site = CustomAdminSite(name='custom_admin')

class UserInline(admin.TabularInline):
    model = User
    extra = 0
    fields = ['username', 'email', 'full_name_display', 'role', 'is_active', 'is_verified']
    readonly_fields = ['username', 'email', 'full_name_display']
    can_delete = False
    show_change_link = True
    verbose_name = "User"
    verbose_name_plural = "Users"

    # Optional: If you really want full_name as readonly, define it as a method in the inline
    def full_name_display(self, obj):
        return obj.get_full_name()
    full_name_display.short_description = "Full Name"

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('branch')

class AssignManagerForm(forms.Form):
    manager = forms.ModelChoiceField(
        queryset=User.objects.filter(is_active=True, is_staff=True).order_by('username'),
        label=_("Select Manager"),
        required=True,
        empty_label=_("--- Choose a Manager ---"),
        help_text=_("This manager will be assigned to all selected branches.")
    )

class BranchInline(admin.TabularInline):
    """
    Inline editing of Branches directly inside Company admin page
    """
    model = Branch
    extra = 1  # Number of empty rows to show
    fields = ['name', 'city', 'region', 'phone', 'email', 'is_active', 'manager']
    readonly_fields = ['created_at']
    prepopulated_fields = {}
    show_change_link = True
    verbose_name = "Branch"
    verbose_name_plural = "Branches"
    ordering = ['name']

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('manager')


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    """
    Advanced admin interface for multi-tenant Company (Tenant) management
    """
    # List display with rich custom columns
    list_display = [
        'name_link',
        'slug_preview',
        'logo_thumbnail',
        'currency',
        'timezone',
        'is_active_badge',
        'created_at_formatted',
        'user_count_link',
        'branch_count_link',
        'view_live_site',
    ]
    list_display_links = ['name_link']
    list_filter = [
        'is_active',
        'currency',
        'timezone',
        'country',
        'city',
        'created_at',
    ]
    search_fields = ['name', 'slug', 'email', 'phone', 'tax_id']
    ordering = ['name']
    date_hierarchy = 'created_at'
    list_per_page = 25

    # Fieldsets - All fields organized logically
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'logo', 'website'),
            'classes': ('wide',),
        }),
        ('Contact & Location', {
            'fields': ('email', 'phone', 'address', 'city', 'country'),
        }),
        ('Financial & Operational Settings', {
            'fields': ('currency', 'timezone', 'tax_id'),
        }),
        ('Status & Tracking', {
            'fields': ('is_active', 'created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',),
        }),
        ('Advanced Previews', {
            'fields': ('slug_preview_full', 'logo_preview_full'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ['slug_preview_full', 'logo_preview_full', 'created_at', 'updated_at']
    prepopulated_fields = {"slug": ("name",)}

    inlines = [BranchInline]  # You can add BranchInline here if you want inline editing

    # Custom display methods (all fields covered)
    def name_link(self, obj):
        url = reverse("admin:tenants_company_change", args=[obj.pk])
        return format_html('<a href="{}">{}</a>', url, obj.name)
    name_link.short_description = "Company Name"
    name_link.admin_order_field = 'name'

    def slug_preview(self, obj):
        return format_html('<code>{}.highprosper.com</code>', obj.slug) if obj.slug else "—"
    slug_preview.short_description = "Subdomain"

    def slug_preview_full(self, obj):
        if obj.slug:
            url = f"https://{obj.slug}.highprosper.com"
            return format_html(
                '<strong>Live Subdomain:</strong><br>'
                '<a href="{}" target="_blank" style="color:#2563eb;">{}</a>',
                url, url
            )
        return "No subdomain"
    slug_preview_full.short_description = "Full Subdomain Preview"

    def logo_thumbnail(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{}" style="max-height:40px; border-radius:4px;" />',
                obj.logo.url
            )
        return "—"
    logo_thumbnail.short_description = "Logo"

    def logo_preview_full(self, obj):
        if obj.logo:
            return format_html(
                '<img src="{}" style="max-height:220px; border-radius:8px; box-shadow:0 4px 12px rgba(0,0,0,0.1);" />',
                obj.logo.url
            )
        return "(No logo uploaded)"
    logo_preview_full.short_description = "Logo Preview"

    def is_active_badge(self, obj):
        color = "#10b981" if obj.is_active else "#ef4444"
        text = "Active" if obj.is_active else "Inactive"
        return format_html('<span style="color:{}; font-weight:bold;">● {}</span>', color, text)
    is_active_badge.short_description = "Status"
    is_active_badge.admin_order_field = 'is_active'

    def created_at_formatted(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M")
    created_at_formatted.short_description = "Created"
    created_at_formatted.admin_order_field = 'created_at'

    def user_count_link(self, obj):
        count = obj.users.count()  # Adjust related_name if different
        url = reverse("admin:users_customuser_changelist") + f"?company_id__exact={obj.id}"
        return format_html('<a href="{}">{} Users</a>', url, count)
    user_count_link.short_description = "Users"

    def branch_count_link(self, obj):
        count = obj.branches.count()
        url = reverse("admin:tenants_branch_changelist") + f"?company_id__exact={obj.id}"
        return format_html('<a href="{}">{} Branches</a>', url, count)
    branch_count_link.short_description = "Branches"

    def view_live_site(self, obj):
        if obj.slug:
            url = f"https://{obj.slug}.highprosper.com"
            return format_html(
                '<a href="{}" target="_blank" style="color:#2563eb;">Open Site →</a>',
                url
            )
        return "—"
    view_live_site.short_description = "Live Site"

    # Custom actions
    actions = ['make_active', 'make_inactive', 'export_as_pdf']

    @admin.action(description="Mark selected companies as Active")
    def make_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} companies marked as active.")

    @admin.action(description="Mark selected companies as Inactive")
    def make_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} companies marked as inactive.")

    @admin.action(description="Export selected companies to PDF")
    def export_as_pdf(self, request, queryset):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        elements = []

        styles = getSampleStyleSheet()
        title = Paragraph("High Prosper Companies Report", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 24))

        # Summary stats
        total = queryset.count()
        active = queryset.filter(is_active=True).count()
        summary_data = [
            ["Total Companies", total],
            ["Active Companies", active],
            ["Inactive Companies", total - active],
        ]
        summary_table = Table(summary_data, colWidths=[3*inch, 3*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightblue),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 24))

        # Company list
        data = [['Name', 'Slug', 'Email', 'Phone', 'Currency', 'Active', 'Branches', 'Users']]
        for company in queryset:
            branch_count = company.branches.count()
            user_count = company.users.count()  # Adjust related_name
            data.append([
                company.name,
                company.slug,
                company.email or '—',
                company.phone or '—',
                company.currency,
                'Yes' if company.is_active else 'No',
                branch_count,
                user_count
            ])

        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.darkblue),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('FONTSIZE', (0,0), (-1,0), 12),
            ('BOTTOMPADDING', (0,0), (-1,0), 12),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))

        elements.append(table)

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(content_type='application/pdf')
        filename = f"companies_export_{timezone.now().strftime('%Y%m%d_%H%M')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.write(buffer.getvalue())
        return response

    # Security: Restrict non-superusers
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'company') and request.user.company:
            return qs.filter(id=request.user.company.id)
        return qs.none()

    class Media:
        css = {
            'all': ('admin/css/tenants-admin.css',)
        }
        js = ('admin/js/tenants-admin.js',)

    def save_model(self, request, obj, form, change):
        if not change:  # New company
            obj.created_by = request.user
        super().save_model(request, obj, form, change)



@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    """
    Advanced admin interface for Branch management
    """
    # List display
    list_display = [
        'name_link',
        'company_link',
        'city',
        'manager_display',
        'phone',
        'is_active_badge',
        'created_at_formatted',
        'user_count_link',
        #'view_company_site',
    ]
    list_display_links = ['name_link']
    list_filter = [
        'company',
        'is_active',
        'city',
        'region',
        'manager',               # Custom filter by manager
        'created_at',
    ]
    search_fields = [
        'name', 'city', 'region', 'address',
        'company__name', 'manager__username', 'manager__email'
    ]
    ordering = ['company__name', 'name']
    date_hierarchy = 'created_at'
    list_per_page = 25

    # Fieldsets
    fieldsets = (
        ('Branch Information', {
            'fields': ('company', 'name', 'address', 'city', 'region'),
            'classes': ('wide',),
        }),
        ('Contact Details', {
            'fields': ('phone', 'email'),
        }),
        ('Management', {
            'fields': ('manager',),
        }),
        ('Status & Metadata', {
            'fields': ('is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
        ('Preview & Links', {
            'fields': (),  # empty tuple = no fields
            'description': 'No preview available (subdomain feature disabled)',
            'classes': ('collapse',),
        }),
    )

    # Inlines
    inlines = [UserInline]  # ← Inline Users here

    readonly_fields = ['created_at', 'updated_at']

    def get_readonly_fields(self, request, obj=None):
        readonly = super().get_readonly_fields(request, obj)
        return readonly

    # Custom display methods
    def name_link(self, obj):
        url = reverse("admin:tenants_branch_change", args=[obj.pk])
        return format_html('<a href="{}">{}</a>', url, obj.name)
    name_link.short_description = "Branch"
    name_link.admin_order_field = 'name'

    def company_link(self, obj):
        url = reverse("admin:tenants_company_change", args=[obj.company.pk])
        return format_html('<a href="{}">{}</a>', url, obj.company.name)
    company_link.short_description = "Company"
    company_link.admin_order_field = 'company__name'

    def manager_display(self, obj):
        if obj.manager:
            url = reverse("admin:users_customuser_change", args=[obj.manager.pk])
            name = obj.manager.get_full_name() or obj.manager.username
            return format_html('<a href="{}">{}</a>', url, name)
        return "—"
    manager_display.short_description = "Manager"

    def is_active_badge(self, obj):
        color = "#10b981" if obj.is_active else "#ef4444"
        text = "Active" if obj.is_active else "Inactive"
        return format_html('<span style="color:{}; font-weight:bold;">● {}</span>', color, text)
    is_active_badge.short_description = "Status"
    is_active_badge.admin_order_field = 'is_active'

    def created_at_formatted(self, obj):
        return obj.created_at.strftime("%Y-%m-%d %H:%M")
    created_at_formatted.short_description = "Created"
    created_at_formatted.admin_order_field = 'created_at'

    def user_count_link(self, obj):
        count = obj.users.count()
        url = reverse("admin:users_customuser_changelist") + f"?branch_id__exact={obj.id}"
        return format_html('<a href="{}">{} Users</a>', url, count)
    user_count_link.short_description = "Users"


    # Custom actions
    actions = ['make_active', 'make_inactive', 'assign_manager_with_confirm', 'export_as_csv', 'export_as_pdf']

    @admin.action(description="Mark selected branches as Active")
    def make_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} branches activated.")

    @admin.action(description="Mark selected branches as Inactive")
    def make_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} branches deactivated.")

    # Mass Assign Manager with Confirmation
    @admin.action(description="Assign manager to selected branches (with confirmation)")
    def assign_manager_with_confirm(self, request, queryset):
        if 'apply' in request.POST:
            form = AssignManagerForm(request.POST)
            if form.is_valid():
                manager = form.cleaned_data['manager']
                if 'confirm' in request.POST:
                    count = queryset.update(manager=manager)
                    messages.success(request, _(
                        f"Assigned '{manager.get_full_name() or manager.username}' "
                        f"as manager to {count} branches."
                    ))
                    return HttpResponseRedirect(request.get_full_path())
                else:
                    return render(
                        request,
                        'admin/tenants/branch/assign_manager_confirm.html',
                        {
                            'form': form,
                            'manager': manager,
                            'branches': queryset,
                            'title': _("Confirm Manager Assignment"),
                        }
                    )
        else:
            form = AssignManagerForm()

        return render(
            request,
            'admin/tenants/branch/assign_manager_form.html',
            {
                'form': form,
                'branches': queryset,
                'title': _("Assign Manager to Selected Branches"),
            }
        )

    # Export to CSV
    @admin.action(description="Export selected branches to CSV")
    def export_as_csv(self, request, queryset):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="branches_export.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Company', 'Branch Name', 'City', 'Region', 'Phone', 'Email',
            'Manager', 'Active', 'Created At'
        ])

        for branch in queryset:
            manager_name = branch.manager.get_full_name() if branch.manager else '—'
            writer.writerow([
                branch.company.name,
                branch.name,
                branch.city or '—',
                branch.region or '—',
                branch.phone or '—',
                branch.email or '—',
                manager_name,
                'Yes' if branch.is_active else 'No',
                branch.created_at.strftime('%Y-%m-%d %H:%M')
            ])

        return response

    # Export to PDF (improved layout)
    @admin.action(description="Export selected branches to PDF")
    def export_as_pdf(self, request, queryset):
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(letter))
        elements = []

        styles = getSampleStyleSheet()
        title = Paragraph("Branches Report - High Prosper", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 24))

        # Summary
        summary_data = [
            ["Total Selected Branches", queryset.count()],
            ["Active Branches", queryset.filter(is_active=True).count()],
            ["Inactive Branches", queryset.filter(is_active=False).count()],
        ]
        summary_table = Table(summary_data, colWidths=[4*inch, 4*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.lightblue),
            ('TEXTCOLOR', (0,0), (-1,0), colors.black),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ]))
        elements.append(summary_table)
        elements.append(Spacer(1, 24))

        # Branches table
        data = [['Company', 'Branch', 'City', 'Region', 'Phone', 'Manager', 'Active', 'Created']]
        for branch in queryset:
            manager_name = branch.manager.get_full_name() if branch.manager else '—'
            data.append([
                branch.company.name,
                branch.name,
                branch.city or '—',
                branch.region or '—',
                branch.phone or '—',
                manager_name,
                'Yes' if branch.is_active else 'No',
                branch.created_at.strftime('%Y-%m-%d')
            ])

        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.darkblue),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(table)

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(content_type='application/pdf')
        filename = f"branches_export_{timezone.now().strftime('%Y%m%d_%H%M')}.pdf"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response.write(buffer.getvalue())
        return response

    # Restrict queryset
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        if hasattr(request.user, 'company') and request.user.company:
            return qs.filter(company=request.user.company)
        return qs.none()

    class Media:
        css = {'all': ('admin/css/tenants-admin.css',)}
