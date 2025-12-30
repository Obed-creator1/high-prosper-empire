import datetime

from django import forms
from .models import Staff, Payroll, Leave, Attendance, Task, ExtraWork, Complaint, Loan, Report

class StaffForm(forms.ModelForm):
    class Meta:
        model = Staff
        fields = ['user', 'department', 'contract', 'contract_file', 'profile_photo', 'salary', 'status']
        widgets = {
            'contract': forms.Textarea(attrs={'rows': 4}),
            'user': forms.Select(attrs={'class': 'form-select'}),
            'department': forms.TextInput(attrs={'class': 'form-control'}),
            'salary': forms.NumberInput(attrs={'class': 'form-control'}),
            'contract_file': forms.FileInput(attrs={'class': 'form-control'}),
            'profile_photo': forms.FileInput(attrs={'class': 'form-control'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
        }

class PayrollForm(forms.ModelForm):
    class Meta:
        model = Payroll
        fields = ['staff', 'month', 'year', 'bonus']
        widgets = {
            'staff': forms.Select(attrs={'class': 'form-select'}),
            'month': forms.NumberInput(attrs={'class': 'form-control'}),
            'year': forms.NumberInput(attrs={'class': 'form-control'}),
            'bonus': forms.NumberInput(attrs={'class': 'form-control'}),
        }

class AttendanceForm(forms.ModelForm):
    class Meta:
        model = Attendance
        fields = ['staff', 'date', 'status']
        widgets = {
            'staff': forms.Select(attrs={'class': 'form-select'}),
            'date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'status': forms.Select(attrs={'class': 'form-select'}),
        }

class TaskForm(forms.ModelForm):
    class Meta:
        model = Task
        fields = ['title', 'description', 'due_date', 'status']
        widgets = {
            'due_date': forms.DateInput(attrs={'type': 'date'}),
            'description': forms.Textarea(attrs={'rows': 4}),
        }

class LeaveForm(forms.ModelForm):
    class Meta:
        model = Leave
        fields = ['start_date', 'end_date', 'reason']
        widgets = {
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'end_date': forms.DateInput(attrs={'type': 'date'}),
            'reason': forms.Textarea(attrs={'rows': 4}),
        }

class ExtraWorkForm(forms.ModelForm):
    class Meta:
        model = ExtraWork
        fields = ['date', 'hours', 'description']
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date', 'class': 'form-control'}),
            'hours': forms.NumberInput(attrs={'step': '0.01', 'class': 'form-control', 'placeholder': 'e.g., 2.50'}),
            'description': forms.Textarea(attrs={'rows': 4, 'class': 'form-control', 'placeholder': 'Describe the extra work performed'}),
        }

    def clean_hours(self):
        hours = self.cleaned_data['hours']
        if hours <= 0:
            raise forms.ValidationError("Hours must be greater than zero.")
        if hours > 24:
            raise forms.ValidationError("Hours cannot exceed 24 in a single day.")
        return hours

    def clean_date(self):
        date = self.cleaned_data['date']
        if date > datetime.date.today():
            raise forms.ValidationError("Date cannot be in the future.")
        return date

class ComplaintForm(forms.ModelForm):
    class Meta:
        model = Complaint
        fields = ['subject', 'description']
        widgets = {
            'description': forms.Textarea(attrs={'rows': 4}),
        }

class LoanForm(forms.ModelForm):
    class Meta:
        model = Loan
        fields = ['amount', 'purpose']
        widgets = {
            'purpose': forms.Textarea(attrs={'rows': 4}),
        }

class ReportForm(forms.ModelForm):
    class Meta:
        model = Report
        fields = ['subject', 'message']
        widgets = {
            'message': forms.Textarea(attrs={'rows': 4}),
        }

class DocumentUploadForm(forms.ModelForm):
    class Meta:
        model = Staff
        fields = ['profile_photo', 'contract_file']
        widgets = {
            'profile_photo': forms.FileInput(attrs={'accept': 'image/*'}),
            'contract_file': forms.FileInput(attrs={'accept': '.pdf,.doc,.docx'}),
        }

