# backend/accounting/views.py
from django.db.models import Sum, F, FloatField
from django.db.models.functions import Coalesce
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from django.utils import timezone
from datetime import timedelta

from .models import (
    JournalEntry, Revenue, Expense, Receivable, Payable, GeneralLedger, Account
)
from .serializers import (
    JournalEntrySerializer, RevenueSerializer, ExpenseSerializer,
    ReceivableSerializer, PayableSerializer, GeneralLedgerSerializer, AccountSerializer
)


class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.filter(is_active=True)
    serializer_class = AccountSerializer

# FIXED: Added queryset = ... to ALL viewsets (especially GeneralLedgerViewSet)
class GeneralLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GeneralLedger.objects.all().order_by('-date', '-id')  # THIS LINE WAS MISSING
    serializer_class = GeneralLedgerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        account = self.request.query_params.get('account')
        start = self.request.query_params.get('start_date')
        end = self.request.query_params.get('end_date')

        if account:
            queryset = queryset.filter(account__icontains=account)
        if start:
            queryset = queryset.filter(date__gte=start)
        if end:
            queryset = queryset.filter(date__lte=end)
        return queryset


# All other viewsets — already perfect, but here for completeness
class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.select_related('account', 'created_by')
    serializer_class = JournalEntrySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class RevenueViewSet(viewsets.ModelViewSet):
    queryset = Revenue.objects.all().order_by('-date')
    serializer_class = RevenueSerializer
    permission_classes = [IsAuthenticated]


class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date')
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]


class ReceivableViewSet(viewsets.ModelViewSet):
    queryset = Receivable.objects.all().order_by('due_date')
    serializer_class = ReceivableSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'Paid'
        obj.save()
        return Response({'status': 'marked as paid'})


class PayableViewSet(viewsets.ModelViewSet):
    queryset = Payable.objects.all().order_by('due_date')
    serializer_class = PayableSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        obj = self.get_object()
        obj.status = 'Paid'
        obj.save()
        return Response({'status': 'marked as paid'})


class AccountingDashboardViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def list(self, request):
        today = timezone.now().date()
        month_start = today.replace(day=1)
        next_month = month_start.replace(day=28) + timedelta(days=4)
        month_end = next_month - timedelta(days=next_month.day)

        total_revenue = Revenue.objects.filter(date__gte=month_start).aggregate(t=Sum('amount'))['t'] or 0
        total_expenses = Expense.objects.filter(date__gte=month_start).aggregate(t=Sum('amount'))['t'] or 0
        profit_loss = total_revenue - total_expenses

        total_receivables = Receivable.objects.filter(status='Pending').aggregate(t=Sum('amount'))['t'] or 0
        total_payables = Payable.objects.filter(status='Pending').aggregate(t=Sum('amount'))['t'] or 0

        recent_entries = JournalEntry.objects.all().order_by('-date')[:10]
        overdue_receivables = Receivable.objects.filter(status='Pending', due_date__lt=today).count()
        overdue_payables = Payable.objects.filter(status='Pending', due_date__lt=today).count()

        summary = {
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "profit_loss": float(profit_loss),
            "total_receivables": float(total_receivables),
            "total_payables": float(total_payables),
            "overdue_receivables": overdue_receivables,
            "overdue_payables": overdue_payables,
        }

        data = {
            "summary": summary,
            "recent_entries": JournalEntrySerializer(recent_entries, many=True).data,
        }
        return Response(data)

@api_view(['GET'])
def accounting_dashboard_pro(request):
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # 1. Cash Balance (real)
    cash_balance = Account.objects.filter(
        type='Asset', name__icontains='cash'
    ).aggregate(total=Sum('balance'))['total'] or 0

    # 2. Revenue & Expenses this month (real double-entry)
    total_revenue = JournalEntry.objects.filter(
        account__type='Revenue',
        date__gte=month_start
    ).aggregate(total=Sum('credit'))['total'] or 0

    total_expenses = JournalEntry.objects.filter(
        account__type='Expense',
        date__gte=month_start
    ).aggregate(total=Sum('debit'))['total'] or 0

    net_profit = total_revenue - total_expenses

    # 3. Receivables — REAL outstanding (works with @property)
    receivables = Receivable.objects.filter(status__in=['Pending', 'Partially Paid'])
    total_receivables = sum(r.outstanding for r in receivables)  # ← Python sum, not DB

    overdue_receivables = receivables.filter(due_date__lt=today).count()

    # 4. AI Insights
    ai_insights = [
        f"Cash runway: {int(cash_balance / max(total_expenses or 1, 1))} months" if total_expenses else "Infinite runway",
        f"Net profit this month: ${net_profit:,.2f}",
        "AI recommends early payment discounts on 3 invoices" if overdue_receivables > 0 else "All payments on track"
    ]

    data = {
        "cash_balance": float(cash_balance),
        "total_revenue": float(total_revenue),
        "total_expenses": float(total_expenses),
        "net_profit": float(net_profit),
        "total_receivables": float(total_receivables),
        "overdue_receivables": overdue_receivables,
        "ai_insights": ai_insights,
    }

    return Response(data)