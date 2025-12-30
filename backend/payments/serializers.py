# payments/serializers.py
from rest_framework import serializers
from .models import Invoice, Payment, PaymentMethod
from customers.models import Village

class VillagePaymentSerializer(serializers.ModelSerializer):
    total_collected = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)
    total_outstanding = serializers.DecimalField(max_digits=16, decimal_places=2, read_only=True)

    class Meta:
        model = Village
        fields = ["id", "name", "total_collected", "total_outstanding"]


class PaymentSummarySerializer(serializers.Serializer):
    today_collected = serializers.DecimalField(max_digits=16, decimal_places=2)
    month_collected = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_outstanding = serializers.DecimalField(max_digits=16, decimal_places=2)
    per_village = VillagePaymentSerializer(many=True)


class InvoiceSerializer(serializers.ModelSerializer):
    remaining = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'uid', 'customer', 'amount', 'due_date', 'paid_amount',
            'remaining', 'status', 'status_display', 'period_month', 'period_year',
            'pdf_file', 'sent_via', 'created_at'
        ]

    def get_remaining(self, obj):
        return obj.remaining


class PaymentDetailSerializer(serializers.ModelSerializer):
    method_name = serializers.CharField(source='method.get_name_display', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    invoice_uid = serializers.UUIDField(source='invoice.uid', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['status', 'reference', 'completed_at']


class PaymentAnalyticsSerializer(serializers.Serializer):
    total_revenue_today = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_revenue_month = serializers.DecimalField(max_digits=16, decimal_places=2)
    hpc_minted_today = serializers.DecimalField(max_digits=16, decimal_places=2)
    top_methods = serializers.ListField(child=serializers.DictField())
    collection_rate = serializers.FloatField()
    overdue_invoices = serializers.IntegerField()