# erp/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import ERPModule, BusinessUnit, KPI, Workflow, ERPNotification, ERPDashboard
from .serializers import (
    ERPModuleSerializer, BusinessUnitSerializer,
    KPISerializer, WorkflowSerializer,
    ERPNotificationSerializer, ERPDashboardSerializer
)

class ERPModuleViewSet(viewsets.ReadOnlyModelViewSet):
    """ERP Modules API"""
    queryset = ERPModule.objects.filter(is_active=True)
    serializer_class = ERPModuleSerializer
    permission_classes = [IsAuthenticated]

class BusinessUnitViewSet(viewsets.ReadOnlyModelViewSet):
    """Business Units API"""
    queryset = BusinessUnit.objects.filter(is_active=True).select_related('module', 'manager')
    serializer_class = BusinessUnitSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['module', 'is_active']

class KPIViewSet(viewsets.ReadOnlyModelViewSet):
    """KPI Dashboard API"""
    queryset = KPI.objects.filter(is_active=True).select_related('business_unit', 'module')
    serializer_class = KPISerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['business_unit', 'module', 'metric_type', 'period']

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get KPI summary by module"""
        from django.db.models import Sum, Avg
        module = request.query_params.get('module')

        kpis = self.filter_queryset(self.get_queryset())
        if module:
            kpis = kpis.filter(module__name=module)

        summary = {
            'total_kpis': kpis.count(),
            'avg_progress': kpis.aggregate(avg_progress=Avg('current_value'))['avg_progress'] or 0,
            'top_performers': list(kpis.order_by('-current_value')[:5].values('name', 'current_value', 'target_value')),
            'by_module': {}
        }

        return Response(summary)

class WorkflowViewSet(viewsets.ReadOnlyModelViewSet):
    """Workflows API"""
    queryset = Workflow.objects.select_related('module', 'business_unit')
    serializer_class = WorkflowSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['module', 'business_unit', 'status']

class ERPNotificationViewSet(viewsets.ModelViewSet):
    """ERP Notifications API"""
    serializer_class = ERPNotificationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_read', 'priority', 'module', 'business_unit']

    def get_queryset(self):
        return ERPNotification.objects.filter(recipients=self.request.user)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'read'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get unread notifications count"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})

class ERPDashboardViewSet(viewsets.ModelViewSet):
    """ERP Dashboard API"""
    serializer_class = ERPDashboardSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        dashboard, created = ERPDashboard.objects.get_or_create(user=self.request.user)
        return dashboard

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """Get complete ERP dashboard overview"""
        from reports.models import Report
        from stock.models import StockReport
        from reports.serializers import ReportSerializer

        overview = {
            'modules': ERPModuleSerializer(ERPModule.objects.filter(is_active=True), many=True).data,
            'kpi_summary': KPIViewSet.as_view({'get': 'summary'})(request).data,
            'recent_notifications': ERPNotificationSerializer(
                ERPNotification.objects.filter(recipients=request.user)[:5], many=True
            ).data,
            'recent_reports': ReportSerializer(
                Report.objects.filter(user=request.user).order_by('-created_at')[:5], many=True
            ).data,
            'business_units': BusinessUnitSerializer(
                BusinessUnit.objects.filter(is_active=True), many=True
            ).data
        }
        return Response(overview)