# backend/accounting/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    JournalEntryViewSet, RevenueViewSet, ExpenseViewSet,
    ReceivableViewSet, PayableViewSet, GeneralLedgerViewSet,
    AccountingDashboardViewSet, AccountViewSet, accounting_dashboard_pro
)

app_name = "accounting"

router = DefaultRouter()
router.register(r'accounts', AccountViewSet)
router.register(r'journal-entries', JournalEntryViewSet)
router.register(r'revenues', RevenueViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'receivables', ReceivableViewSet)
router.register(r'payables', PayableViewSet)
router.register(r'ledger', GeneralLedgerViewSet)  # NOW WORKS — HAS queryset
router.register(r'dashboard', AccountingDashboardViewSet, basename='accounting-dashboard')

urlpatterns = [
    path("", include(router.urls)),
    path('dashboard/pro/', accounting_dashboard_pro, name='dashboard-pro'),
]