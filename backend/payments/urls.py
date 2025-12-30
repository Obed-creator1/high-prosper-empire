# payments/urls.py
from django.urls import path
from . import views


app_name = "payments"

urlpatterns = [
    # Customer
    path("my-invoices/", views.my_invoices, name="my-invoices"),
    path("my-payments/", views.my_payments, name="my-payments"),
    path("pay_invoice/<uuid:uid>/", views.customer_pay_invoice, name="pay_invoice"),

    # Payment Actions
    path("initiate/", views.initiate_payment, name="initiate"),
    path("confirm/", views.confirm_payment, name="confirm"),
    path("pay/hpc/", views.pay_with_hpc, name="pay-hpc"),
    path("pay/qr/", views.pay_with_qr, name="pay-qr"),

    # Analytics
    path("summary/", views.payment_summary, name="summary"),
    path("analytics/", views.payment_analytics, name="analytics"),

    # Admin
    path("all/", views.admin_all_payments, name="all-payments"),

    # Webhooks
    path("webhook/momo/", views.momo_webhook, name="webhook-momo"),
    path("webhook/ussd/", views.ussd_payment_webhook, name="webhook-ussd"),
]