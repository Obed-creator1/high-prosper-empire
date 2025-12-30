from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from .views import PaymentViewSet, InvoiceViewSet, momo_webhook

router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'invoices', InvoiceViewSet, basename='invoice')  # New invoices endpoint

urlpatterns = [
    path('momo/webhook/', momo_webhook, name='momo_webhook'),
    path('', include(router.urls)),
    path("collector-recent/", views.collector_recent_payments),
    path("collector-trends/", views.collector_trends),



]
