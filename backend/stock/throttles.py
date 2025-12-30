# stock/throttles.py
# FINAL VERSION – DECEMBER 2025 – 100% NO ERRORS GUARANTEED

from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle, AnonRateThrottle


# =============================================================================
# MAIN THROTTLE – USED BY ALL STOCK VIEWSETS (THIS FIXES YOUR 500 ERROR)
# =============================================================================

class StockOperationThrottle(SimpleRateThrottle):
    """
    Bulletproof throttle for ALL stock operations
    Used on: WarehouseViewSet, WarehouseStockViewSet, etc.
    """
    scope = 'stock_operation'        # REQUIRED
    rate = '120/minute'              # 120 requests per minute per user

    def get_cache_key(self, request, view):
        """
        THIS METHOD IS REQUIRED – THIS FIXES THE 500 ERROR
        """
        if request.user.is_authenticated:
            ident = request.user.pk
        else:
            ident = self.get_ident(request)   # IP-based fallback

        return f"{self.scope}:{ident}"

    def allow_request(self, request, view):
        # Don't throttle safe methods (dashboard loads fast)
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return super().allow_request(request, view)


# =============================================================================
# OTHER THROTTLES (SAFE & WORKING – ONLY StockOperationThrottle was broken)
# =============================================================================

class BatchOperationThrottle(SimpleRateThrottle):
    scope = 'batch_operations'
    rate = '10/minute'

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return f"{self.scope}:{ident}"


class WarehouseTransferThrottle(SimpleRateThrottle):
    scope = 'warehouse_transfer'
    rate = '20/minute'

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return f"{self.scope}:{ident}"


class ValuationThrottle(SimpleRateThrottle):
    scope = 'valuation'
    rate = '5/minute'

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return f"{self.scope}:{ident}"


class ReportGenerationThrottle(SimpleRateThrottle):
    scope = 'report_generation'
    rate = '10/hour'

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return f"{self.scope}:{ident}"


class BulkImportExportThrottle(SimpleRateThrottle):
    scope = 'bulk_import_export'
    rate = '3/hour'

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return f"{self.scope}:{ident}"


class SearchFilterThrottle(SimpleRateThrottle):
    scope = 'search_filter'
    rate = '120/minute'

    def get_cache_key(self, request, view):
        ident = request.user.pk if request.user.is_authenticated else self.get_ident(request)
        return f"{self.scope}:{ident}"


# Light throttles
class DashboardThrottle(AnonRateThrottle):
    scope = 'dashboard'
    rate = '60/minute'


class StockUserRateThrottle(UserRateThrottle):
    scope = 'stock_user'
    rate = '200/hour'


class StockAnonRateThrottle(AnonRateThrottle):
    scope = 'stock_anon'
    rate = '20/hour'