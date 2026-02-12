# notifications/urls.py — HIGH PROSPER PROFESSIONAL URLS 2026
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views
from .views import (
    SaveSubscriptionView,
    UserSubscriptionsView,
    DeleteSubscriptionView,
    SendTestPushView,
    BroadcastPushView, UnsubscribeView,
)


# Create router for ViewSet
router = DefaultRouter()
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    # === DRF API Endpoints ===
    path('api/', include(router.urls)),  # /api/notifications/

    # === Real-time Helpers (for NotificationBell) ===
    path('api/live/unread-count/', views.live_unread_count, name='live-unread-count'),
    path('api/live/unread-list/', views.live_unread_list, name='live-unread-list'),
    path('api/live/all-list/', views.live_all_list, name='live-all-list'),

    # === Mark as Read/Delete (for legacy or specific actions) ===
    path('mark-all-read/', views.mark_all_as_read, name='mark-all-read'),
    path('<int:pk>/mark-read/', views.mark_as_read, name='mark-read'),
    path('<int:pk>/delete/', views.delete, name='delete'),
    path('mark_all_as_read/', views.mark_all_as_read, name='mark-all-as-read'),
    path('subscribe/', SaveSubscriptionView.as_view(), name='subscribe-push'),
    path('subscriptions/', UserSubscriptionsView.as_view(), name='list-subscriptions'),
    path('subscriptions/<int:pk>/', DeleteSubscriptionView.as_view(), name='delete-subscription'),
    path('test-push/', SendTestPushView.as_view(), name='test-push'),
    path('broadcast/', BroadcastPushView.as_view(), name='broadcast-push'),
    path("unsubscribe/<str:token>/", UnsubscribeView.as_view(), name="unsubscribe"),
]

app_name = 'notifications'
