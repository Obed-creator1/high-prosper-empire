# customers/serializers.py — HIGH PROSPER PROFESSIONAL SERIALIZERS 2026
from rest_framework import serializers
from notifications.models import Notification
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from .models import Sector, Cell, Village, Customer, ServiceOrder, Complaint, LedgerEntry
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
    cell_count = serializers.IntegerField(read_only=True)
    village_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Sector
        fields = ['id', 'name', 'code', 'cell_count', 'village_count', 'created_at']


class CellSerializer(serializers.ModelSerializer):
    sector = SectorSerializer(read_only=True)
    village_count = serializers.IntegerField(read_only=True)
    customer_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Cell
        fields = ['id', 'name', 'code', 'sector', 'village_count', 'customer_count']


class VillageSerializer(serializers.ModelSerializer):
    cell_name = serializers.CharField(source='cell.name', read_only=True)
    sector_name = serializers.CharField(source='cell.sector.name', read_only=True)
    collector_name = serializers.CharField(source='collector.get_full_name', read_only=True, allow_null=True)
    collector_phone = serializers.CharField(source='collector.phone', read_only=True, allow_null=True)
    customer_count = serializers.IntegerField(read_only=True)
    total_outstanding = serializers.SerializerMethodField()
    overdue_customers = serializers.IntegerField(read_only=True)

    class Meta:
        model = Village
        fields = [
            'id', 'name', 'cell_name', 'sector_name',
            'collector_name', 'collector_phone',
            'gps_coordinates', 'population_estimate', 'is_active',
            'customer_count', 'total_outstanding', 'overdue_customers'
        ]

    def get_total_outstanding(self, obj):
        # Sum of positive balances only
        return sum(max(c.balance or 0, 0) for c in obj.residents.all())


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