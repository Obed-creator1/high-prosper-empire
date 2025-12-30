# stock/permissions.py - CREATE THIS FILE IF IT DOESN'T EXIST

from rest_framework.permissions import BasePermission
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

class IsStockManagerOrReadOnly(BasePermission):
    """
    Custom permission to allow:
    - Stock managers full access (GET, POST, PUT, DELETE)
    - Read-only access for authenticated users (GET only)
    """

    def has_permission(self, request, view):
        # Allow GET requests for authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user.is_authenticated

        # Require stock manager role for other methods
        return self.has_stock_manager_role(request.user)

    def has_object_permission(self, request, view, obj):
        # Allow GET for authenticated users
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return request.user.is_authenticated

        # Require stock manager for other operations
        return self.has_stock_manager_role(request.user)

    def has_stock_manager_role(self, user):
        """Check if user has stock manager role"""
        if not user.is_authenticated:
            return False

        # Method 1: Check Django Group
        if user.groups.filter(name__in=['stock_manager', 'inventory_manager', 'warehouse_manager']).exists():
            return True

        # Method 2: Check user role field (if you have one)
        try:
            # Assuming you have a UserProfile model with role field
            from Users.models import UserProfile
            return user.userprofile.role in ['stock_manager', 'inventory_manager', 'warehouse_manager']
        except:
            pass

        # Method 3: Check custom permissions
        stock_ct = ContentType.objects.get_for_model('stock.Stock')
        permissions = Permission.objects.filter(
            content_type=stock_ct,
            codename__in=['add_stock', 'change_stock', 'delete_stock']
        )

        return user.has_perms(permissions)