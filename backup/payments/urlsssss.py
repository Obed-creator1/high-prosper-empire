from django.urls import path
from . import views

app_name = "payments"

urlpatterns = [
    path("invoices/", views.list_invoices),
    path("my-payments/", views.my_payments),
    path("initiate/", views.initiate_payment),
    path("confirm/", views.confirm_payment),
    path("summary/", views.payment_summary),
    path("analytics/", views.payment_analytics),  # NEW
    path("pay/hpc/", views.pay_with_hpc),
    path("pay/qr/", views.pay_with_qr),
    path("webhook/momo/", views.momo_webhook),  # Async callback
    path("webhook/ussd/", views.ussd_payment_webhook),  # From *500#
]