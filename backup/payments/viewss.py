from datetime import timedelta

from django.shortcuts import render
from django.utils import timezone

from django.db.models import Sum
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.parsers import JSONParser
from .models import Payment
from .serializers import PaymentSerializer
from .momo import request_payment
from customers.models import Customer
import uuid

from users.models import CustomUser


class PaymentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing payments.
    """
    queryset = Payment.objects.all().order_by('-timestamp')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["post"])
    def momo_pay(self, request):
        """
        Request a MoMo payment for a customer.
        """
        customer_id = request.data.get("customer_id")
        phone = request.data.get("phone_number")
        amount = request.data.get("amount")

        if not all([customer_id, phone, amount]):
            return Response(
                {"detail": "customer_id, phone_number and amount are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            external_id = str(uuid.uuid4())
            response = request_payment(phone, amount, external_id)
            return Response({
                "detail": "Payment requested",
                "response": response
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=["get"])
    def invoices(self, request):
        """
        Returns all payments (invoices), optionally filtered by customer.
        """
        customer_id = request.query_params.get("customer_id")
        payments = self.queryset
        if customer_id:
            payments = payments.filter(customer_id=customer_id)

        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)

class InvoiceViewSet(viewsets.ViewSet):
    """
    A dedicated ViewSet to list invoices/payments with summaries.
    """
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """
        Return all payments (invoices) with optional filtering by customer or date range.
        """
        payments = Payment.objects.all().order_by('-timestamp')

        customer_id = request.query_params.get("customer_id")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")

        if customer_id:
            payments = payments.filter(customer_id=customer_id)
        if start_date:
            payments = payments.filter(timestamp__date__gte=start_date)
        if end_date:
            payments = payments.filter(timestamp__date__lte=end_date)

        serializer = PaymentSerializer(payments, many=True)
        total_amount = payments.aggregate(total=Sum('amount'))['total'] or 0

        return Response({
            "total_payments": payments.count(),
            "total_amount": total_amount,
            "invoices": serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=["get"])
    def recent(self, request):
        """
        Returns payments from the last 7 days.
        """
        seven_days_ago = timezone.now() - timezone.timedelta(days=7)
        recent_payments = Payment.objects.filter(timestamp__gte=seven_days_ago).order_by('-timestamp')
        serializer = PaymentSerializer(recent_payments, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def momo_webhook(request):
    """
    MTN MoMo webhook to confirm payment status.
    """
    data = JSONParser().parse(request)
    status_str = data.get("status")
    external_id = data.get("externalId")
    amount = data.get("amount")
    phone = data.get("payer", {}).get("partyId")

    if status_str == "SUCCESSFUL":
        try:
            customer = Customer.objects.get(contact_no=phone)
            Payment.objects.create(
                customer=customer,
                collector=None,
                amount=float(amount),
                method="momo",
                reference=external_id,
            )
        except Customer.DoesNotExist:
            # Optionally log this event
            pass

    return Response({"detail": "Received"}, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def collector_recent_payments(request):
    collector = request.user
    payments = Payment.objects.filter(collector=collector).order_by("-timestamp")[:10]
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def collector_trends(request):
    today = timezone.now().date()
    last_week = today - timedelta(days=6)
    payments = (
        Payment.objects.filter(collector=request.user, timestamp__date__gte=last_week)
        .extra(select={'date': "date(timestamp)"})
        .values("date")
        .annotate(total=Sum("amount"))
        .order_by("date")
    )
    # Format to consistent 7-day range
    data = []
    for i in range(7):
        day = last_week + timedelta(days=i)
        total = next((p["total"] for p in payments if p["date"] == str(day)), 0)
        data.append({"date": day.strftime("%a"), "total": float(total or 0)})
    return Response(data)



