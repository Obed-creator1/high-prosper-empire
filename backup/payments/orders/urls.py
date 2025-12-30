# orders/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("my/", views.my_orders, name="my-orders"),  # endpoint: /api/orders/my/
    path("all/", views.all_orders, name="all-orders"),
]
