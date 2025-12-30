# backend/tenants/middleware.py
from django.utils.deprecation import MiddlewareMixin
from .models import Company

class TenantMiddleware(MiddlewareMixin):
    def process_request(self, request):
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            request.company = None
            return

        if request.user.is_global_admin:
            # Global admins can switch via header or query
            company_slug = request.META.get('HTTP_X_COMPANY') or request.GET.get('company')
            if company_slug:
                request.company = Company.objects.filter(slug=company_slug, is_active=True).first()
            else:
                request.company = None
        else:
            request.company = request.user.company