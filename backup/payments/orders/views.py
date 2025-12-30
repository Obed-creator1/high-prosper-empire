# orders/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from customers.models import Customer, Order
from .serializers import OrderSerializer

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_orders(request):
    try:
        customer = Customer.objects.get(user=request.user)
    except Customer.DoesNotExist:
        return Response([], status=200)

    orders = Order.objects.filter(customer=customer).order_by("-created_at")
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)

# orders/views.py
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def all_orders(request):
    if not request.user.role in ["admin", "manager"]:
        return Response({"detail": "Unauthorized"}, status=403)
    orders = Order.objects.all().order_by("-created_at")
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)
