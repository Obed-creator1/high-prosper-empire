# backend/accounting/serializers.py
from rest_framework import serializers
from .models import *

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = '__all__'

class JournalEntrySerializer(serializers.ModelSerializer):
    created_by = serializers.StringRelatedField()
    class Meta:
        model = JournalEntry
        fields = '__all__'

class RevenueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Revenue
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class ReceivableSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    class Meta:
        model = Receivable
        fields = '__all__'

class PayableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payable
        fields = '__all__'

class GeneralLedgerSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneralLedger
        fields = '__all__'

class AccountingSummarySerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_expenses = serializers.DecimalField(max_digits=15, decimal_places=2)
    profit_loss = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_receivables = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_payables = serializers.DecimalField(max_digits=15, decimal_places=2)
    overdue_receivables = serializers.IntegerField()
    overdue_payables = serializers.IntegerField()
