from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, customer_filter_options

router = DefaultRouter()
router.register(r'', CustomerViewSet, basename='customer')

urlpatterns = [
    path("filter-options/", customer_filter_options, name="customer_filter_options"),  # ✅ dash instead of underscore
    path("", include(router.urls)),
]
