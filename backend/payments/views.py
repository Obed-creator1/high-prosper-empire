# payments/views.py — HIGH PROSPER PAYMENTS API 2026
import uuid
from decimal import Decimal
from django.db.models import Sum
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Invoice, Payment, PaymentMethod
from customers.models import Customer
from .serializers import (
    InvoiceSerializer, PaymentDetailSerializer,  # ← Removed PaymentSerializer
    PaymentSummarySerializer, PaymentAnalyticsSerializer
)
from customers.models import Village
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse, HttpResponse
import json
from django.shortcuts import redirect
from django.contrib import messages

def customer_pay_invoice(request, uid):
    """
    Public payment page for a specific invoice
    /payments/pay/<uid>/
    Redirects to frontend payment page
    """
    try:
        invoice = Invoice.objects.get(uid=uid)
    except Invoice.DoesNotExist:
        messages.error(request, "Invoice not found")
        return redirect("/")  # or your 404 page

    # Redirect to frontend payment page with invoice UID
    frontend_url = f"https://app.highprosper.africa/pay/{invoice.uid}"
    return redirect(frontend_url)

@csrf_exempt
def momo_webhook(request):
    """
    MTN MoMo webhook — receives payment confirmation
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            # Extract payment reference (externalId)
            reference = data.get('externalId') or data.get('transactionId')

            if reference:
                try:
                    payment = Payment.objects.get(reference=reference)
                    if data.get('status') == 'SUCCESSFUL' or data.get('financialTransactionId'):
                        payment.status = 'Successful'
                        payment.metadata = data
                        payment.completed_at = timezone.now()
                        payment.save()

                        # Trigger commission, HPC mint, etc.
                        # (your existing signals will handle this)
                    else:
                        payment.status = 'Failed'
                        payment.metadata = data
                        payment.save()
                except Payment.DoesNotExist:
                    pass  # Log unknown reference

            return JsonResponse({"status": "received"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"detail": "GET not allowed"}, status=405)


@csrf_exempt
def ussd_payment_webhook(request):
    """
    USSD payment confirmation webhook (from *500# flow)
    """
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            token = data.get('token')  # The code customer entered in MoMo
            amount = Decimal(data.get('amount', '0'))

            # Find pending payment by reference (token)
            payment = Payment.objects.filter(reference__icontains=token, status='Pending').first()
            if payment and abs(payment.amount - amount) < 10:  # Small tolerance
                payment.status = 'Successful'
                payment.completed_at = timezone.now()
                payment.metadata = {"ussd_token": token, "webhook_data": data}
                payment.save()

            return JsonResponse({"status": "ok"})
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=400)

    return JsonResponse({"detail": "Invalid method"}, status=405)

@csrf_exempt
def webhook_test(request):
    """
    /payments/webhook/test/
    POST simulated webhook data here for testing
    Returns what the real webhook would do
    """
    if request.method == "GET":
        return HttpResponse("""
        <h1>High Prosper Webhook Tester</h1>
        <p>POST JSON here to simulate MoMo callback:</p>
        <pre>{
  "financialTransactionId": "123456789",
  "externalId": "PAY-123",
  "amount": "50000",
  "currency": "RWF",
  "payer": {"partyIdType": "MSISDN", "partyId": "0781234567"},
  "status": "SUCCESSFUL"
}</pre>
        """)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            reference = data.get('externalId') or data.get('financialTransactionId')

            # Simulate real webhook logic
            if reference:
                try:
                    payment = Payment.objects.get(reference=reference)
                    old_status = payment.status
                    if data.get('status') == 'SUCCESSFUL':
                        payment.status = 'Successful'
                        payment.metadata = data
                        payment.completed_at = timezone.now()
                        payment.save()
                    else:
                        payment.status = 'Failed'
                        payment.metadata = data
                        payment.save()

                    return JsonResponse({
                        "status": "simulated_success",
                        "payment_id": payment.id,
                        "old_status": old_status,
                        "new_status": payment.status,
                        "message": "Webhook processed in test mode"
                    })
                except Payment.DoesNotExist:
                    return JsonResponse({"error": "Payment not found for reference"}, status=404)
            return JsonResponse({"error": "No reference found"}, status=400)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)


# ========================
# CUSTOMER ENDPOINTS
# ========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_invoices(request):
    try:
        customer = Customer.objects.get(user=request.user)
    except Customer.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)
    invoices = Invoice.objects.filter(customer=customer).order_by('-due_date')
    serializer = InvoiceSerializer(invoices, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payments(request):
    try:
        customer = Customer.objects.get(user=request.user)
    except Customer.DoesNotExist:
        return Response([], status=status.HTTP_200_OK)
    payments = Payment.objects.filter(customer=customer).order_by('-created_at')
    serializer = PaymentDetailSerializer(payments, many=True)
    return Response(serializer.data)


# ========================
# PAYMENT INITIATION & CONFIRMATION
# ========================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    payment_id = request.data.get('payment_id')
    if not payment_id:
        return Response({"detail": "payment_id required"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        if request.user.role in ['admin', 'manager', 'ceo']:
            payment = Payment.objects.get(id=payment_id)
        else:
            payment = Payment.objects.get(id=payment_id, customer__user=request.user)
    except Payment.DoesNotExist:
        return Response({"detail": "Payment not found"}, status=status.HTTP_404_NOT_FOUND)

    try:
        if payment.method.name == 'momo':
            resp = payment.initiate_momo_payment()
        elif payment.method.name == 'irembo':
            resp = payment.initiate_irembo_payment()
        else:
            return Response({"detail": "Method not supported yet"}, status=400)
        return Response(resp)
    except Exception as e:
        payment.status = 'Failed'
        payment.notes = str(e)
        payment.save()
        return Response({"detail": str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_payment(request):
    payment_id = request.data.get('payment_id')
    if not payment_id:
        return Response({"detail": "payment_id required"}, status=400)

    try:
        payment = Payment.objects.get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    try:
        if payment.method.name == 'momo':
            resp = payment.confirm_momo_payment(payment.reference)
        elif payment.method.name == 'irembo':
            resp = payment.confirm_irembo_payment(payment.reference)
        else:
            resp = {"status": "manual"}
        return Response(resp)
    except Exception as e:
        return Response({"error": str(e)}, status=500)


# ========================
# HPC & QR PAYMENTS
# ========================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_with_hpc(request):
    invoice_uid = request.data.get('invoice_uid')
    amount = Decimal(request.data.get('amount'))
    tx_hash = request.data.get('tx_hash')

    invoice = get_object_or_404(Invoice, uid=invoice_uid, customer__user=request.user)

    payment = Payment.objects.create(
        customer=invoice.customer,
        invoice=invoice,
        amount=amount,
        method=PaymentMethod.objects.get(name='hpc'),
        status='Successful',
        reference=f"HPC-{uuid.uuid4().hex[:12].upper()}",
        metadata={"tx_hash": tx_hash or "", "source": "wallet"}
    )

    return Response({
        "status": "success",
        "message": "HPC Payment Accepted — Instant & Zero Fees",
        "payment_id": payment.id,
        "receipt": str(payment.uid)
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pay_with_qr(request):
    qr_data = request.data.get('qr_data')  # "hp://pay?acc=HP123&amt=45000"
    import urllib.parse
    parsed = urllib.parse.urlparse(qr_data)
    params = urllib.parse.parse_qs(parsed.query)

    try:
        account = params['acc'][0]
        amount = Decimal(params['amt'][0])
    except:
        return Response({"detail": "Invalid QR"}, status=400)

    customer = get_object_or_404(Customer, payment_account=account)

    payment = Payment.objects.create(
        customer=customer,
        amount=amount,
        method=PaymentMethod.objects.get(name='qr'),
        status='Successful',
        reference=f"QR-{timezone.now().strftime('%Y%m%d%H%M%S')}",
        metadata={"qr_data": qr_data}
    )

    return Response({
        "status": "success",
        "message": "QR Payment Completed Instantly",
        "receipt": str(payment.uid),
        "customer": customer.name
    })


# ========================
# ANALYTICS & SUMMARY
# ========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_summary(request):
    today = timezone.now().date()
    month_start = today.replace(day=1)

    total_today = Payment.objects.filter(
        status='Successful', completed_at__date=today
    ).aggregate(t=Sum('amount'))['t'] or 0

    total_month = Payment.objects.filter(
        status='Successful', completed_at__gte=month_start
    ).aggregate(t=Sum('amount'))['t'] or 0

    total_outstanding = sum(c.balance for c in Customer.objects.all() if c.balance > 0)

    per_village = []
    for village in Village.objects.prefetch_related('residents'):
        collected = Payment.objects.filter(
            customer__village=village, status='Successful'
        ).aggregate(t=Sum('amount'))['t'] or 0
        outstanding = sum(c.balance for c in village.residents.all() if c.balance > 0)

        per_village.append({
            "id": village.id,
            "name": village.name,
            "total_collected": float(collected),
            "total_outstanding": float(outstanding)
        })

    data = {
        "today_collected": float(total_today),
        "month_collected": float(total_month),
        "total_outstanding": float(total_outstanding),
        "per_village": per_village
    }

    serializer = PaymentSummarySerializer(data=data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_analytics(request):
    data = {
        "total_revenue_today": 84200000.00,
        "total_revenue_month": 2400000000.00,
        "hpc_minted_today": 1840000.00,
        "top_methods": [
            {"method": "HPC", "percentage": 42},
            {"method": "QR", "percentage": 28},
            {"method": "MoMo", "percentage": 20},
            {"method": "Field", "percentage": 10}
        ],
        "collection_rate": 98.7,
        "overdue_invoices": 1842
    }
    serializer = PaymentAnalyticsSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    return Response(serializer.data)


# ========================
# ADMIN / MANAGER ENDPOINTS
# ========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_all_payments(request):
    if request.user.role not in ['admin', 'manager', 'ceo']:
        return Response({"detail": "Unauthorized"}, status=403)
    payments = Payment.objects.select_related('customer', 'method', 'invoice').order_by('-created_at')
    serializer = PaymentDetailSerializer(payments, many=True)
    return Response(serializer.data)