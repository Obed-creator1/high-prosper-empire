# reports/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'categories', views.ReportCategoryViewSet, basename='reportcategory')
router.register(r'templates', views.ReportTemplateViewSet, basename='reporttemplate')
router.register(r'reports', views.ReportViewSet, basename='report')

urlpatterns = [
    path('', include(router.urls)),

    # Legacy endpoints
    path('stats/', views.ReportViewSet.as_view({'get': 'statistics'}), name='report-stats'),
]