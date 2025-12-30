from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from customers.models import Customer
from payments.models import Payment, Invoice  # optional, if you have payment models

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def summary(request):
    """
    Returns a summary of dashboard metrics based on authenticated user.
    Metrics include:
    - Total customers
    - Total staff (excluding customers)
    - Total vehicles
    - Pending payments
    - Total invoices
    """
    User = get_user_model()
    user = request.user

    # Basic metrics
    customers_count = Customer.objects.count()
    staff_count = User.objects.exclude(role="customer").count()
    vehicles_count = 40  # replace with actual Vehicle model count if exists

    # Optional: metrics for payments/invoices
    payments_count = Payment.objects.filter(status="pending").count() if 'Payment' in globals() else 0
    invoices_count = Invoice.objects.count() if 'Invoice' in globals() else 0

    # Role-based data
    role_based_data = {}
    if user.role == "collector":
        # Example: only show assigned customers or payments
        role_based_data["assigned_customers"] = Customer.objects.filter(collector=user).count()
        role_based_data["pending_payments"] = Payment.objects.filter(collector=user, status="pending").count()
    elif user.role == "admin" or user.role == "ceo":
        # Admin/CEO sees full metrics
        role_based_data["all_customers"] = customers_count
        role_based_data["all_staff"] = staff_count
        role_based_data["all_vehicles"] = vehicles_count

    data = {
        "customers": customers_count,
        "staff": staff_count,
        "vehicles": vehicles_count,
        "pending_payments": payments_count,
        "total_invoices": invoices_count,
        "role_based_data": role_based_data,
    }

    return Response(data)
