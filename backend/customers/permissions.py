# customers/permissions.py — CUSTOM PERMISSIONS FOR CUSTOMER VIEWSET
from rest_framework import permissions

class IsAdminOrCollectorOrOwner(permissions.BasePermission):
    """
    Custom permission:
    - Admins, CEO, Managers: full access
    - Collectors: access only their assigned customers
    - Owners: access their own customer record
    """
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False

        role = getattr(user, 'role', None)

        # Full access for admin/ceo/manager
        if user.is_superuser or role in ['admin', 'ceo', 'manager']:
            return True

        # Collector: list is filtered in queryset
        if role == 'collector':
            return True

        # Customer: only their own record
        if role == 'customer':
            return True

        return False

    def has_object_permission(self, request, view, obj):
        user = request.user
        role = getattr(user, 'role', None)

        # Admins, CEO, Managers: full access
        if user.is_superuser or role in ['admin', 'ceo', 'manager']:
            return True

        # Collector: only customers in their villages
        if role == 'collector':
            return obj.village.collectors.filter(id=user.id).exists()

        # Customer: only their own record
        if role == 'customer':
            return obj.user == user

        return False