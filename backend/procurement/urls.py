# backend/procurement/api/urls.py  (Final)
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import *

router = DefaultRouter()
router.register(r'items', ItemViewSet, basename='item')
router.register(r'categories', ItemCategoryViewSet, basename='category')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'pr', PurchaseRequisitionViewSet, basename='pr')
router.register(r'rfq', RFQViewSet, basename='rfq')
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'po', PurchaseOrderViewSet, basename='po')
router.register(r'grn', GoodsReceiptViewSet, basename='grn')
router.register(r'grn-items', GoodsReceiptItemViewSet, basename='grnitem')
router.register(r'invoices', SupplierInvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', include(router.urls)),
    path('api-auth/', include('rest_framework.urls')),  # Login in browsable API
    path('po/<int:po_id>/email/', email_po_to_supplier, name='email-po'),
]