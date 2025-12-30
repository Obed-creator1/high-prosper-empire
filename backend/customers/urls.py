# customers/urls.py — HIGH PROSPER CUSTOMERS API ROUTING 2026
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet,
    ComplaintViewSet,
    VillageViewSet,
    villages_list,
    customer_stats,
    my_invoices,
    my_payments,
    my_orders,
    my_complaints,
    chat_history,
    send_message,
    collector_summary,
    gps_customer_map, verify_email, resend_verification, send_phone_otp,
    verify_phone_otp, test_customers,
)

# ============================
# REST FRAMEWORK ROUTER
# ============================
router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customers')
router.register(r'complaints', ComplaintViewSet, basename='complaint')
router.register(r'villages', VillageViewSet, basename='village')

# ============================
# URL PATTERNS
# ============================
urlpatterns = [
    # Router handles standard CRUD
    path('', include(router.urls)),

    # ============================
    # UTILITY & LIST ENDPOINTS
    # ============================
    path('villages-list/', villages_list, name='villages-list'),
    path('gps-map/', gps_customer_map, name='gps-map'),  # ← New GPS map
    path('register/', CustomerViewSet.as_view({'post': 'register'}), name='customer-register'),
    path('test-customers/', test_customers),

    # ============================
    # ANALYTICS & SEARCH
    # ============================
    path('stats/', customer_stats, name='customer-stats'),
    path("verify-email/<str:token>/", verify_email, name="verify-email"),
    path("resend-verification/", resend_verification, name="resend-verification"),
    path("send-phone-otp/", send_phone_otp, name="send-phone-otp"),
    path("verify-phone-otp/", verify_phone_otp, name="verify-phone-otp"),


    # ============================
    # CUSTOMER SELF-SERVICE
    # ============================
    path('my/invoices/', my_invoices, name='my-invoices'),
    path('my/payments/', my_payments, name='my-payments'),
    path('my/orders/', my_orders, name='my-orders'),
    path('my/complaints/', my_complaints, name='my-complaints'),

    # ============================
    # CHAT SYSTEM
    # ============================
    path('chat/history/', chat_history, name='chat-history'),
    path('chat/send/', send_message, name='chat-send'),

    # ============================
    # COLLECTOR DASHBOARD
    # ============================
    path('collector/summary/', collector_summary, name='collector-summary'),
]