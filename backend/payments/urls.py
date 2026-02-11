# payments/urls.py — HIGH PROSPER PAYMENTS URLS 2027
from django.urls import path
from . import views

app_name = "payments"

urlpatterns = [
    # ========================
    # CUSTOMER ENDPOINTS
    # ========================
    path("my-invoices/", views.my_invoices, name="my-invoices"),
    path("my-payments/", views.my_payments, name="my-payments"),
    path("pay/invoice/<uuid:uid>/", views.customer_pay_invoice, name="pay-invoice"),

    # ========================
    # PAYMENT INITIATION & CONFIRMATION
    # ========================
    path("initiate/", views.initiate_payment, name="initiate-payment"),
    path("confirm/", views.confirm_payment, name="confirm-payment"),

    # Instant payment methods
    path("pay/hpc/", views.pay_with_hpc, name="pay-hpc"),
    path("pay/qr/", views.pay_with_qr, name="pay-qr"),

    # ========================
    # ANALYTICS & REPORTS
    # ========================
    path("summary/", views.payment_summary, name="summary"),
    path("analytics/", views.payment_analytics, name="analytics"),

    # ========================
    # ADMIN / MANAGEMENT
    # ========================
    path("admin/all/", views.admin_all_payments, name="admin-all-payments"),

    # ========================
    # WEBHOOKS (Public - No Auth)
    # ========================
    path("webhook/momo/", views.momo_webhook, name="webhook-momo"),
    path("webhook/ussd/", views.ussd_payment_webhook, name="webhook-ussd"),

    # ========================
    # DEVELOPMENT & TESTING
    # ========================
    path("webhook/test/", views.webhook_test, name="webhook-test"),
]