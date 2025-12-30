import os
import zipfile

from django.http import JsonResponse
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from .models import Invoice, Payment
from customers.models import Customer, Village, Order
from users.models import CustomUser
from .serializers import InvoiceSerializer, PaymentSerializer, PaymentSummarySerializer
from django.utils import timezone
from django.db.models import Sum
from rest_framework.permissions import IsAuthenticated


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def list_invoices(request):
    # Return invoices for customer's associated customer record
    try:
        customer = Customer.objects.get(user=request.user)
    except Customer.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)
    invoices = Invoice.objects.filter(customer=customer).order_by("due_date")
    serializer = InvoiceSerializer(invoices, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def my_payments(request):
    try:
        customer = Customer.objects.get(user=request.user)
    except Customer.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)
    payments = Payment.objects.filter(customer=customer).order_by("-created_at")[:50]
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def initiate_payment(request):
    """
    Initiate a payment.
    Accepts JSON: { "payment_id": 1 }
    Admins/managers can initiate for any payment.
    Customers can only initiate their own payments.
    """
    payment_id = request.data.get("payment_id")
    if not payment_id:
        return Response({"detail": "payment_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    user = request.user

    try:
        # Admin/manager can initiate any payment
        if user.role in ["admin", "manager"]:
            payment = Payment.objects.get(id=payment_id)
        else:
            # Customer can only initiate their own payment
            payment = Payment.objects.get(id=payment_id, customer__user=user)
    except Payment.DoesNotExist:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

    # initiate third-party flows
    try:
        if payment.method == "momo":
            resp = payment.initiate_momo_payment()
        elif payment.method == "irembo":
            resp = payment.initiate_irembo_payment()
        else:
            return Response({"detail": "Unsupported method"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        payment.status = "Failed"
        payment.notes = str(e)
        payment.save()
        return Response({"detail": "Failed to initiate payment", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(resp)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def confirm_payment(request):
    """
    Confirm a payment.
    Accepts JSON: { "payment_id": 1 }
    """
    payment_id = request.data.get("payment_id")
    if not payment_id:
        return Response({"detail": "payment_id is required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = Payment.objects.get(id=payment_id, customer__user=request.user)
    except Payment.DoesNotExist:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        if payment.method == "momo":
            resp = payment.confirm_momo_payment(payment.transaction_id)
        else:
            resp = payment.confirm_irembo_payment(payment.transaction_id)
        return Response(resp)
    except Exception as e:
        payment.status = "Failed"
        payment.notes = str(e)
        payment.save()
        return Response({"detail": "Failed to confirm payment", "error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def payment_summary(request):
    """
    /api/payments/summary/
    Returns total paid today, month, total outstanding, and per-village breakdown.
    """

    today = timezone.now().date()
    first_of_month = today.replace(day=1)

    # --- Payment aggregates ---
    total_paid_today = (
            Order.objects.filter(status="Paid", created_at__date=today)
            .aggregate(total=Sum("amount"))["total"]
            or 0
    )

    total_paid_month = (
            Order.objects.filter(status="Paid", created_at__date__gte=first_of_month)
            .aggregate(total=Sum("amount"))["total"]
            or 0
    )

    total_outstanding = (
            Customer.objects.aggregate(total=Sum("outstanding"))["total"] or 0
    )

    # --- Per-village summary ---
    per_village = []
    villages = Village.objects.prefetch_related("customers").all()

    for village in villages:
        paid_village = (
                Order.objects.filter(
                    customer__village=village, status="Paid"
                ).aggregate(total=Sum("amount"))["total"]
                or 0
        )

        outstanding_village = (
                Customer.objects.filter(village=village).aggregate(
                    total=Sum("outstanding")
                )["total"]
                or 0
        )

        per_village.append(
            {
                "id": village.id,
                "name": village.name,
                "total_collected": paid_village,
                "total_outstanding": outstanding_village,
            }
        )

    data = {
        "today_collected": total_paid_today,
        "month_collected": total_paid_month,
        "total_outstanding": total_outstanding,
        "per_village": per_village,
    }

    serializer = PaymentSummarySerializer(data=data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.data, status=200)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_payments(request):
    if not request.user.role in ["admin", "manager"]:
        return Response({"detail": "Unauthorized"}, status=403)
    payments = Payment.objects.all().order_by("-created_at")
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_invoices(request):
    try:
        customer = Customer.objects.get(user=request.user)
    except Customer.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)

    invoices = Invoice.objects.filter(customer=customer).order_by("due_date")
    serializer = InvoiceSerializer(invoices, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_monthly_invoices(request):
    from datetime import date
    import tempfile

    today = date.today()
    month_str = today.strftime("%B_%Y")
    invoices = []

    with tempfile.TemporaryDirectory() as tmpdir:
        zip_path = os.path.join(tmpdir, f"HPS_Invoices_{month_str}.zip")
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for customer in Customer.objects.filter(status="active"):
                # Generate or fetch invoice
                invoice, created = Invoice.objects.get_or_create(
                    customer=customer,
                    month=today.month,
                    year=today.year,
                    defaults={"amount": customer.monthly_fee or 5000}
                )
                pdf_path = invoice.generate_pdf()  # You already have this method
                zipf.write(pdf_path, f"{customer.name}_Invoice_{month_str}.pdf")

        # Upload ZIP to media or return URL
        with open(zip_path, "rb") as f:
            from django.core.files.base import ContentFile
            from django.core.files.storage import default_storage
            zip_url = default_storage.save(f"invoices/monthly_{month_str}.zip", ContentFile(f.read()))

        return JsonResponse({"zip_url": default_storage.url(zip_url)})

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def send_sms_reminders(request):
    from hr.services import MTNSMSService
    customer_ids = request.data.get("customer_ids", [])
    customers = Customer.objects.filter(id__in=customer_ids, phone__isnull=False)

    for customer in customers:
        message = f"Hello {customer.name}! Your monthly bill of {customer.monthly_fee or 5000} RWF is due. Pay now: https://yourdomain.com/pay/{customer.id}"
        MTNSMSService(phone_number=customer.phone, message=message)

    return Response({"sent_to": customers.count()})
