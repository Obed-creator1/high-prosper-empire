from django.contrib import admin
from .models import Staff, Payroll, Task, Leave, Attendance, Mission, ExtraWork, Vacation, Complaint, Loan, Report

@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'salary', 'status', 'created_at']
    list_filter = ['department', 'status']
    search_fields = ['user__username', 'user__email', 'department']
    readonly_fields = ['created_at']

    # ✅ exclude journal_entry from creation form (it's optional / auto-linked during payroll)
    exclude = ['journal_entry']

    # Optional: group fields for better form layout
    fieldsets = (
        ('Staff Information', {
            'fields': ('user', 'department', 'salary', 'status')
        }),
        ('Contract Details', {
            'fields': ('contract', 'contract_file', 'profile_photo'),
        }),
        ('System Info', {
            'fields': ('created_at',),
        }),
    )


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['staff', 'month', 'year', 'bonus', 'total', 'created_at']
    search_fields = ['staff', 'month']

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'assigned_to', 'due_date', 'status']
    list_filter = ['status', 'priority']
    search_fields = ['title', 'assigned_to__username']

@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_display = ['get_staff_name', 'start_date', 'end_date', 'status']
    list_filter = ['status']
    search_fields = ['staff__user__username', 'reason']

    def get_staff_name(self, obj):
        return obj.staff.user.get_full_name() or obj.staff.user.username
    get_staff_name.short_description = 'Employee'

@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['staff', 'date', 'status', 'check_in', 'check_out']
    list_filter = ['status', 'date']
    search_fields = ['staff__user__username']

@admin.register(Mission)
class MissionAdmin(admin.ModelAdmin):
    list_display = ['title', 'staff', 'start_date', 'end_date', 'status']
    list_filter = ['status']
    search_fields = ['title', 'staff__user__username']

@admin.register(ExtraWork)
class ExtraWorkAdmin(admin.ModelAdmin):
    list_display = ['staff', 'date', 'hours', 'approved']
    list_filter = ['approved']
    search_fields = ['staff__user__username', 'description']

@admin.register(Vacation)
class VacationAdmin(admin.ModelAdmin):
    list_display = ['staff', 'start_date', 'end_date', 'status']
    list_filter = ['status']
    search_fields = ['staff__user__username', 'reason']

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ['subject', 'staff', 'created_at', 'status']
    list_filter = ['status']
    search_fields = ['subject', 'staff__user__username']

@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ['staff', 'amount', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['staff__user__username', 'purpose']

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['subject', 'staff', 'created_at']
    search_fields = ['subject', 'staff__user__username']