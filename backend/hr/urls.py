from django.urls import path
from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views
from .views import performance_forecast_view, StaffViewSet, PayrollViewSet, PerformanceViewSet, \
    SentimentViewSet

router = DefaultRouter()
router.register(r'staff', StaffViewSet)
router.register(r'payroll', PayrollViewSet)
router.register(r'leaves', views.LeaveViewSet)
router.register(r'attendance', views.AttendanceViewSet)
router.register(r'missions', views.MissionViewSet)
router.register(r'extra-work', views.ExtraWorkViewSet)
router.register(r'vacations', views.VacationViewSet)
router.register(r'complaints', views.ComplaintViewSet)
router.register(r'loans', views.LoanViewSet)
router.register(r'reports', views.ReportViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'performance', PerformanceViewSet, basename='performance')
router.register(r'sentiment', SentimentViewSet, basename='sentiment')


urlpatterns = [
    path('', include(router.urls)),
    path("my-profile/", views.MyProfileView.as_view(), name="my-profile"),
    path('performance/forecast/', performance_forecast_view, name='prophet_forecast'),
    path("staff/create-with-user/", views.create_staff_with_user),
]
