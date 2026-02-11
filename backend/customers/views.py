# customers/views.py — HIGH PROSPER PROFESSIONAL API 2026
import json
import secrets
import random
from datetime import timedelta, date

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum, Count, Q, Avg
from django.shortcuts import get_object_or_404, redirect
from django.utils import timezone
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from rest_framework import viewsets, status, filters, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Customer, Village, ServiceOrder, Complaint, Sector, Cell, ServiceRequest
from .serializers import (
    CustomerSerializer, CustomerListSerializer,
    VillageSerializer, ServiceOrderSerializer,
    ComplaintSerializer, ChatMessageSerializer, SectorSerializer, CellSerializer, ServiceRequestSerializer
)
from users.models import CustomUser, ChatMessage
from payments.models import Invoice, Payment
from payments.serializers import InvoiceSerializer, PaymentDetailSerializer
from hr.services import MTNSMSService
from .permissions import IsAdminOrCollectorOrOwner
from users.permissions import IsAdminOrManagerOrCEO, ServiceRequestPermission


User = get_user_model()

ALLOWED_ROLES = ['admin', 'ceo', 'manager', 'collector']

class SectorViewSet(viewsets.ModelViewSet):
    """
    Advanced Sector Management API — Vision 2026
    - Full CRUD
    - Real-time analytics using safe Python calculation (like customer_stats)
    - Only admin, CEO, manager allowed
    """
    queryset = Sector.objects.all().order_by('name')
    serializer_class = SectorSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerOrCEO]

    def get_queryset(self):
        """
        Base queryset with basic counts — safe DB fields only
        """
        return Sector.objects.annotate(
            cell_count=Count('cells', distinct=True),
            village_count=Count('cells__villages', distinct=True),
            customer_count=Count('cells__villages__residents', distinct=True),
            monthly_revenue=Sum('cells__villages__residents__monthly_fee')
        ).prefetch_related('managers', 'supervisors').order_by('name')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Enhanced data with Python-calculated balance & risk
        enhanced_data = []
        for sector in queryset:
            # Get all customers in this sector
            customers = Customer.objects.filter(
                village__cell__sector=sector
            ).select_related('village')

            total_balance = sum((c.balance or 0) for c in customers)
            risk_scores = [c.risk_score for c in customers if c.risk_score is not None]
            avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

            serializer = self.get_serializer(sector)
            data = serializer.data
            data.update({
                'total_balance': float(total_balance),
                'avg_risk': round(avg_risk, 2)
            })
            enhanced_data.append(data)

        return Response({
            "count": queryset.count(),
            "results": enhanced_data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        customers = Customer.objects.filter(village__cell__sector=instance)

        total_balance = sum((c.balance or 0) for c in customers)
        risk_scores = [c.risk_score for c in customers if c.risk_score is not None]
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

        serializer = self.get_serializer(instance)
        data = serializer.data
        data.update({
            'total_balance': float(total_balance),
            'avg_risk': round(avg_risk, 2)
        })
        return Response(data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Global sector analytics — matches customer_stats logic"""
        sectors = Sector.objects.prefetch_related(
            'cells__villages__residents', 'managers', 'supervisors'
        )

        total_customers = 0
        total_revenue = 0
        total_balance = 0
        total_risk = 0
        sector_count_with_customers = 0

        sector_stats = []

        for sector in sectors:
            customers = Customer.objects.filter(village__cell__sector=sector)
            count = customers.count()
            if count > 0:
                total_customers += count
                total_revenue += sum(c.monthly_fee or 0 for c in customers)
                total_balance += sum(c.balance or 0 for c in customers)
                risk_scores = [c.risk_score for c in customers if c.risk_score is not None]
                if risk_scores:
                    total_risk += sum(risk_scores)
                    sector_count_with_customers += 1

            sector_stats.append({
                "id": sector.id,
                "name": sector.name,
                "code": sector.code or "",
                "customer_count": count,
                "monthly_revenue": float(sum(c.monthly_fee or 0 for c in customers)),
                "total_balance": float(sum(c.balance or 0 for c in customers)),
                "avg_risk": round(sum(risk_scores)/len(risk_scores) if risk_scores else 0, 2),
                "managers": [
                    {"id": m.id, "name": m.get_full_name() or m.username, "phone": m.phone or ""}
                    for m in sector.managers.all()
                ],
                "supervisors": [
                    {"id": s.id, "name": s.get_full_name() or s.username, "phone": s.phone or ""}
                    for s in sector.supervisors.all()
                ]
            })

        avg_risk_global = (total_risk / total_customers) if total_customers > 0 else 0.0

        return Response({
            "total_sectors": sectors.count(),
            "total_customers": total_customers,
            "total_monthly_revenue": float(total_revenue),
            "total_outstanding_balance": float(total_balance),
            "average_risk_score": round(avg_risk_global, 2),
            "active_sectors": sector_count_with_customers,
            "sector_details": sector_stats
        })

    @action(detail=True, methods=['get'])
    def villages(self, request, pk=None):
        """Get all villages in this sector with accurate analytics"""
        sector = self.get_object()
        villages = Village.objects.filter(cell__sector=sector).prefetch_related('residents', 'collectors')

        today = timezone.now().date()
        month_start = today.replace(day=1)

        village_data = []
        for village in villages:
            residents = village.residents.all()
            collectors_names = ", ".join(
                c.get_full_name() or c.username for c in village.collectors.all()
            ) or "Unassigned"
            new_this_month = residents.filter(created_at__gte=month_start).count()

            village_data.append({
                "id": village.id,
                "name": village.name,
                "cell": village.cell.name if village.cell else "N/A",
                "collectors": collectors_names,
                "customer_count": residents.count(),
                "monthly_revenue": float(sum(c.monthly_fee or 0 for c in residents)),
                "total_balance": float(sum(c.balance or 0 for c in residents)),
                "avg_risk": round(
                    sum(c.risk_score for c in residents if c.risk_score is not None) /
                    residents.count() if residents.exists() else 0, 2
                ),
                "new_this_month": new_this_month,
                "managers": [
                    {"id": m.id, "name": m.get_full_name() or m.username, "phone": m.phone or ""}
                    for m in sector.managers.all()
                ],
                "supervisors": [
                    {"id": s.id, "name": s.get_full_name() or s.username, "phone": s.phone or ""}
                    for s in sector.supervisors.all()
                ]
            })

        return Response(village_data)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.cells.exists():
            return Response(
                {"error": "Cannot delete sector with associated cells."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'])
    def growth(self, request):
        """
        Real-time customer growth analytics 2025
        - New customers per month per village
        - Cumulative totals
        """
        from datetime import datetime
        from collections import defaultdict

        # Get all customers with creation date in 2025
        customers = Customer.objects.filter(
            created_at__year=2025
        ).select_related('village__cell__sector')

        # Structure: month → village → count
        monthly_data = defaultdict(lambda: defaultdict(int))
        cumulative = defaultdict(int)

        for customer in customers:
            month_key = customer.created_at.strftime("%b")  # Jan, Feb, etc.
            village_name = customer.village.name if customer.village else "Unknown"

            monthly_data[month_key][village_name] += 1
            cumulative[village_name] += 1

        # Build chart dataset
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        chart_data = []
        for month in months:
            entry = {"month": month}
            for village_name in set(v.name for v in Village.objects.all()):
                 entry[village_name] = monthly_data[month].get(village_name, 0)
            chart_data.append(entry)

        # Top villages by total growth
        top_villages = sorted(
            cumulative.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]  # Top 10 for performance

        # Limit dataset to top villages + "Others"
        others_data = defaultdict(int)
        final_data = []
        top_village_names = {name for name, _ in top_villages}

        for entry in chart_data:
            new_entry = {"month": entry["month"]}
            others = 0
            for village, count in entry.items():
                if village != "month":
                    if village in top_village_names:
                        new_entry[village] = count
                    else:
                        others += count
            if others > 0:
                new_entry["Others"] = others
            final_data.append(new_entry)

        return Response({
            "growth_data": final_data,
            "top_villages": [
                {"name": name, "total_new": count}
                for name, count in top_villages
            ],
            "total_new_2025": sum(cumulative.values()),
            "months": months
        })

class CellViewSet(viewsets.ModelViewSet):
    """
    Advanced Cell Management API — Vision 2026
    - Full CRUD
    - Real-time analytics using safe Python calculation
    - Only admin, CEO, manager allowed
    """
    queryset = Cell.objects.select_related('sector').order_by('sector__name', 'name')
    serializer_class = CellSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerOrCEO]

    def get_queryset(self):
        """
        Base queryset with basic counts
        """
        return Cell.objects.annotate(
            village_count=Count('villages', distinct=True),
            customer_count=Count('villages__residents', distinct=True),
            monthly_revenue=Sum('villages__residents__monthly_fee')
        ).select_related('sector')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())

        # Add calculated balance & risk in Python (safe)
        enhanced_data = []
        for cell in queryset:
            customers = Customer.objects.filter(village__cell=cell)
            total_balance = sum((c.balance or 0) for c in customers)
            risk_scores = [c.risk_score for c in customers if c.risk_score is not None]
            avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

            serializer = self.get_serializer(cell)
            data = serializer.data
            data.update({
                'total_balance': float(total_balance),
                'avg_risk': round(avg_risk, 2)
            })
            enhanced_data.append(data)

        return Response({
            "count": queryset.count(),
            "results": enhanced_data
        })

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        customers = Customer.objects.filter(village__cell=instance)

        total_balance = sum((c.balance or 0) for c in customers)
        risk_scores = [c.risk_score for c in customers if c.risk_score is not None]
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0.0

        serializer = self.get_serializer(instance)
        data = serializer.data
        data.update({
            'total_balance': float(total_balance),
            'avg_risk': round(avg_risk, 2)
        })
        return Response(data)

    @action(detail=True, methods=['get'])
    def villages(self, request, pk=None):
        """Get all villages in this cell with analytics"""
        cell = self.get_object()
        villages = Village.objects.filter(cell=cell).prefetch_related('residents', 'collectors')

        village_data = []
        for village in villages:
            residents = village.residents.all()
            collectors_names = ", ".join(
                c.get_full_name() or c.username for c in village.collectors.all()
            ) or "Unassigned"

            new_this_month = residents.filter(created_at__month=timezone.now().month).count()

            village_data.append({
                "id": village.id,
                "name": village.name,
                "collectors": collectors_names,
                "customer_count": residents.count(),
                "monthly_revenue": float(sum(c.monthly_fee or 0 for c in residents)),
                "total_balance": float(sum(c.balance or 0 for c in residents)),
                "avg_risk": round(
                    sum(c.risk_score for c in residents if c.risk_score is not None) /
                    residents.count() if residents.exists() else 0, 2
                ),
                "new_this_month": new_this_month
            })

        return Response(village_data)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.villages.exists():
            return Response(
                {"error": "Cannot delete cell with associated villages."},
                status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

# ============================
# PUBLIC AUTH ENDPOINTS
# ============================
@csrf_exempt
@permission_classes([AllowAny])
def verify_email(request, token):
    """Verify email via token link"""
    try:
        user = CustomUser.objects.get(
            email_verification_token=token,
            is_email_verified=False
        )
        user.is_email_verified = True
        user.email_verification_token = None
        user.save()

        # Activate associated customer
        if hasattr(user, 'customer_profile'):
            user.customer_profile.status = 'Active'
            user.customer_profile.save()

        return redirect("https://app.highprosper.africa/login/?verified=true")
    except CustomUser.DoesNotExist:
        return redirect("https://app.highprosper.africa/login/?verified=invalid")



@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification(request):
    phone = request.data.get('phone')
    email = request.data.get('email')
    if not phone and not email:
        return Response({"detail": "Phone or email required"}, status=400)

    try:
        user = User.objects.get(username=phone) if phone else User.objects.get(email=email)
        if user.is_email_verified:
            return Response({"detail": "Already verified"}, status=400)

        user.email_verification_token = secrets.token_urlsafe(32)
        user.save()

        verification_url = f"https://app.highprosper.africa/verify-email/{user.email_verification_token}/"
        send_mail(
            subject="Verify Your High Prosper Account",
            message=f"Verify here: {verification_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )
        return Response({"detail": "Verification email sent"})
    except User.DoesNotExist:
        return Response({"detail": "User not found"}, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def send_phone_otp(request):
    phone = request.data.get('phone')
    if not phone:
        return Response({"detail": "Phone required"}, status=400)

    try:
        user = User.objects.get(username=phone)
        if user.is_phone_verified:
            return Response({"detail": "Phone already verified"}, status=400)

        otp = random.randint(100000, 999999)
        cache.set(f"otp_{phone}", otp, timeout=600)

        MTNSMSService.send_sms(phone, f"High Prosper OTP: {otp}. Valid 10 mins.")
        return Response({"detail": "OTP sent"})
    except User.DoesNotExist:
        return Response({"detail": "Phone not registered"}, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_phone_otp(request):
    phone = request.data.get('phone')
    otp = request.data.get('otp')
    if not phone or not otp:
        return Response({"detail": "Phone and OTP required"}, status=400)

    cached = cache.get(f"otp_{phone}")
    if str(cached) == str(otp):
        try:
            user = User.objects.get(username=phone)
            user.is_phone_verified = True
            user.save()

            if hasattr(user, 'customer_profile') and user.customer_profile.status == 'Pending':
                user.customer_profile.status = 'Active'
                user.customer_profile.save()

            cache.delete(f"otp_{phone}")
            return Response({"detail": "Phone verified"})
        except User.DoesNotExist:
            pass

    return Response({"detail": "Invalid OTP"}, status=400)


# ============================
# CORE VIEWSETS
# ============================
class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrCollectorOrOwner]
    serializer_class = CustomerSerializer
    queryset = Customer.objects.select_related('village__cell__sector', 'user').prefetch_related('village__collectors')

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', '').lower()

        qs = super().get_queryset()

        print(f"[DEBUG] User: {user.username} | Role: {role} | Superuser: {user.is_superuser} | Count: {qs.count()}")

        if user.is_superuser or role in ['admin', 'ceo', 'manager']:
            return qs
        elif role == 'collector':
            return qs.filter(village__collectors=user)
        elif role == 'customer':
            return qs.filter(user=user)
        return qs.none()

    def get_serializer_class(self):
        if self.action == 'list':
            print("[DEBUG] Using CustomerListSerializer for list")
            return CustomerListSerializer
        return CustomerSerializer

    def list(self, request, *args, **kwargs):
        print("[DEBUG] List action — forcing CustomerListSerializer")
        queryset = self.filter_queryset(self.get_queryset())
        serializer = CustomerListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='register')
    def register(self, request):
        """Admin/Collector: Register new customer — NO PASSWORD NEEDED"""
        user = request.user
        role = getattr(user, 'role', None)

        if not (user.is_superuser or role in ['admin', 'ceo', 'manager', 'collector']):
            return Response({"detail": "Permission denied"}, status=403)

        data = request.data

        # Required fields
        required = ['name', 'phone', 'village_id', 'monthly_fee']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return Response({"detail": f"Missing required fields: {', '.join(missing)}"}, status=400)

        name = data['name'].strip()
        phone = data['phone'].strip()
        village_id = data['village_id']
        monthly_fee = float(data['monthly_fee'])
        email = data.get('email', '').strip() or None
        nid = data.get('nid', '').strip() or None
        gender = data.get('gender') or None
        date_of_birth = data.get('date_of_birth') or None

        # Validation
        if CustomUser.objects.filter(username=phone).exists():
            return Response({"detail": "Phone number already registered"}, status=400)

        try:
            village = Village.objects.get(id=village_id)
        except Village.DoesNotExist:
            return Response({"detail": "Village not found"}, status=400)

        try:
            with transaction.atomic():
                # Generate payment account
                payment_account = f"HP{secrets.token_hex(4).upper()}"

                # Generate unique contract_no
                year = timezone.now().year
                prefix = f"CONT-{year}-"
                max_num = Customer.objects.filter(contract_no__startswith=prefix).count()
                contract_no = f"{prefix}{str(max_num + 1).zfill(4)}"

                # Create user
                user_obj = CustomUser.objects.create_user(
                    username=phone,
                    email=email,
                    password=None,
                    first_name=name.split(maxsplit=1)[0],
                    last_name=name.split(maxsplit=1)[1] if len(name.split(maxsplit=1)) > 1 else 'Customer',
                    role='customer'
                )
                user_obj.set_unusable_password()
                user_obj.save()

                # Create customer
                Customer.objects.create(
                    user=user_obj,
                    name=name,
                    phone=phone,
                    email=email,
                    nid=nid,
                    gender=gender,
                    date_of_birth=date_of_birth,
                    village=village,
                    payment_account=payment_account,
                    contract_no=contract_no,
                    monthly_fee=monthly_fee,
                    connection_date=timezone.localdate(),
                    status='Active'
                )

                return Response({
                    "detail": "Customer registered successfully!",
                    "payment_account": payment_account,
                    "contract_no": contract_no
                }, status=201)

        except Exception as e:
            print("Registration error:", str(e))
            return Response({"detail": "Registration failed. Please try again."}, status=500)

    @action(detail=True, methods=['patch'], url_path='edit')
    def edit(self, request, pk):
        """Admin/Collector: Edit customer (collector limited fields)"""
        customer = self.get_object()
        user = request.user
        role = getattr(user, 'role', None)

        # Collector can only edit name and monthly_fee
        if role == 'collector':
            allowed = ['name', 'monthly_fee']
            data = {k: v for k, v in request.data.items() if k in allowed}
            if 'monthly_fee' in data:
                new_fee = float(data['monthly_fee'])
                if new_fee < customer.monthly_fee:
                    return Response({"detail": "Collector cannot reduce monthly fee"}, status=400)
        else:
            data = request.data

        serializer = CustomerSerializer(customer, data=data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def me(self, request):
        customer = get_object_or_404(Customer, user=request.user)
        serializer = CustomerSerializer(customer)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.GET.get('q', '').strip()
        if not q:
            return Response([])

        qs = self.get_queryset().filter(
            Q(name__icontains=q) |
            Q(phone__icontains=q) |
            Q(email__icontains=q) |
            Q(payment_account__icontains=q)
        )[:30]

        serializer = CustomerListSerializer(qs, many=True)
        return Response(serializer.data)


class VillageViewSet(viewsets.ModelViewSet):
    """
    Advanced Village Management API — Vision 2026
    - Full CRUD
    - Dual Targets: Revenue + New Customers (stored on Village)
    - Real-time auto-calculated metrics
    - GPS coordinates for Google Maps
    - Smart Redis caching for performance
    - Only admin, CEO, manager
    """
    queryset = Village.objects.select_related('cell__sector').prefetch_related('collectors', 'residents')
    serializer_class = VillageSerializer
    permission_classes = [IsAuthenticated, IsAdminOrManagerOrCEO]

    # Cache TTL (seconds) — override in settings.py if needed
    CACHE_TTL = getattr(settings, 'VILLAGE_METRICS_CACHE_TTL', 300)  # 5 minutes default

    def get_queryset(self):
        return Village.objects.select_related('cell__sector').prefetch_related(
            'collectors', 'residents'
        ).order_by('cell__sector__name', 'name')

    def _get_cache_key(self, suffix=""):
        """Generate cache key with date and user"""
        date_str = timezone.now().date().isoformat()
        user_id = self.request.user.id
        return f"village_viewset_{suffix}_{date_str}_{user_id}"

    def list(self, request, *args, **kwargs):
        cache_key = self._get_cache_key("list")
        cached_data = cache.get(cache_key)

        if cached_data:
            return Response(cached_data)

        queryset = self.filter_queryset(self.get_queryset())
        today = timezone.now()
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        enhanced_data = []
        for village in queryset:
            # Per-village cache
            village_cache_key = f"village_metrics_{village.id}_{today.date().isoformat()}"
            village_metrics = cache.get(village_cache_key)

            if not village_metrics:
                # Update real-time data
                village.update_collected_and_growth()
                village.refresh_from_db()

                collectors_str = ", ".join(
                    c.get_full_name() or c.username for c in village.collectors.all()
                ) or "Unassigned"

                new_today = village.residents.filter(created_at__date=today.date()).count()

                collected_today = Payment.objects.filter(
                    customer__village=village,
                    status='Successful',
                    completed_at__date=today.date()
                ).aggregate(total=Sum('amount'))['total'] or 0.0

                village_metrics = {
                    'collectors': collectors_str,
                    'customer_count': village.customer_count,
                    'monthly_revenue': float(village.collected_this_month),
                    'total_balance': float(village.total_balance),
                    'avg_risk': village.avg_risk,
                    'new_today': new_today,
                    'new_this_month': village.new_customers_this_month,
                    'collected_today': float(collected_today),
                    'collected_this_month': float(village.collected_this_month),
                    'monthly_revenue_target': float(village.monthly_revenue_target),
                    'monthly_new_customers_target': village.monthly_new_customers_target,
                    'target_month': village.target_month,
                    'target_year': village.target_year,
                    'revenue_target_percentage': village.revenue_target_percentage,
                    'remaining_revenue_target': float(village.remaining_revenue_target),
                    'new_customers_target_percentage': village.new_customers_target_percentage,
                    'remaining_new_customers_target': village.remaining_new_customers_target,
                    'overall_target_percentage': village.overall_target_percentage,
                    'performance_rank': village.performance_rank
                }

                # Cache individual village metrics
                cache.set(village_cache_key, village_metrics, self.CACHE_TTL)

            serializer = self.get_serializer(village)
            data = serializer.data
            data.update(village_metrics)
            enhanced_data.append(data)

        response_data = {
            "count": queryset.count(),
            "results": enhanced_data
        }

        # Cache full list response
        cache.set(cache_key, response_data, self.CACHE_TTL)

        return Response(response_data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        cache_key = f"village_detail_{instance.id}_{timezone.now().date().isoformat()}"
        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        instance.update_collected_and_growth()
        instance.refresh_from_db()

        collectors_str = ", ".join(
            c.get_full_name() or c.username for c in instance.collectors.all()
        ) or "Unassigned"

        new_today = instance.residents.filter(created_at__date=timezone.now().date()).count()

        collected_today = Payment.objects.filter(
            customer__village=instance,
            status='Successful',
            completed_at__date=timezone.now().date()
        ).aggregate(total=Sum('amount'))['total'] or 0.0

        serializer = self.get_serializer(instance)
        data = serializer.data
        data.update({
            'collectors': collectors_str,
            'customer_count': instance.customer_count,
            'monthly_revenue': float(instance.collected_this_month),
            'total_balance': float(instance.total_balance),
            'avg_risk': instance.avg_risk,
            'new_today': new_today,
            'new_this_month': instance.new_customers_this_month,
            'collected_today': float(collected_today),
            'collected_this_month': float(instance.collected_this_month),
            'monthly_revenue_target': float(instance.monthly_revenue_target),
            'monthly_new_customers_target': instance.monthly_new_customers_target,
            'revenue_target_percentage': instance.revenue_target_percentage,
            'remaining_revenue_target': float(instance.remaining_revenue_target),
            'new_customers_target_percentage': instance.new_customers_target_percentage,
            'remaining_new_customers_target': instance.remaining_new_customers_target,
            'overall_target_percentage': instance.overall_target_percentage,
            'performance_rank': instance.performance_rank
        })

        cache.set(cache_key, data, self.CACHE_TTL)
        return Response(data)

    @action(detail=False, methods=['get'])
    def growth(self, request):
        year = int(request.query_params.get('year', timezone.now().year))
        cache_key = f"village_growth_{year}"
        cached = cache.get(cache_key)

        if cached:
            return Response(cached)

        customers = Customer.objects.filter(
            created_at__year=year
        ).select_related('village')

        monthly_data = {date(year, m, 1).strftime("%b"): {} for m in range(1, 13)}

        for customer in customers:
            month_str = customer.created_at.strftime("%b")
            village_name = customer.village.name if customer.village else "Unknown"
            monthly_data[month_str][village_name] = monthly_data[month_str].get(village_name, 0) + 1

        dataset = [{"month": month, **villages} for month, villages in monthly_data.items()]

        response = {"growth_data": dataset, "year": year}
        cache.set(cache_key, response, 3600)  # Cache growth for 1 hour
        return Response(response)

    def perform_create(self, serializer):
        village = serializer.save(created_by=self.request.user, updated_by=self.request.user)
        village.update_collected_and_growth()
        self._invalidate_caches()

    def perform_update(self, serializer):
        village = serializer.save(updated_by=self.request.user)
        village.update_collected_and_growth()
        self._invalidate_caches(village.id)

    def perform_destroy(self, instance):
        village_id = instance.id
        super().perform_destroy(instance)
        self._invalidate_caches(village_id)

    def _invalidate_caches(self, village_id=None):
        """Invalidate relevant caches"""
        patterns = [
            "village_viewset_list_*",
            "village_growth_*"
        ]
        if village_id:
            patterns.append(f"village_detail_{village_id}_*")
            patterns.append(f"village_metrics_{village_id}_*")

        for pattern in patterns:
            cache.delete_pattern(pattern)


class ComplaintViewSet(viewsets.ModelViewSet):
    serializer_class = ComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, 'role', None)
        if role == 'customer':
            return Complaint.objects.filter(customer__user=user)
        return Complaint.objects.all()


# ============================
# CUSTOMER DASHBOARD ENDPOINTS
# ============================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_invoices(request):
    customer = get_object_or_404(Customer, user=request.user)
    invoices = Invoice.objects.filter(customer=customer).order_by('-due_date')
    return Response(InvoiceSerializer(invoices, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payments(request):
    customer = get_object_or_404(Customer, user=request.user)
    payments = Payment.objects.filter(customer=customer).order_by('-completed_at')[:100]
    return Response(PaymentDetailSerializer(payments, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_orders(request):
    customer = get_object_or_404(Customer, user=request.user)
    orders = ServiceOrder.objects.filter(customer=customer).order_by('-created_at')
    return Response(ServiceOrderSerializer(orders, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_complaints(request):
    customer = get_object_or_404(Customer, user=request.user)
    complaints = Complaint.objects.filter(customer=customer).order_by('-created_at')
    return Response(ComplaintSerializer(complaints, many=True).data)


# ============================
# ANALYTICS & STATS
# ============================
# customers/views.py — FIXED FOR MULTIPLE COLLECTORS

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def customer_stats(request):
    user = request.user
    role = getattr(user, 'role', None)
    cache_key = f"stats_{role}_{user.id}"
    cached = cache.get(cache_key)
    if cached:
        return Response(json.loads(cached))

    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Role-based querysets
    if user.is_superuser or role in ['admin', 'manager', 'ceo']:
        customers_qs = Customer.objects.select_related('village__cell__sector').prefetch_related('village__collectors')
        villages_qs = Village.objects.select_related('cell__sector').prefetch_related('residents', 'collectors')
    elif role == 'collector':
        customers_qs = Customer.objects.filter(village__collectors=user).select_related('village__cell__sector')
        villages_qs = Village.objects.filter(collectors=user).prefetch_related('residents')
    elif role == 'customer':
        customers_qs = Customer.objects.filter(user=user)
        villages_qs = Village.objects.none()
    else:
        return Response({"detail": "Unauthorized"}, status=403)

    # Summary
    total_customers = customers_qs.count()
    active_customers = customers_qs.filter(status='Active').count()
    total_balance = sum(c.balance or 0 for c in customers_qs)
    new_this_month = customers_qs.filter(created_at__gte=month_start).count()

    # Top villages by outstanding
    top_villages = []
    for village in villages_qs:
        residents = village.residents.all()
        outstanding = sum((c.balance or 0) for c in residents if (c.balance or 0) > 0)
        if outstanding > 0 or residents.exists():
            collectors_names = ", ".join(c.get_full_name() or c.username for c in village.collectors.all()) or "Unassigned"
            top_villages.append({
                "id": village.id,
                "name": village.name,
                "total_customers": residents.count(),
                "total_outstanding": float(outstanding),
                "total_monthly": float(sum(c.monthly_fee or 0 for c in residents)),
                "collectors": collectors_names
            })

    top_villages.sort(key=lambda x: x["total_outstanding"], reverse=True)
    top_villages = top_villages[:5]

    # Collector ranking
    collector_ranking = []

    if user.is_superuser or role in ['admin', 'manager', 'ceo']:
        collectors = CustomUser.objects.filter(role='collector')
        temp_ranking = []
        for collector in collectors:
            collected = Payment.objects.filter(
                customer__village__collectors=collector,
                status='Successful',
                completed_at__gte=month_start
            ).aggregate(total=Sum('amount'))['total'] or 0

            temp_ranking.append({
                "id": collector.id,
                "name": collector.get_full_name() or collector.username,
                "customers": Customer.objects.filter(village__collectors=collector).count(),
                "collected_this_month": float(collected),
                "achievement_rate": round((collected / 24000000) * 100, 1) if collected else 0
            })

        collector_ranking = sorted(temp_ranking, key=lambda x: x["collected_this_month"], reverse=True)[:10]

    data = {
        "summary": {
            "totalCustomers": total_customers,
            "active": active_customers,
            "totalBalance": float(total_balance),
            "newThisMonth": new_this_month,
        },
        "topVillages": top_villages,
        "collectorRanking": collector_ranking
    }

    cache.set(cache_key, json.dumps(data), timeout=300)
    return Response(data)


# Bonus: Fixed villages_list view (if you have it)
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def villages_list(request):
    villages = Village.objects.select_related('cell__sector').prefetch_related('collectors')
    data = [
        {
            "id": v.id,
            "name": v.name,
            "cell_name": v.cell.name if v.cell else None,
            "sector_name": v.cell.sector.name if v.cell and v.cell.sector else None,
            "collectors": [c.get_full_name() or c.username for c in v.collectors.all()]
        }
        for v in villages
    ]
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gps_customer_map(request):
    """
    API endpoint for GPS Customer Map
    Returns customers with valid GPS coordinates
    """
    user = request.user
    role = getattr(user, 'role', None)

    # Filter based on role
    qs = Customer.objects.filter(
        gps_coordinates__isnull=False,
        gps_coordinates__regex=r'^-?\d+\.\d+,-?\d+\.\d+$'  # Basic lat,lng format
    )

    if role == 'collector':
        qs = qs.filter(village__collectors__username=user)
    elif role != 'admin' and role != 'manager' and role != 'ceo':
        qs = qs.filter(user=user)

    data = []
    for c in qs:
        try:
            lat, lng = map(float, c.gps_coordinates.split(','))
            data.append({
                "id": c.id,
                "name": c.name,
                "phone": c.phone,
                "village": c.village.name if c.village else "Unknown",
                "balance": float(c.balance or 0),
                "days_delinquent": c.days_delinquent,
                "risk_score": float(c.risk_score or 0),
                "lat": lat,
                "lng": lng
            })
        except:
            continue

    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    customer = get_object_or_404(Customer, user=request.user)
    if not customer.collector:
        return Response({"detail": "No collector assigned"}, status=400)

    text = request.data.get('message', '').strip()
    if not text:
        return Response({"detail": "Message required"}, status=400)

    message = ChatMessage.objects.create(
        sender=request.user,
        receiver=customer.collector,
        room=f"{min(request.user.id, customer.collector.id)}_{max(request.user.id, customer.collector.id)}",
        message=text
    )

    serializer = ChatMessageSerializer(message)
    return Response(serializer.data, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def collector_summary(request):
    user = request.user
    if user.role not in ['collector', 'admin', 'manager', 'ceo']:
        return Response({"detail": "Unauthorized"}, status=403)

    if user.role == 'collector':
        collectors = [user]
    else:
        collectors = CustomUser.objects.filter(role='collector')

    result = []
    for collector in collectors:
        villages = Village.objects.filter(collector=collector).prefetch_related('residents')

        total_customers = sum(v.residents.count() for v in villages)
        total_balance = sum(sum(c.balance for c in v.residents.all()) for v in villages)

        result.append({
            "collector_id": collector.id,
            "collector_name": collector.get_full_name() or collector.username,
            "total_villages": villages.count(),
            "total_customers": total_customers,
            "total_balance": float(total_balance),
            "villages": [
                {
                    "id": v.id,
                    "name": v.name,
                    "customers": v.residents.count(),
                    "balance": float(sum(c.balance for c in v.residents.all()))
                }
                for v in villages
            ]
        })

    return Response(result if user.role != 'collector' else result[0])

# ============================
# CHAT SYSTEM
# ============================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def chat_history(request):
    customer = get_object_or_404(Customer, user=request.user)
    if not customer.collector:
        return Response([])

    messages = ChatMessage.objects.filter(
        Q(sender=request.user, receiver=customer.collector) |
        Q(sender=customer.collector, receiver=request.user)
    ).order_by('timestamp')

    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_customers(request):
    customers = Customer.objects.all()[:10]
    serializer = CustomerListSerializer(customers, many=True)
    return Response(serializer.data)

class ServiceRequestViewSet(viewsets.ModelViewSet):
    """
    Advanced ServiceRequest API — Vision 2026
    - Public: create requests
    - Staff: manage in their area
    - Admin/CEO: full control
    """
    queryset = ServiceRequest.objects.select_related(
        'customer', 'village__cell__sector', 'assigned_to'
    ).order_by('-created_at')
    serializer_class = ServiceRequestSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]  # Public create
        return [IsAuthenticated(), ServiceRequestPermission()]

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        if user.is_authenticated:
            if user.role in ['admin', 'ceo']:
                return qs
            elif user.role == 'manager':
                return qs.filter(village__cell__sector__in=user.managed_sectors.all())
            elif user.role == 'supervisor':
                return qs.filter(village__cell__sector__in=user.supervised_sectors.all())
            elif user.role == 'collector':
                return qs.filter(village__collectors=user)
        return qs.none()  # Public sees nothing in list

    @action(detail=True, methods=['post'])
    def quote(self, request, pk=None):
        instance = self.get_object()
        amount = request.data.get('quoted_amount')
        if not amount:
            return Response({"error": "quoted_amount required"}, status=400)
        instance.quoted_amount = amount
        instance.status = 'quoted'
        instance.save()
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'accepted'
        instance.save()
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'in_progress'
        instance.save()
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        instance = self.get_object()
        final_amount = request.data.get('final_amount', instance.quoted_amount)
        instance.final_amount = final_amount
        instance.status = 'completed'
        instance.completed_at = timezone.now()
        instance.save()
        return Response(self.get_serializer(instance).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        instance = self.get_object()
        instance.status = 'cancelled'
        instance.save()
        return Response(self.get_serializer(instance).data)