# collector/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CollectorViewSet, WasteCollectionScheduleViewSet,
    VehicleTurnCountViewSet, CollectorTargetViewSet,
    CollectorTaskViewSet, CollectorLocationHistoryViewSet,
    CollectorAnalyticsViewSet
)

router = DefaultRouter()
router.register(r'collectors', CollectorViewSet)
router.register(r'schedules', WasteCollectionScheduleViewSet)
router.register(r'turn-counts', VehicleTurnCountViewSet)
router.register(r'targets', CollectorTargetViewSet)
router.register(r'tasks', CollectorTaskViewSet)
router.register(r'locations', CollectorLocationHistoryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('analytics/', CollectorAnalyticsViewSet.as_view({
        'get': 'overview'
    }), name='collector-analytics-overview'),
    path('analytics/trends/', CollectorAnalyticsViewSet.as_view({
        'get': 'performance_trends'
    }), name='collector-performance-trends'),
    path('analytics/top/', CollectorAnalyticsViewSet.as_view({
        'get': 'top_performers'
    }), name='collector-top-performers'),
]