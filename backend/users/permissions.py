# backend/users/permissions.py
from rest_framework.permissions import BasePermission, IsAuthenticated

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