# erp/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'modules', views.ERPModuleViewSet, basename='erpmodule')
router.register(r'business-units', views.BusinessUnitViewSet, basename='businessunit')
router.register(r'kpis', views.KPIViewSet, basename='kpi')
router.register(r'workflows', views.WorkflowViewSet, basename='workflow')
router.register(r'notifications', views.ERPNotificationViewSet, basename='notification')
router.register(r'dashboard', views.ERPDashboardViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
    # Dashboard endpoints
    path('overview/', views.ERPDashboardViewSet.as_view({'get': 'overview'}), name='erp-overview'),
    path('notifications/unread/', views.ERPNotificationViewSet.as_view({'get': 'unread_count'}), name='notifications-unread'),
]