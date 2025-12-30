from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomerViewSet,
    ComplaintViewSet,
    VillageViewSet,
    villages_list,
    customer_stats,
    customer_search,
    my_invoices,
    my_payments,
    my_orders,
    my_complaints,
    chat,
    chat_send,
    collector_summary,
)

# -----------------------------
# ROUTER CONFIGURATION
# -----------------------------
router = DefaultRouter()
router.register(r"customers", CustomerViewSet, basename="customer")
router.register(r"complaints", ComplaintViewSet, basename="complaint")
router.register(r"villages", VillageViewSet, basename="village")

# -----------------------------
# URL PATTERNS
# -----------------------------
urlpatterns = [
    path("", include(router.urls)),

    # Extra endpoints outside the router
    path("villages-list/", villages_list, name="villages-list"),
    path("customers/stats/", customer_stats, name="customer-stats"),
    path("customers/search/", customer_search, name="customer-search"),

    # Customer dashboard (self-service)
    path("customers/my-invoices/", my_invoices, name="my-invoices"),
    path("customers/my-payments/", my_payments, name="my-payments"),
    path("customers/my-orders/", my_orders, name="my-orders"),
    path("customers/my-complaints/", my_complaints, name="my-complaints"),

    # Chat
    path("customers/chat/", chat, name="chat"),
    path("customers/chat/send/", chat_send, name="chat-send"),

    # Collector summary analytics
    path("customers/collector-summary/", collector_summary, name="collector-summary"),

]
