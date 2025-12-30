# backend/collector/views.py — FULL VIEWSETS WITH ANALYTICS & NOTIFICATIONS
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from django.db.models import Sum, Count, Avg, Q
from datetime import timedelta
from .models import (
    Collector, WasteCollectionSchedule, VehicleTurnCount,
    CollectorTarget, CollectorTask, CollectorLocationHistory
)
from .serializers import (
    CollectorSerializer, WasteCollectionScheduleSerializer,
    VehicleTurnCountSerializer, CollectorTargetSerializer,
    CollectorTaskSerializer, CollectorLocationHistorySerializer
)
from .utils.notifications import notify_collector
from django.http import HttpResponse
import csv
from weasyprint import HTML
from io import BytesIO


class CollectorViewSet(viewsets.ModelViewSet):
    queryset = Collector.objects.filter(is_deleted=False)
    serializer_class = CollectorSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=True, methods=['post'])
    def assign_task(self, request, pk=None):
        collector = self.get_object()
        task = CollectorTask.objects.create(
            collector=collector,
            title=request.data.get('title'),
            description=request.data.get('description'),
            priority=request.data.get('priority', 'medium'),
            due_date=request.data.get('due_date'),
            ai_generated=False
        )
        notify_collector(
            collector=collector,
            title="New Task Assigned",
            message=f"Task: {task.title} - Due: {task.due_date.date()}",
            notification_type='task',
            target=task
        )
        return Response({"status": "task assigned"}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Comprehensive collector analytics overview
        """
        collectors = Collector.objects.filter(is_deleted=False)

        data = {
            'total_collectors': collectors.count(),
            'active_collectors': collectors.filter(is_active=True).count(),
            'average_rating': collectors.aggregate(Avg('rating'))['rating__avg'] or 0,
            'average_efficiency': collectors.aggregate(Avg('efficiency_percentage'))['efficiency_percentage__avg'] or 0,
            'total_customers': collectors.aggregate(Sum('total_customers'))['total_customers__sum'] or 0,
        }

        # Top performers
        top_performers = collectors.order_by('-efficiency_percentage')[:5].values(
            'user__username', 'rating', 'efficiency_percentage', 'total_customers'
        )

        # Monthly collection trends
        last_6_months = timezone.now() - timedelta(days=180)
        trends = VehicleTurnCount.objects.filter(date__gte=last_6_months).values(
            'date__month', 'date__year'
        ).annotate(
            total_turns=Sum('turn_count')
        ).order_by('date__year', 'date__month')

        return Response({
            'overview': data,
            'top_performers': list(top_performers),
            'trends': list(trends)
        })

    @action(detail=True, methods=['get'])
    def performance_report(self, request, pk=None):
        collector = self.get_object()
        data = {
            'name': collector.full_name,
            'rating': collector.rating,
            'efficiency': collector.efficiency_percentage,
            'customers': collector.total_customers,
            'villages': list(collector.villages.values_list('name', flat=True)),
            'current_location': collector.current_location.coords if collector.current_location else None,
        }
        return Response(data)


class WasteCollectionScheduleViewSet(viewsets.ModelViewSet):
    queryset = WasteCollectionSchedule.objects.all()
    serializer_class = WasteCollectionScheduleSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        schedule = self.get_object()
        schedule.is_completed = True
        schedule.completed_at = timezone.now()
        schedule.save()
        if schedule.collector:
            notify_collector(
                collector=schedule.collector,
                title="Collection Completed",
                message=f"Village {schedule.village.name} marked as collected.",
                notification_type='collection'
            )
        return Response({"status": "completed"})


# Register other viewsets similarly
class VehicleTurnCountViewSet(viewsets.ModelViewSet):
    queryset = VehicleTurnCount.objects.all()
    serializer_class = VehicleTurnCountSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class CollectorTargetViewSet(viewsets.ModelViewSet):
    queryset = CollectorTarget.objects.all()
    serializer_class = CollectorTargetSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class CollectorTaskViewSet(viewsets.ModelViewSet):
    queryset = CollectorTask.objects.all()
    serializer_class = CollectorTaskSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]


class CollectorLocationHistoryViewSet(viewsets.ModelViewSet):
    queryset = CollectorLocationHistory.objects.all()
    serializer_class = CollectorLocationHistorySerializer
    permission_classes = [IsAuthenticated, IsAdminUser]

class CollectorAnalyticsViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminUser]

    @action(detail=False, methods=['get'])
    def overview(self, request):
        collectors = Collector.objects.filter(is_deleted=False)
        data = {
            'total_collectors': collectors.count(),
            'active_collectors': collectors.filter(is_active=True).count(),
            'average_rating': collectors.aggregate(Avg('rating'))['rating__avg'] or 0,
            'average_efficiency': collectors.aggregate(Avg('efficiency_percentage'))['efficiency_percentage__avg'] or 0,
            'total_customers': collectors.aggregate(Sum('total_customers'))['total_customers__sum'] or 0,
        }
        return Response(data)

    @action(detail=False, methods=['get'])
    def performance_trends(self, request):
        last_12_months = timezone.now() - timedelta(days=365)
        trends = CollectorTarget.objects.filter(year__gte=last_12_months.year).values(
            'month', 'year'
        ).annotate(
            total_target=Sum('target_amount'),
            total_collected=Sum('collected_amount')
        ).order_by('year', 'month')

        return Response(list(trends))

    @action(detail=False, methods=['get'])
    def top_performers(self, request):
        top = Collector.objects.filter(is_deleted=False).order_by('-efficiency_percentage')[:10].values(
            'user__username', 'rating', 'efficiency_percentage', 'total_customers'
        )
        return Response(list(top))