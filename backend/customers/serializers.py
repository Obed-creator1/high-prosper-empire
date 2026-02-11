# customers/serializers.py — HIGH PROSPER PROFESSIONAL SERIALIZERS 2026
from rest_framework import serializers
from notifications.models import Notification
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from .models import Sector, Cell, Village, Customer, ServiceOrder, Complaint, LedgerEntry, ServiceRequest
from payments.models import Invoice, Payment
from users.models import ChatMessage, CustomUser

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for django-notifications Notification model
    Handles all fields from HR, Customers, Users
    """
    # Core fields from django-notifications
    actor = serializers.SerializerMethodField()
    target = serializers.SerializerMethodField()
    unread = serializers.BooleanField(source='unread', read_only=True)
    timestamp = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M:%S')

    # Custom fields from your previous models
    title = serializers.CharField(read_only=True, allow_null=True)
    message = serializers.CharField(source='description', read_only=True, allow_null=True)
    notification_type = serializers.CharField(read_only=True, allow_null=True)
    action_url = serializers.CharField(read_only=True, allow_null=True)
    image = serializers.CharField(read_only=True, allow_null=True)

    # HR-specific fields
    task_id = serializers.CharField(read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True, allow_null=True)

    # Customers-specific fields
    related_customer_name = serializers.CharField(source='target.name', read_only=True, allow_null=True)
    related_customer_id = serializers.IntegerField(source='target.id', read_only=True, allow_null=True)

    # Users-specific fields
    created_at_time = serializers.DateTimeField(read_only=True, format='%Y-%m-%d %H:%M:%S.%f')

    class Meta:
        model = Notification
        fields = [
            'id',
            'recipient',  # user ID
            'actor',
            'verb',
            'description',  # message
            'title',
            'message',
            'notification_type',
            'action_url',
            'image',
            'unread',
            'timestamp',
            'created_at_time',
            'task_id',
            'status',
            'related_customer_id',
            'related_customer_name',
            'target',
            # Add more if needed
        ]
        read_only_fields = fields  # All read-only for API safety

    def get_actor(self, obj):
        """Get actor details"""
        if obj.actor:
            return {
                'id': obj.actor.id,
                'username': obj.actor.username,
                'name': obj.actor.get_full_name() or obj.actor.username,
            }
        return None

    def get_target(self, obj):
        """Get target object details (generic)"""
        if obj.target:
            return {
                'id': obj.target.id,
                'type': obj.target.__class__.__name__,
                'name': str(obj.target),
            }
        return None

    def to_representation(self, instance):
        ret = super().to_representation(instance)

        # Human-readable time ago
        time_diff = relativedelta(timezone.now(), instance.timestamp)
        if time_diff.years > 0:
            ret['time_ago'] = f"{time_diff.years} year{'s' if time_diff.years > 1 else ''} ago"
        elif time_diff.months > 0:
            ret['time_ago'] = f"{time_diff.months} month{'s' if time_diff.months > 1 else ''} ago"
        elif time_diff.days > 0:
            ret['time_ago'] = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
        elif time_diff.hours > 0:
            ret['time_ago'] = f"{time_diff.hours} hour{'s' if time_diff.hours > 1 else ''} ago"
        elif time_diff.minutes > 0:
            ret['time_ago'] = f"{time_diff.minutes} minute{'s' if time_diff.minutes > 1 else ''} ago"
        else:
            ret['time_ago'] = "Just now"

        # Icon based on verb or type
        icons = {
            'create': 'Sparkles',
            'update': 'Edit2',
            'delete': 'Trash2',
            'payment_success': 'DollarSign',
            'payment_pending': 'Clock',
            'payment_failed': 'AlertTriangle',
            'info': 'Info',
            'success': 'CheckCircle',
            'warning': 'AlertTriangle',
            'error': 'XCircle',
            'chat': 'MessageSquare',
            'group': 'Users',
            'admin': 'Crown',
            'task': 'ListTodo',
            'leave': 'CalendarX',
            'payroll': 'DollarSign',
        }
        ret['icon'] = icons.get(instance.verb, icons.get(instance.notification_type, 'Bell'))

        return ret


# ========================
# GEOGRAPHY SERIALIZERS
# ========================

class SectorSerializer(serializers.ModelSerializer):
    """
    Sector Serializer — Vision 2026
    - Includes real-time analytics
    - Managers & Supervisors with full name + phone
    """
    cell_count = serializers.IntegerField(read_only=True)
    village_count = serializers.IntegerField(read_only=True)
    customer_count = serializers.IntegerField(read_only=True)
    monthly_revenue = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    total_balance = serializers.DecimalField(
        max_digits=15, decimal_places=2, read_only=True
    )
    avg_risk = serializers.FloatField(read_only=True)

    # Leadership
    managers = serializers.SerializerMethodField()
    supervisors = serializers.SerializerMethodField()

    class Meta:
        model = Sector
        fields = [
            'id', 'name', 'code', 'created_at', 'updated_at',
            'cell_count', 'village_count', 'customer_count',
            'monthly_revenue', 'total_balance', 'avg_risk',
            'managers', 'supervisors'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def get_managers(self, obj):
        """Return list of managers with name + phone"""
        return [
            {
                "id": user.id,
                "name": user.get_full_name() or user.username,
                "phone": user.phone or "",
                "email": user.email
            }
            for user in obj.managers.all()
        ]

    def get_supervisors(self, obj):
        """Return list of supervisors with name + phone"""
        return [
            {
                "id": user.id,
                "name": user.get_full_name() or user.username,
                "phone": user.phone or "",
                "email": user.email
            }
            for user in obj.supervisors.all()
        ]

    def validate_name(self, value):
        """Ensure unique sector name (case-insensitive)"""
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Sector name is required.")
        queryset = Sector.objects.filter(name__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A sector with this name already exists.")
        return value.title()

    def validate_code(self, value):
        """Ensure unique uppercase code"""
        if value:
            value = value.strip().upper()
            queryset = Sector.objects.filter(code=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("This sector code is already in use.")
        return value or None


class CellSerializer(serializers.ModelSerializer):
    """
    Cell Serializer — Vision 2026
    - Includes aggregated analytics (customers, revenue, balance, risk)
    - sector_name for display
    """
    sector_name = serializers.CharField(source='sector.name', read_only=True)
    village_count = serializers.IntegerField(read_only=True)
    customer_count = serializers.IntegerField(read_only=True)
    monthly_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    avg_risk = serializers.FloatField(read_only=True)

    class Meta:
        model = Cell
        fields = [
            'id', 'name', 'code', 'sector', 'sector_name',
            'created_at', 'updated_at',
            'village_count', 'customer_count',
            'monthly_revenue', 'total_balance', 'avg_risk'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_name(self, value):
        """Ensure unique cell name within sector"""
        sector_id = self.initial_data.get('sector') or (self.instance.sector.id if self.instance else None)
        if not sector_id:
            raise serializers.ValidationError("Sector is required")

        queryset = Cell.objects.filter(name__iexact=value, sector_id=sector_id)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A cell with this name already exists in the selected sector.")
        return value.title()

    def validate_code(self, value):
        if value:
            value = value.strip().upper()
            queryset = Cell.objects.filter(code=value)
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError("This cell code is already in use.")
        return value

class VillageSerializer(serializers.ModelSerializer):
    """
    Advanced Village Serializer — Vision 2026
    - Dual targets: Revenue + New Customers
    - Real-time auto-calculated metrics
    - Safe nested fields
    - Full write support for cell, collectors, targets
    """
    cell_name = serializers.SerializerMethodField()
    sector_name = serializers.SerializerMethodField()
    collectors = serializers.SerializerMethodField()
    collectors_info = serializers.SerializerMethodField()  # New field

    # Customer & Population
    customer_count = serializers.IntegerField(read_only=True)
    population_estimate = serializers.IntegerField(read_only=True)

    # Financial Targets & Performance
    monthly_revenue_target = serializers.DecimalField(max_digits=15, decimal_places=2)
    collected_this_month = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    revenue_target_percentage = serializers.FloatField(read_only=True)
    remaining_revenue_target = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    # Growth Targets & Performance
    monthly_new_customers_target = serializers.IntegerField()
    new_customers_this_month = serializers.IntegerField(read_only=True)
    new_customers_target_percentage = serializers.FloatField(read_only=True)
    remaining_new_customers_target = serializers.IntegerField(read_only=True)

    # Overall Performance
    overall_target_percentage = serializers.FloatField(read_only=True)
    performance_rank = serializers.IntegerField(read_only=True, allow_null=True)

    # Balance & Risk
    total_balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    avg_risk = serializers.FloatField(read_only=True)

    # Target Period
    target_month = serializers.IntegerField(read_only=True)
    target_year = serializers.IntegerField(read_only=True)

    class Meta:
        model = Village
        fields = [
            'id', 'name', 'cell', 'cell_name', 'sector_name',
            'collectors', 'collectors_info', 'gps_coordinates', 'population_estimate',
            'is_active', 'created_at', 'updated_at',
            'target_month', 'target_year',
            'monthly_revenue_target', 'monthly_new_customers_target',
            'collected_this_month', 'new_customers_this_month',
            'revenue_target_percentage', 'remaining_revenue_target',
            'new_customers_target_percentage', 'remaining_new_customers_target',
            'overall_target_percentage', 'performance_rank',
            'customer_count', 'total_balance', 'avg_risk'
        ]
        read_only_fields = [
            'created_at', 'updated_at',
            'collected_this_month', 'new_customers_this_month',
            'revenue_target_percentage', 'new_customers_target_percentage',
            'overall_target_percentage', 'performance_rank',
            'customer_count', 'total_balance', 'avg_risk',
            'cell_name', 'sector_name', 'collectors',
            'target_month', 'target_year'
        ]

    def get_cell_name(self, obj):
        return obj.cell.name if obj.cell else "No Cell Assigned"

    def get_sector_name(self, obj):
        return obj.cell.sector.name if obj.cell and obj.cell.sector else "No Sector"

    def get_collectors(self, obj):
        """Return formatted: 'John Doe (+250789123456), Jane Smith (0788123456)'"""
        if not obj.collectors.exists():
            return "Unassigned"

        collector_list = []
        for c in obj.collectors.all():
            name = (c.get_full_name() or c.username or "Unknown Collector").strip()
            phone = c.phone.strip() if c.phone else ""
            if phone:
                collector_list.append(f"{name} ({phone})")
            else:
                collector_list.append(name)

        return ", ".join(collector_list)

    def get_collectors_info(self, obj):
        """Return list of dicts with name and phone"""
        if not obj.collectors.exists():
            return []

        info_list = []
        for c in obj.collectors.all():
            info_list.append({
                "name": c.get_full_name() or c.username or "Unknown",
                "phone": c.phone.strip() if c.phone else ""
            })

        return info_list

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Village name is required.")
        queryset = Village.objects.filter(name__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A village with this name already exists.")
        return value.title()

    def validate_gps_coordinates(self, value):
        if not value:
            return None
        value = value.strip()
        try:
            lat_str, lng_str = value.split(',')
            lat = float(lat_str.strip())
            lng = float(lng_str.strip())
            if not (-90 <= lat <= 90 and -180 <= lng <= 180):
                raise serializers.ValidationError("GPS coordinates out of valid range.")
        except (ValueError, IndexError):
            raise serializers.ValidationError(
                "Invalid format. Use 'latitude,longitude' e.g. -1.9441,30.0619"
            )
        return value

    def create(self, validated_data):
        collectors = validated_data.pop('collectors', [])
        village = Village.objects.create(**validated_data)
        if collectors:
            village.collectors.set(collectors)
        village.update_collected_and_growth()
        return village

    def update(self, instance, validated_data):
        collectors = validated_data.pop('collectors', None)

        instance.name = validated_data.get('name', instance.name)
        instance.cell = validated_data.get('cell', instance.cell)
        instance.gps_coordinates = validated_data.get('gps_coordinates', instance.gps_coordinates)
        instance.monthly_revenue_target = validated_data.get('monthly_revenue_target', instance.monthly_revenue_target)
        instance.monthly_new_customers_target = validated_data.get('monthly_new_customers_target', instance.monthly_new_customers_target)

        instance.save()

        if collectors is not None:
            instance.collectors.set(collectors)

        instance.update_collected_and_growth()
        return instance

# ========================
# CUSTOMER SERIALIZERS — CORE
# ========================
class CustomerListSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True, allow_null=True)
    village_id = serializers.IntegerField(source='village.id', read_only=True, allow_null=True)
    collector_name = serializers.CharField(source='collector.get_full_name', read_only=True, allow_null=True)
    collector_phone = serializers.CharField(source='collector.phone', read_only=True, allow_null=True)

    balance = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    days_delinquent = serializers.SerializerMethodField()
    balance_status = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'uid', 'name', 'phone', 'email', 'payment_account',
            'village_name', 'village_id', 'collector_name', 'collector_phone',
            'monthly_fee', 'connection_date', 'status',
            'balance', 'total_paid', 'days_delinquent',
            'balance_status', 'risk_score', 'risk_level', 'contract_no'
        ]

    # All methods — CORRECT
    def get_balance(self, obj):
        return float(obj.balance or 0)

    def get_total_paid(self, obj):
        return float(obj.total_paid or 0)

    def get_days_delinquent(self, obj):
        return obj.days_delinquent

    def get_balance_status(self, obj):
        if obj.balance > 0:
            return "Owes"
        elif obj.balance < 0:
            return "Overpaid"
        return "Up to date"

    def get_risk_level(self, obj):
        score = obj.risk_score or 0
        if score >= 80:
            return "Critical"
        elif score >= 60:
            return "High"
        elif score >= 30:
            return "Medium"
        return "Low"


class CustomerSerializer(serializers.ModelSerializer):
    village_name = serializers.CharField(source='village.name', read_only=True, allow_null=True)
    village_id = serializers.IntegerField(source='village.id', read_only=True, allow_null=True)
    collector_name = serializers.CharField(source='collector.get_full_name', read_only=True, allow_null=True)
    collector_phone = serializers.CharField(source='collector.phone', read_only=True, allow_null=True)

    balance = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    days_delinquent = serializers.SerializerMethodField()
    overpaid_months = serializers.SerializerMethodField()
    unpaid_months = serializers.SerializerMethodField()
    balance_status = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'uid', 'user', 'type', 'name', 'email', 'phone', 'nid',
            'gender', 'date_of_birth', 'village_id', 'village_name',
            'collector_name', 'collector_phone', 'contract_no', 'contract_file',
            'payment_account', 'monthly_fee', 'connection_date', 'status',
            'risk_score', 'risk_level', 'tags', 'notes',
            'balance', 'total_paid', 'days_delinquent',
            'overpaid_months', 'unpaid_months', 'balance_status',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'uid', 'user', 'balance', 'total_paid', 'days_delinquent',
            'risk_score', 'overpaid_months', 'unpaid_months'
        ]

    def get_balance(self, obj):
        return float(obj.balance or 0)

    def get_total_paid(self, obj):
        return float(obj.total_paid or 0)

    def get_days_delinquent(self, obj):
        return obj.days_delinquent

    def get_overpaid_months(self, obj):
        return obj.overpaid_months

    def get_unpaid_months(self, obj):
        return obj.unpaid_months

    def get_balance_status(self, obj):
        if obj.balance > 0:
            return "Owes"
        elif obj.balance < 0:
            return "Overpaid"
        return "Up to date"

    def get_risk_level(self, obj):
        score = obj.risk_score or 0
        if score >= 80:
            return "Critical"
        elif score >= 60:
            return "High"
        elif score >= 30:
            return "Medium"
        return "Low"



# ========================
# RELATED MODELS
# ========================
class LedgerEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = LedgerEntry
        fields = ['id', 'description', 'debit', 'credit', 'balance', 'created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    remaining = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'uid', 'amount', 'due_date', 'paid_amount',
            'remaining', 'status', 'status_display',
            'period_month', 'period_year'
        ]


class PaymentSerializer(serializers.ModelSerializer):
    method_name = serializers.CharField(source='method.get_name_display', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'uid', 'amount', 'method', 'method_name',
            'status', 'reference', 'completed_at', 'customer_name'
        ]


class ServiceOrderSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    assigned_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)

    class Meta:
        model = ServiceOrder
        fields = '__all__'


class ComplaintSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    assigned_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True, allow_null=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Complaint
        fields = '__all__'


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    receiver_name = serializers.CharField(source='receiver.get_full_name', read_only=True)

    class Meta:
        model = ChatMessage
        fields = [
            'id', 'sender', 'sender_name', 'receiver', 'receiver_name',
            'room', 'message', 'attachment', 'attachment_type',
            'timestamp', 'delivered_at', 'seen_at'
        ]

class ServiceRequestSerializer(serializers.ModelSerializer):
    """
    Advanced ServiceRequest Serializer — Vision 2026
    - Public create (minimal fields)
    - Staff full management
    - Read-only calculated fields
    """
    village_name = serializers.CharField(source='village.name', read_only=True)
    sector_name = serializers.CharField(source='village.cell.sector.name', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    total_payments = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    class Meta:
        model = ServiceRequest
        fields = [
            'id', 'title', 'description', 'status', 'payment_status',
            'requester_name', 'requester_phone', 'requester_email', 'requester_nid',
            'customer', 'customer_name', 'customer_phone',
            'village', 'village_name', 'sector_name', 'address_details',
            'requested_date', 'quoted_amount', 'final_amount',
            'assigned_to', 'assigned_to_name', 'completed_at',
            'total_payments', 'balance_due', 'notes', 'satisfaction_score',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'payment_status', 'total_payments', 'balance_due',
            'created_at', 'updated_at', 'completed_at'
        ]

    def get_total_payments(self, obj):
        return float(obj.total_payments)

    def get_balance_due(self, obj):
        return float(obj.balance_due)

    def validate(self, data):
        # Public users can't assign or quote
        request = self.context['request']
        if not request.user.is_authenticated:
            forbidden = ['status', 'quoted_amount', 'final_amount', 'assigned_to', 'payment_status']
            for field in forbidden:
                if field in data:
                    raise serializers.ValidationError({field: "Not allowed for public users."})
        return data

    def create(self, validated_data):
        # Auto-set payment_status
        instance = ServiceRequest.objects.create(payment_status='unpaid', **validated_data)
        return instance