# customers/views.py — HIGH PROSPER PROFESSIONAL API 2026
import json
import secrets
import random
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Sum, Count, Q
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
from .models import Customer, Village, ServiceOrder, Complaint
from .serializers import (
    CustomerSerializer, CustomerListSerializer,
    VillageSerializer, ServiceOrderSerializer,
    ComplaintSerializer, ChatMessageSerializer
)
from users.models import CustomUser, ChatMessage
from payments.models import Invoice, Payment
from payments.serializers import InvoiceSerializer, PaymentDetailSerializer
from hr.services import MTNSMSService
from .permissions import IsAdminOrCollectorOrOwner

User = get_user_model()

ALLOWED_ROLES = ['admin', 'ceo', 'manager', 'collector']



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


class VillageViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Village.objects.select_related('cell__sector', 'collector')
    serializer_class = VillageSerializer
    permission_classes = [IsAuthenticated]


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