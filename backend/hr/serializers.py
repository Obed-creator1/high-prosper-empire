from rest_framework import serializers
from users.models import CustomUser
from .models import (
    Staff, Payroll, Leave, Attendance, Mission, ExtraWork,
    Vacation, Complaint, Loan, Report, Task, PayrollApproval
)
from django.contrib.auth import get_user_model


User = get_user_model()

class StaffSerializer(serializers.ModelSerializer):
    user_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='user',
        write_only=True,
        required=True
    )

    # Read-only user info for display
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True)

    # File fields with proper handling
    contract_file = serializers.FileField(required=False, allow_empty_file=True)
    profile_photo = serializers.ImageField(required=False, allow_empty_file=True)

    # Salary as decimal
    salary = serializers.DecimalField(max_digits=10, decimal_places=2, required=True)

    class Meta:
        model = Staff
        fields = [
            'id', 'user_id', 'username', 'email', 'full_name',
            'department', 'contract', 'contract_file', 'profile_photo',
            'salary', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'username', 'email', 'full_name']

    def validate_salary(self, value):
        if value <= 0:
            raise serializers.ValidationError("Salary must be positive.")
        return value

    def validate_status(self, value):
        if value not in dict(Staff.STATUS_CHOICES):
            raise serializers.ValidationError("Invalid status choice.")
        return value

    def create(self, validated_data):
        user = validated_data.pop('user')
        staff = Staff.objects.create(user=user, **validated_data)
        return staff

    def update(self, instance, validated_data):
        user = validated_data.pop('user', instance.user)
        instance.user = user
        instance = super().update(instance, validated_data)
        return instance


# NEW: Auto-create user + staff endpoint
class StaffCreateWithUserSerializer(StaffSerializer):
    # For creating new user
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, min_length=8, required=True)
    username = serializers.CharField(required=False)  # Auto-generate from email if empty

    class Meta(StaffSerializer.Meta):
        fields = StaffSerializer.Meta.fields + ['email', 'first_name', 'last_name', 'password', 'username']

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        # Create user first
        user_data = {
            'email': validated_data.pop('email'),
            'first_name': validated_data.pop('first_name'),
            'last_name': validated_data.pop('last_name'),
            'username': validated_data.pop('username', validated_data['email'].split('@')[0]),
        }
        password = validated_data.pop('password')

        user = User.objects.create_user(**user_data)
        user.set_password(password)
        user.save()

        # Create staff
        validated_data['user'] = user
        return super().create(validated_data)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'phone_number']

class PayrollApprovalSerializer(serializers.ModelSerializer):
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True, default='')
    approved_by_username = serializers.CharField(source='approved_by.username', read_only=True, default='')

    class Meta:
        model = PayrollApproval
        fields = '__all__'

class PayrollSerializer(serializers.ModelSerializer):
    staff = serializers.PrimaryKeyRelatedField(
        queryset=Staff.objects.select_related('user').all(),
        required=True
    )

    # Read-only fields for frontend display
    employee_name = serializers.CharField(source='staff.user.get_full_name', read_only=True)
    username = serializers.CharField(source='staff.user.username', read_only=True)
    department = serializers.CharField(source='staff.department', read_only=True)
    base_salary = serializers.DecimalField(source='staff.salary', max_digits=12, decimal_places=2, read_only=True)

    # Input fields
    month = serializers.IntegerField(min_value=1, max_value=12, required=True)
    year = serializers.IntegerField(min_value=2000, max_value=2100, required=True)
    bonus = serializers.DecimalField(max_digits=10, decimal_places=2, default=0, required=False)
    approval = PayrollApprovalSerializer(read_only=True)

    class Meta:
        model = Payroll
        fields = '__all__'
        read_only_fields = ['total', 'created_at']

    def validate(self, attrs):
        staff = attrs['staff']
        month = attrs['month']
        year = attrs['year']

        # Prevent duplicate payroll for same staff + month + year
        if Payroll.objects.filter(staff=staff, month=month, year=year).exists():
            if not self.instance or self.instance.month != month or self.instance.year != year:
                raise serializers.ValidationError({
                    "non_field_errors": [f"Payroll already exists for {staff.user.username} in {month}/{year}"]
                })
        return attrs

    def create(self, validated_data):
        # total is auto-calculated in model.save()
        return Payroll.objects.create(**validated_data)

    def update(self, instance, validated_data):
        # Allow partial updates
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()  # Triggers model.save() → recalculates total
        return instance

# Repeat similar pattern for others (optimized for performance)
class LeaveSerializer(serializers.ModelSerializer):
    staff = StaffSerializer(read_only=True)
    class Meta:
        model = Leave
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    staff = StaffSerializer(read_only=True)
    class Meta:
        model = Attendance
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    assigned_to = UserSerializer(read_only=True)
    class Meta:
        model = Task
        fields = '__all__'

# Add all other serializers similarly...
# (VacationSerializer, ComplaintSerializer, LoanSerializer, etc.)

# -------------------------------
# Staff Profile Serializer
# -------------------------------
class StaffProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone_number = serializers.CharField(source="user.phone_number", read_only=True)

    class Meta:
        model = Staff
        fields = [
            "id", "username", "email", "phone_number", "department",
            "salary", "profile_photo", "status", "contract_file", "created_at"
        ]


# -------------------------------
# Complaint Serializer
# -------------------------------
class ComplaintSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.username", read_only=True)

    class Meta:
        model = Complaint
        fields = ["id", "staff", "staff_name", "subject", "description", "status", "created_at"]


# -------------------------------
# Loan Serializer
# -------------------------------
class LoanSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.username", read_only=True)

    class Meta:
        model = Loan
        fields = ["id", "staff", "staff_name", "amount", "purpose", "status", "created_at"]


# -------------------------------
# Mission Serializer
# -------------------------------
class MissionSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.username", read_only=True)

    class Meta:
        model = Mission
        fields = ["id", "staff", "staff_name", "title", "description", "start_date", "end_date", "status"]


# -------------------------------
# Extra Work Serializer
# -------------------------------
class ExtraWorkSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.username", read_only=True)

    class Meta:
        model = ExtraWork
        fields = ["id", "staff", "staff_name", "date", "hours", "description", "approved"]


# -------------------------------
# Vacation Serializer
# -------------------------------
class VacationSerializer(serializers.ModelSerializer):
    staff_name = serializers.CharField(source="staff.user.username", read_only=True)

    class Meta:
        model = Vacation
        fields = ["id", "staff", "staff_name", "start_date", "end_date", "reason", "status"]


class ReportSerializer(serializers.ModelSerializer):
    staff = StaffSerializer(read_only=True)
    staff_id = serializers.PrimaryKeyRelatedField(
        queryset=Staff.objects.all(), source='staff', write_only=True, required=False
    )

    class Meta:
        model = Report
        fields = ['id', 'staff', 'staff_id', 'subject', 'message', 'created_at']
        read_only_fields = ['created_at']