# backend/users/permissions.py
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework import permissions

class IsAdminOrManagerOrCEO(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['admin', 'ceo', 'manager']

class IsAdminOrHR(BasePermission):
    """
    Allows access only to Admin users or users with HR role (via staff_profile)
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False

        # Super admin always has access
        if request.user.is_superuser:
            return True

        # HR staff (has staff_profile and department includes HR or is HR manager)
        if hasattr(request.user, 'staff_profile'):
            staff = request.user.staff_profile
            return staff.status == 'Active' and staff.department.lower() in ['hr', 'human resources', 'administration']

        return False


class IsOwnerOrAdmin(BasePermission):
    """
    Allows users to only access their own data unless they are admin
    """
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        # For objects that have a 'staff' or 'user' field
        if hasattr(obj, 'staff'):
            return obj.staff.user == request.user
        if hasattr(obj, 'user'):
            return obj.user == request.user
        return False


class IsStaffMember(BasePermission):
    """Allow only users who have a Staff profile"""
    def has_permission(self, request, view):
        return hasattr(request.user, 'staff_profile')

class IsAdminOrCEO(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['admin', 'ceo']

class IsManagerOrSupervisorOrCollector(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ['manager', 'supervisor', 'collector']

class ServiceRequestPermission(permissions.BasePermission):
    """
    Custom permission for ServiceRequest:
    - Public: create only
    - Collector/Supervisor/Manager: view & manage in their village/sector
    - Admin/CEO: full access
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True  # Allow list/retrieve for all authenticated
        if request.method == 'POST':
            return True  # Public create allowed
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role in ['admin', 'ceo']:
            return True

        if user.role in ['manager', 'supervisor']:
            if obj.village:
                sector = obj.village.cell.sector
                return user.managed_sectors.filter(id=sector.id).exists() or \
                    user.supervised_sectors.filter(id=sector.id).exists()

        if user.role == 'collector':
            if obj.village:
                return obj.village.collectors.filter(id=user.id).exists()

        return False