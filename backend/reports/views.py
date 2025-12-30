# reports/views.py
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse
from django.utils import timezone
import json
from .models import Report, ReportTemplate, ReportCategory, ReportLog
from .serializers import (
    ReportCategorySerializer, ReportTemplateSerializer,
    ReportSerializer, ReportCreateSerializer, ReportStatusSerializer, ReportLogSerializer
)
from .tasks import generate_report_task

class ReportCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for report categories"""
    queryset = ReportCategory.objects.filter(is_active=True)
    serializer_class = ReportCategorySerializer
    permission_classes = [IsAuthenticated]

class ReportTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for report templates"""
    queryset = ReportTemplate.objects.filter(is_active=True).select_related('category')
    serializer_class = ReportTemplateSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['category', 'report_type']

class ReportViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin,
                    mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Main Report ViewSet"""
    queryset = Report.objects.select_related(
        'template', 'category', 'user'
    ).prefetch_related('logs').order_by('-created_at')
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'priority', 'category', 'template', 'format']

    def get_queryset(self):
        """Filter reports for current user"""
        return super().get_queryset().filter(user=self.request.user)

    def perform_create(self, serializer):
        """Create report and start generation task"""
        report = serializer.save(user=self.request.user)

        # Start async generation
        task = generate_report_task.delay(
            report_id=str(report.id),
            template_id=str(report.template.id),
            parameters=report.parameters,
            format=report.format,
            priority=report.priority
        )

        report.task_id = task.id
        report.save(update_fields=['task_id'])

        return Response({
            'message': 'Report generation started',
            'report_id': str(report.id),
            'task_id': task.id
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel a pending/generating report"""
        report = self.get_object()
        if report.status not in ['pending', 'generating']:
            return Response({
                'error': 'Report cannot be cancelled in current status'
            }, status=status.HTTP_400_BAD_REQUEST)

        report.status = 'cancelled'
        report.save()

        # TODO: Cancel celery task
        return Response({'message': 'Report cancelled successfully'})

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download report file"""
        report = self.get_object()
        if report.status != 'completed' or not report.file:
            return Response({
                'error': 'Report not ready for download',
                'status': report.status
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = FileResponse(
                report.file.open('rb'),
                as_attachment=True,
                filename=f"report_{report.id}_{report.title}_{report.completed_at.strftime('%Y%m%d')}.{report.format}"
            )
            response['Content-Length'] = report.file_size
            return response
        except FileNotFoundError:
            return Response({'error': 'Report file not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def my_reports(self, request):
        """Get user's recent reports"""
        reports = self.filter_queryset(self.get_queryset())[:10]
        serializer = self.get_serializer(reports, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get report logs"""
        report = self.get_object()
        logs = report.logs.all()
        serializer = ReportLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get report statistics"""
        from django.db.models import Count

        stats = {
            'total_reports': Report.objects.filter(user=request.user).count(),
            'status_counts': dict(
                Report.objects.filter(user=request.user)
                .values('status')
                .annotate(count=Count('status'))
                .values_list('status', 'count')
            ),
            'format_counts': dict(
                Report.objects.filter(user=request.user)
                .values('format')
                .annotate(count=Count('format'))
                .values_list('format', 'count')
            ),
            'recent_activity': list(
                Report.objects.filter(user=request.user)
                .order_by('-completed_at')
                .values('title', 'status', 'completed_at', 'format')[:5]
            )
        }
        return Response(stats)