from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from datetime import timedelta
from .models import Customer, Village, Order, Complaint
from users.models import CustomUser, ChatMessage
from payments.models import Invoice, Payment
from .serializers import (
    CustomerSerializer,
    InvoiceSerializer,
    PaymentSerializer,
    OrderSerializer,
    ComplaintSerializer,
    ChatMessageSerializer,
    VillageSerializer,
)


# ----------------------------
# VILLAGES
# ----------------------------
class VillageViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Returns all registered villages with nested cell, sector, and collector info
    """
    queryset = Village.objects.select_related("cell__sector", "collector").all()
    serializer_class = VillageSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def villages_list(request):
    """
    Returns all villages (used by frontend dropdown)
    """
    villages = Village.objects.select_related("cell__sector", "collector").all()
    data = [
        {
            "id": v.id,
            "name": v.name,
            "cell_name": v.cell.name if v.cell else None,
            "sector_name": v.cell.sector.name if v.cell and v.cell.sector else None,
            "collector_name": v.collector.username if v.collector else None,
        }
        for v in villages
    ]
    return Response(data, status=200)


# ----------------------------
# CUSTOMER VIEWSET
# ----------------------------
class CustomerViewSet(viewsets.ModelViewSet):
    """
    Customer management viewset with full role-based access control.
    """
    queryset = Customer.objects.all()

    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "email", "phone", "payment_account"]

    def get_queryset(self):
        """
        Return customers based on the authenticated user's role.
        """
        user = self.request.user
        role = getattr(user, "role", None)

        if user.is_superuser or role in ["admin", "manager", "ceo"]:
            # Admins & Managers see all
            return Customer.objects.select_related(
                "village__cell__sector", "village__collector__username", "user"
            ).order_by("name")

        elif role == "collector":
            # Collectors see customers in their assigned villages
            return Customer.objects.filter(village__collector=user).select_related(
                "village__cell__sector", "village__collector", "user"
            )

        elif role == "customer":
            # Customers see only themselves
            return Customer.objects.filter(user=user).select_related(
                "village__cell__sector", "village__collector", "user"
            )

        # Default: no access
        return Customer.objects.none()

    def perform_create(self, serializer):
        """
        Automatically assign the logged-in user to the created customer if not provided.
        Ensures no duplicate user-customer relations.
        """
        user = self.request.user

        # Prevent duplicate customers for the same user
        if hasattr(user, "customer") and user.customer:
            raise ValueError("This user already has a customer profile.")

        serializer.save(user=user)

    def get_serializer_context(self):
        """
        Pass request into serializer for extra context (user access, etc.)
        """
        context = super().get_serializer_context()
        context.update({"request": self.request})
        return context

    # ----------------------------
    # List Villages for Frontend
    # ----------------------------
    @action(detail=False, methods=["get"], url_path="villages")
    def list_villages(self, request):
        """
        Returns all villages with related cell, sector, and collector info.
        Used in customer forms.
        """
        villages = Village.objects.select_related("cell__sector", "collector").all()
        serializer = VillageSerializer(villages, many=True)
        return Response(serializer.data)

    # ----------------------------
    # Current Logged-in Customer Profile
    # ----------------------------
    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """
        Returns detailed customer info for the logged-in user.
        """
        customer = Customer.objects.filter(user=request.user).select_related(
            "village__cell__sector", "village__collector", "user"
        ).first()

        if not customer:
            return Response(
                {"detail": "Customer profile not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(customer)
        return Response(serializer.data)

    # ----------------------------
    # Optional: Quick Search API
    # ----------------------------
    @action(detail=False, methods=["get"], url_path="search")
    def search(self, request):
        """
        /api/customers/search/?q=<query>
        Search customers by name, email, or phone.
        """
        q = request.GET.get("q", "").strip()
        if not q:
            return Response([], status=200)

        queryset = self.get_queryset().filter(
            Q(name__icontains=q) |
            Q(email__icontains=q) |
            Q(phone__icontains=q)
        )[:20]

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# ----------------------------
# CUSTOMER DATA ENDPOINTS
# ----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_stats(request):
    """
    /api/customers/stats/
    Complete analytics endpoint for admin & collector dashboards.

    Returns:
    - Customer summary (counts, ratios, totals)
    - Top 5 villages (by outstanding)
    - Top 5 collectors (by customer count/outstanding)
    - Trend data (daily & monthly new customers)
    """
    user = request.user
    role = getattr(user, "role", None)
    today = timezone.now().date()
    start_of_month = today.replace(day=1)
    start_of_30days = today - timedelta(days=30)
    start_of_year = today.replace(month=1, day=1)

    # ----------------------------
    # Role-based Filtering
    # ----------------------------
    if user.is_superuser or role in ["admin", "manager", "ceo"]:
        customer_qs = Customer.objects.all()
        village_qs = Village.objects.all()
    elif role == "collector":
        customer_qs = Customer.objects.filter(village__collector=user)
        village_qs = Village.objects.filter(collector=user)
    elif role == "customer":
        customer_qs = Customer.objects.filter(user=user)
        village_qs = Village.objects.none()
    else:
        return Response({"detail": "Unauthorized"}, status=403)

    # ----------------------------
    # Summary Statistics
    # ----------------------------
    total = customer_qs.count()
    active = customer_qs.filter(status="Active").count()
    passive = customer_qs.filter(status="Passive").count()
    total_outstanding = customer_qs.aggregate(total=Coalesce(Sum("outstanding"), 0))["total"]
    total_monthly_fees = customer_qs.aggregate(total=Coalesce(Sum("monthly_fee"), 0))["total"]
    new_customers_month = customer_qs.filter(created_at__gte=start_of_month).count()

    active_ratio = round((active / total * 100), 2) if total else 0
    passive_ratio = round((passive / total * 100), 2) if total else 0

    # ----------------------------
    # Top 5 Villages by Outstanding
    # ----------------------------
    top_villages = (
        village_qs.annotate(
            total_customers=Count("customers"),
            total_outstanding=Coalesce(Sum("customers__outstanding"), 0),
            total_monthly=Coalesce(Sum("customers__monthly_fee"), 0),
        )
        .filter(total_customers__gt=0)
        .order_by("-total_outstanding")[:5]
        .values(
            "id",
            "name",
            "total_customers",
            "total_outstanding",
            "total_monthly",
            collector_name=F("collector__username"),
        )
    )

    # ----------------------------
    # Top 5 Collectors by Performance
    # ----------------------------
    collector_qs = (
        CustomUser.objects.filter(role="collector")
        .annotate(
            total_customers=Count("villages__customers", distinct=True),
            total_outstanding=Coalesce(Sum("villages__customers__outstanding"), 0),
            total_monthly=Coalesce(Sum("villages__customers__monthly_fee"), 0),
        )
        .filter(total_customers__gt=0)
        .order_by("-total_customers")[:5]
        .values("id", "username", "total_customers", "total_outstanding", "total_monthly")
    )

    # ----------------------------
    # Daily Trend (last 30 days)
    # ----------------------------
    daily_trend = (
        customer_qs.filter(created_at__gte=start_of_30days)
        .annotate(day=TruncDate("created_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("day")
    )
    # Fill missing days
    daily_data = []
    for i in range(30):
        day = today - timedelta(days=i)
        day_entry = next((x for x in daily_trend if x["day"] == day), None)
        daily_data.append({
            "date": day.isoformat(),
            "new_customers": day_entry["count"] if day_entry else 0
        })
    daily_data.reverse()

    # ----------------------------
    # Monthly Trend (last 12 months)
    # ----------------------------
    monthly_trend = (
        customer_qs.filter(created_at__gte=start_of_year)
        .annotate(month=TruncMonth("created_at"))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
    )

    # Fill missing months
    monthly_data = []
    for i in range(12):
        month = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        month_entry = next((x for x in monthly_trend if x["month"] == month), None)
        monthly_data.append({
            "month": month.strftime("%Y-%m"),
            "new_customers": month_entry["count"] if month_entry else 0
        })
    monthly_data.reverse()

    # ----------------------------
    # Final Response Payload
    # ----------------------------
    data = {
        "summary": {
            "totalCustomers": total,
            "active": active,
            "passive": passive,
            "activeRatio": active_ratio,
            "passiveRatio": passive_ratio,
            "totalOutstanding": float(total_outstanding),
            "totalMonthlyFees": float(total_monthly_fees),
            "newCustomersThisMonth": new_customers_month,
        },
        "topVillages": list(top_villages),
        "topCollectors": list(collector_qs),
        "trends": {
            "daily": daily_data,
            "monthly": monthly_data
        }
    }

    return Response(data, status=200)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def customer_search(request):
    q = request.GET.get("q", "").strip()
    if not q:
        return Response([], status=200)

    customers = Customer.objects.filter(
        Q(name__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q)
    )[:20]
    serializer = CustomerSerializer(customers, many=True)
    return Response(serializer.data, status=200)


# ----------------------------
# MY DATA (customer dashboard)
# ----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_invoices(request):
    customer = Customer.objects.filter(user=request.user).first()
    if not customer:
        return Response([], status=200)
    invoices = Invoice.objects.filter(customer=customer).order_by("due_date")
    serializer = InvoiceSerializer(invoices, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_payments(request):
    customer = Customer.objects.filter(user=request.user).first()
    if not customer:
        return Response([], status=200)
    payments = Payment.objects.filter(customer=customer).order_by("-created_at")[:50]
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_orders(request):
    customer = Customer.objects.filter(user=request.user).first()
    if not customer:
        return Response([], status=200)
    orders = Order.objects.filter(customer=customer).order_by("-created_at")
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_complaints(request):
    customer = Customer.objects.filter(user=request.user).first()
    if not customer:
        return Response([], status=200)
    complaints = Complaint.objects.filter(customer=customer).order_by("-created_at")
    serializer = ComplaintSerializer(complaints, many=True)
    return Response(serializer.data)


# ----------------------------
# CHAT ENDPOINTS
# ----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def chat(request):
    customer = Customer.objects.filter(user=request.user).first()
    if not customer or not customer.collector:
        return Response([], status=200)

    collector = customer.collector
    messages = ChatMessage.objects.filter(
        Q(sender=request.user, receiver=collector) | Q(sender=collector, receiver=request.user)
    ).order_by("timestamp")
    serializer = ChatMessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def chat_send(request):
    customer = Customer.objects.filter(user=request.user).first()
    if not customer or not customer.collector:
        return Response({"detail": "No collector assigned"}, status=400)

    message_text = request.data.get("message")
    if not message_text:
        return Response({"detail": "Message is required"}, status=400)

    collector = customer.collector
    message = ChatMessage.objects.create(
        sender=request.user,
        receiver=collector,
        room=f"{request.user.id}_{collector.id}",
        message=message_text,
    )
    serializer = ChatMessageSerializer(message)
    return Response(serializer.data, status=201)


# ----------------------------
# COMPLAINTS
# ----------------------------
class ComplaintViewSet(viewsets.ModelViewSet):
    serializer_class = ComplaintSerializer
    queryset = Complaint.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "customer":
            return self.queryset.filter(customer__user=user)
        return self.queryset


# ----------------------------
# COLLECTOR SUMMARY
# ----------------------------
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def collector_summary(request):
    user = request.user
    today = timezone.now().date()
    first_of_month = today.replace(day=1)

    if user.role not in ["admin", "ceo", "manager", "collector"]:
        return Response({"detail": "Permission denied."}, status=403)

    collectors = (
        CustomUser.objects.filter(id=user.id)
        if user.role == "collector"
        else CustomUser.objects.filter(role="collector")
    )

    data = []

    for collector in collectors:
        villages = Village.objects.filter(collector=collector).prefetch_related(
            "customers__order_set"
        ).annotate(
            total_customers=Count("customers"),
            active_customers=Count("customers", filter=Q(customers__status="Active")),
            total_outstanding=Coalesce(Sum("customers__outstanding"), 0),
            monthly_fee_total=Coalesce(Sum("customers__monthly_fee"), 0),
            new_customers_today=Count("customers", filter=Q(customers__created_at__date=today)),
            new_customers_month=Count("customers", filter=Q(customers__created_at__date__gte=first_of_month)),
        )

        collector_totals = {
            "total_villages": villages.count(),
            "total_customers": 0,
            "total_outstanding": 0,
            "total_monthly_fee": 0,
            "new_customers_today": 0,
            "new_customers_month": 0,
            "total_paid_today": 0,
            "total_paid_month": 0,
            "total_outstanding_paid": 0,
        }

        village_stats = []
        for village in villages:
            orders = Order.objects.filter(customer__village=village)
            paid_today = orders.filter(status="Paid", created_at__date=today).aggregate(total=Coalesce(Sum("amount"), 0))["total"]
            paid_month = orders.filter(status="Paid", created_at__date__gte=first_of_month).aggregate(total=Coalesce(Sum("amount"), 0))["total"]
            outstanding_paid = orders.filter(status="Paid").aggregate(total=Coalesce(Sum("amount"), 0))["total"]

            village_stats.append({
                "village_id": village.id,
                "village_name": village.name,
                "total_customers": village.total_customers,
                "active_customers": village.active_customers,
                "total_outstanding": float(village.total_outstanding),
                "monthly_fee_total": float(village.monthly_fee_total),
                "new_customers_today": village.new_customers_today,
                "new_customers_month": village.new_customers_month,
                "paid_today": float(paid_today),
                "paid_month": float(paid_month),
                "outstanding_paid": float(outstanding_paid),
            })

            for key in ["total_customers", "total_outstanding", "total_monthly_fee", "new_customers_today", "new_customers_month"]:
                collector_totals[key] += getattr(village, key)
            collector_totals["total_paid_today"] += float(paid_today)
            collector_totals["total_paid_month"] += float(paid_month)
            collector_totals["total_outstanding_paid"] += float(outstanding_paid)

        data.append({
            "collector_id": collector.id,
            "collector_name": collector.username,
            **collector_totals,
            "villages": village_stats,
        })

    return Response(data, status=200)
