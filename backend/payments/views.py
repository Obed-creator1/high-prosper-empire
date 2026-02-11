# payments/views.py — HIGH PROSPER PAYMENTS & WEBHOOKS 2027
import json
import logging
import uuid
from decimal import Decimal

from django.db.models import Sum
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from customers.models import Customer, ServiceRequest, Village
from .models import Payment, Invoice, PaymentMethod
from .momo import MTNMoMoAPI  # If you have the class

from .serializers import PaymentDetailSerializer, PaymentAnalyticsSerializer, PaymentSummarySerializer, \
    InvoiceSerializer

logger = logging.getLogger(__name__)

# ========================
# MTN MOMO WEBHOOK
# ========================
@csrf_exempt
def momo_webhook(request):
    """
    MTN MoMo Collection Callback Webhook
    Handles payment status updates from MTN
    """
    if request.method != 'POST':
        return HttpResponse(status=405)

    try:
        # Get reference from header
        reference_id = request.headers.get('X-Reference-Id')
        if not reference_id:
            logger.warning("MoMo webhook: Missing X-Reference-Id header")
            return HttpResponse("Missing reference", status=400)

        # Parse payload
        try:
            payload = json.loads(request.body)
        except json.JSONDecodeError:
            logger.error("MoMo webhook: Invalid JSON")
            return HttpResponse("Invalid JSON", status=400)

        financial_tx_id = payload.get('financialTransactionId')
        status_momo = payload.get('status')
        amount = payload.get('amount')
        currency = payload.get('currency')

        logger.info(f"MoMo webhook received: ref={reference_id}, status={status_momo}, amount={amount}")

        # Find payment by reference
        try:
            payment = Payment.objects.get(reference=reference_id)
        except Payment.DoesNotExist:
            logger.warning(f"MoMo webhook: Payment not found for ref {reference_id}")
            return HttpResponse("Payment not found", status=404)

        # Update payment status
        old_status = payment.status

        if status_momo == 'SUCCESSFUL':
            payment.status = 'Successful'
            payment.completed_at = timezone.now()
            payment.metadata = {
                "momo_financial_id": financial_tx_id,
                "momo_status": status_momo,
                "webhook_payload": payload
            }
            payment.save()

            # Auto-approve linked service request
            if payment.service_request:
                sr = payment.service_request
                remaining = sr.balance_due - Decimal(amount or 0)
                sr.payment_status = 'paid' if remaining <= 0 else 'partially_paid'
                sr.save()
                logger.info(f"Service request {sr.id} updated to {sr.payment_status}")

            logger.info(f"Payment {payment.id} marked SUCCESSFUL via MoMo webhook")
        else:
            payment.status = 'Failed'
            payment.metadata = {"momo_error": payload}
            payment.save()
            logger.warning(f"Payment {payment.id} failed: {status_momo}")

        return HttpResponse("OK", status=200)

    except Exception as e:
        logger.error(f"MoMo webhook critical error: {str(e)}", exc_info=True)
        return HttpResponse("Server error", status=500)


# ========================
# USSD PAYMENT WEBHOOK (SIMULATED)
# ========================
@csrf_exempt
def ussd_payment_webhook(request):
    """
    Simulated webhook for USSD-initiated payments
    In real integration, this would come from MoMo after *182*7*1# entry
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body)
        token = data.get('token')
        amount_str = data.get('amount', '0')

        if not token:
            return JsonResponse({"error": "token required"}, status=400)

        try:
            amount = Decimal(amount_str)
        except:
            return JsonResponse({"error": "invalid amount"}, status=400)

        # Find pending payment with matching token in reference
        payment = Payment.objects.filter(
            reference__icontains=token,
            status='Pending'
        ).first()

        if not payment:
            return JsonResponse({"error": "No pending payment with this token"}, status=404)

        # Validate amount (with tolerance)
        if abs(payment.amount - amount) > Decimal('10'):
            return JsonResponse({"error": "Amount mismatch"}, status=400)

        # Success!
        payment.status = 'Successful'
        payment.completed_at = timezone.now()
        payment.metadata = {
            "ussd_token": token,
            "ussd_webhook_data": data,
            "source": "ussd_momo"
        }
        payment.save()

        # Auto-approve service request
        if payment.service_request:
            sr = payment.service_request
            sr.payment_status = 'paid' if sr.balance_due <= 0 else 'partially_paid'
            sr.save()

        logger.info(f"USSD Payment confirmed: token={token}, payment={payment.id}")

        return JsonResponse({
            "status": "success",
            "message": "Payment confirmed",
            "payment_id": payment.id
        })

    except Exception as e:
        logger.error(f"USSD webhook error: {str(e)}")
        return JsonResponse({"error": "server error"}, status=500)


# ========================
# WEBHOOK TESTER
# ========================
@csrf_exempt
def webhook_test(request):
    """
    Test endpoint: /payments/webhook/test/
    Simulate MoMo callback for development
    """
    if request.method == "GET":
        return HttpResponse("""
        <h1>High Prosper Webhook Tester</h1>
        <p>POST JSON to simulate MoMo callback:</p>
        <pre>{
  "financialTransactionId": "2847293729",
  "externalId": "SUB-ABCD1234",
  "amount": "50000",
  "currency": "RWF",
  "status": "SUCCESSFUL",
  "payer": {"partyIdType": "MSISDN", "partyId": "0781234567"}
}</pre>
        <p>Headers required: X-Reference-Id: SUB-ABCD1234</p>
        """, content_type="text/html")

    if request.method == "POST":
        try:
            reference_id = request.headers.get('X-Reference-Id')
            if not reference_id:
                return JsonResponse({"error": "Missing X-Reference-Id header"}, status=400)

            payload = json.loads(request.body)
            status_momo = payload.get('status', 'FAILED')

            try:
                payment = Payment.objects.get(reference=reference_id)
                old_status = payment.status

                if status_momo == 'SUCCESSFUL':
                    payment.status = 'Successful'
                    payment.completed_at = timezone.now()
                else:
                    payment.status = 'Failed'

                payment.metadata = {"test_webhook": payload}
                payment.save()

                return JsonResponse({
                    "status": "test_success",
                    "payment_id": payment.id,
                    "old_status": old_status,
                    "new_status": payment.status,
                    "message": "Test webhook processed"
                })
            except Payment.DoesNotExist:
                return JsonResponse({"error": "Payment not found"}, status=404)

        except Exception as e:
            logger.error(f"Test webhook error: {e}")
            return JsonResponse({"error": str(e)}, status=500)


# ========================
# CUSTOMER ENDPOINTS
# ========================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_invoices(request):
    try:
        customer = Customer.objects.get(user=request.user)
        invoices = Invoice.objects.filter(customer=customer).order_by('-due_date')
        serializer = InvoiceSerializer(invoices, many=True)
        return Response(serializer.data)
    except Customer.DoesNotExist:
        return Response([], status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_payments(request):
    try:
        customer = Customer.objects.get(user=request.user)
        payments = Payment.objects.filter(customer=customer).order_by('-created_at')
        serializer = PaymentDetailSerializer(payments, many=True)
        return Response(serializer.data)
    except Customer.DoesNotExist:
        return Response([], status=200)


# ========================
# PAYMENT INITIATION
# ========================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_payment(request):
    payment_id = request.data.get('payment_id')
    if not payment_id:
        return Response({"detail": "payment_id required"}, status=400)

    try:
        payment = Payment.objects.get(id=payment_id)
        if request.user.role not in ['admin', 'ceo', 'manager'] and payment.customer.user != request.user:
            return Response({"detail": "Not authorized"}, status=403)
    except Payment.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    try:
        if payment.method.name == 'momo':
            momo = MTNMoMoAPI()
            result = momo.request_to_pay(
                phone=payment.customer.phone,
                amount=payment.amount,
                external_id=payment.reference,
                message=f"High Prosper Payment - {payment.reference}"
            )
            return Response(result)
        else:
            return Response({"detail": "Method not supported"}, status=400)
    except Exception as e:
        logger.error(f"Payment initiation error: {e}")
        return Response({"detail": "Initiation failed"}, status=500)


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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_all_payments(request):
    if request.user.role not in ['admin', 'ceo', 'manager']:
        return Response({"detail": "Unauthorized"}, status=403)
    payments = Payment.objects.select_related('customer', 'method').order_by('-created_at')
    serializer = PaymentDetailSerializer(payments, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def customer_pay_invoice(request, uid):
    """
    Customer initiates payment for a specific invoice
    URL: POST /payments/pay/invoice/<uuid:uid>/
    Body: {"method": "momo"}  # future: hpc, qr, etc.
    """
    try:
        # Validate UUID format
        uuid.UUID(str(uid))
    except ValueError:
        return Response({"detail": "Invalid invoice ID format"}, status=status.HTTP_400_BAD_REQUEST)

    # Get invoice and check ownership
    invoice = get_object_or_404(Invoice, uid=uid)

    # Authorization: customer must own the invoice
    if invoice.customer.user != request.user:
        return Response({"detail": "Not authorized to pay this invoice"}, status=status.HTTP_403_FORBIDDEN)

    # Prevent paying already paid invoices
    if invoice.status == 'Paid':
        return Response({"detail": "Invoice already paid"}, status=status.HTTP_400_BAD_REQUEST)

    # Get payment method from request (default to MoMo)
    method_name = request.data.get('method', 'momo').lower()

    try:
        payment_method = PaymentMethod.objects.get(name__iexact=method_name, is_active=True)
    except PaymentMethod.DoesNotExist:
        return Response({"detail": f"Payment method '{method_name}' not supported"}, status=status.HTTP_400_BAD_REQUEST)

    # Create pending payment record
    reference = f"INV-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

    payment = Payment.objects.create(
        customer=invoice.customer,
        invoice=invoice,
        amount=invoice.amount,
        method=payment_method,
        status='Pending',
        reference=reference,
        metadata={
            "initiated_by": "customer_portal",
            "invoice_uid": str(invoice.uid),
            "source": "web"
        }
    )

    # Initiate payment based on method
    try:
        if payment_method.name.lower() == 'momo':
            momo = MTNMoMoAPI()
            result = momo.request_to_pay(
                phone=invoice.customer.phone,
                amount=invoice.amount,
                external_id=reference,
                message=f"Payment for Invoice {invoice.invoice_number}"
            )

            if result['success']:
                payment.status = 'Initiated'
                payment.save(update_fields=['status'])
                logger.info(f"Customer {request.user} initiated MoMo payment for invoice {uid}")
                return Response({
                    "success": True,
                    "payment_id": payment.id,
                    "reference": reference,
                    "message": "Payment request sent to your phone. Please approve on MoMo.",
                    "momo_response": result
                })
            else:
                payment.status = 'Failed'
                payment.metadata.update({"momo_error": result})
                payment.save()
                return Response({
                    "detail": "Failed to initiate payment",
                    "error": result.get('error', 'Unknown MoMo error')
                }, status=status.HTTP_502_BAD_GATEWAY)

        else:
            # Future methods: HPC, QR, etc.
            return Response({
                "detail": f"Method {payment_method.name} not yet implemented"
            }, status=status.HTTP_501_NOT_IMPLEMENTED)

    except Exception as e:
        logger.error(f"Payment initiation failed for invoice {uid}: {str(e)}", exc_info=True)
        payment.status = 'Failed'
        payment.metadata.update({"error": str(e)})
        payment.save()
        return Response({
            "detail": "Payment initiation failed due to server error"
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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