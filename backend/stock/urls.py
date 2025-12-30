"""
Enterprise Stock Management URL Configuration
Clean, versioned, no double-nesting, ready for /api/v1/stock/ mounting
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = "stock"

# ================================
# MAIN API ROUTER (ViewSets)
# ================================
router = DefaultRouter(trailing_slash=True)  # Cleaner URLs without trailing slash

# Core Entities
router.register(r'warehouses', views.WarehouseViewSet, basename='warehouse')
router.register(r'categories', views.CategoryViewSet, basename='category')
router.register(r'suppliers', views.SupplierViewSet, basename='supplier')
router.register(r'stock', views.StockViewSet, basename='stock')
router.register(r'warehousestock', views.WarehouseStockViewSet, basename='warehousestock')

# Transactions
router.register(r'transactions', views.StockTransactionViewSet, basename='stocktransaction')
router.register(r'warehousetransfer', views.WarehouseTransferViewSet, basename='warehousetransfer')
router.register(r'transferitems', views.TransferItemViewSet, basename='transferitem')

# Batch & Adjustments
router.register(r'batches', views.StockBatchViewSet, basename='batch')
router.register(r'inventory-adjustments', views.InventoryAdjustmentViewSet, basename='inventoryadjustment')

# Reports
router.register(r'stock-valuation', views.StockValuationViewSet, basename='stockvaluation')
router.register(r'inventory-reports', views.InventoryReportViewSet, basename='inventoryreport')


# ================================
# CORE API ENDPOINTS (Non-ViewSet)
# ================================
core_api_urls = [
    path('', include(router.urls)),

    # Dashboard & Stats
    path('dashboard_stats/', views.StockDashboardStatsView.as_view(), name='dashboard_stats'),
    path('warehouse-capacity/', views.WarehouseCapacityView.as_view(), name='warehouse_capacity'),
    path('stock-movement/', views.StockMovementReportView.as_view(), name='stock_movement'),

    # Bulk Operations
    path('batch-operations/', views.BatchOperationView.as_view(), name='batch_operations'),
    path('batch-operations/adjust/', views.BatchAdjustView.as_view(), name='batch_adjust'),
    path('batch-operations/transfer/', views.BatchTransferView.as_view(), name='batch_transfer'),
    path('batch-operations/reserve/', views.BatchReserveView.as_view(), name='batch_reserve'),

    # Import/Export
    path('import_stock/', views.ImportStockView.as_view(), name='import_stock'),
    path('export_stock/', views.ExportStockView.as_view(), name='export_stock'),
    path('export_stock/excel/', views.ExportStockExcelView.as_view(), name='export_stock_excel'),

    # Barcode
    path('barcode/scan_barcode/', views.BarcodeScanView.as_view(), name='scan_barcode'),
    path('barcode/quick_adjust/', views.BarcodeQuickAdjustView.as_view(), name='barcode_quick_adjust'),
    path('barcode/generate/', views.BarcodeGenerateView.as_view(), name='generate_barcode'),

    # Alerts & Reordering
    path('stock/reorder/', views.ReorderStockView.as_view(), name='reorder_stock'),
    path('stock/low_stock/', views.LowStockAlertView.as_view(), name='low_stock'),
    path('stock/critical_stock/', views.CriticalStockAlertView.as_view(), name='critical_stock'),

    # Warehouse Summary
    path('warehouse/stock_summary/', views.WarehouseStockSummaryView.as_view(), name='warehouse_stock_summary'),
    path('warehouse/transfer/create/', views.WarehouseTransferCreateView.as_view(), name='warehouse_transfer_create'),

    # Valuation Methods
    path('stock-valuation/calculate_valuation/', views.CalculateValuationView.as_view(), name='calculate_valuation'),
    path('stock-valuation/fifo/', views.FIFOValuationView.as_view(), name='fifo_valuation'),
    path('stock-valuation/lifo/', views.LIFOValuationView.as_view(), name='lifo_valuation'),
    path('stock-valuation/weighted_average/', views.WeightedAverageValuationView.as_view(), name='weighted_average_valuation'),
]


# ================================
# ADDITIONAL URL GROUPS
# ================================
report_urls = [
    path('reports/monthly/', views.MonthlyInventoryReportView.as_view(), name='monthly_report'),
    path('reports/yearly/', views.YearlyInventoryReportView.as_view(), name='yearly_report'),
    path('reports/stock-movement/', views.StockMovementReportView.as_view(), name='movement_report'),
    path('reports/stock-turnover/', views.StockTurnoverReportView.as_view(), name='turnover_report'),
    path('reports/abc-analysis/', views.ABCAnalysisView.as_view(), name='abc_analysis'),
    path('reports/expiry-report/', views.ExpiryReportView.as_view(), name='expiry_report'),
    path('reports/expiring-soon/', views.ExpiringSoonReportView.as_view(), name='expiring_soon'),
]

bulk_urls = [
    path('bulk/stock-adjustment/', views.BulkStockAdjustmentView.as_view(), name='bulk_adjustment'),
    path('bulk/stock-transfer/', views.BulkStockTransferView.as_view(), name='bulk_transfer'),
    path('bulk/reservation/', views.BulkReservationView.as_view(), name='bulk_reservation'),
    path('bulk/unreservation/', views.BulkUnreservationView.as_view(), name='bulk_unreservation'),
]

nested_urls = [
    # Warehouse → Stock
    path('warehouses/<int:warehouse_pk>/stock/', views.WarehouseStockListCreateView.as_view({'get': 'list', 'post': 'create'}), name='warehouse-stock-list'),
    path('warehouses/<int:warehouse_pk>/stock/<int:pk>/', views.WarehouseStockRetrieveUpdateDestroyView.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='warehouse-stock-detail'),

    # Stock → Transactions
    path('stock/<int:stock_pk>/transactions/', views.StockTransactionsListView.as_view(), name='stock-transactions'),

    # Transfer → Items
    path('warehousetransfer/<int:transfer_pk>/items/', views.TransferItemListCreateView.as_view({'get': 'list', 'post': 'create'}), name='transfer-items-list'),
    path('warehousetransfer/<int:transfer_pk>/items/<int:pk>/', views.TransferItemRetrieveUpdateDestroyView.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='transfer-item-detail'),

    # Stock → Batches
    path('stock/<int:stock_pk>/batches/', views.StockBatchListView.as_view(), name='stock-batches'),

    # Warehouse Transfers
    path('warehouses/<int:from_warehouse_pk>/transfers/', views.WarehouseOutgoingTransfersView.as_view(), name='warehouse-outgoing-transfers'),
    path('warehouses/<int:to_warehouse_pk>/incoming-transfers/', views.WarehouseIncomingTransfersView.as_view(), name='warehouse-incoming-transfers'),
]

admin_urls = [
    path('admin/stock-sync/', views.StockSyncView.as_view(), name='stock_sync'),
    path('admin/inventory-count/', views.InventoryCountView.as_view(), name='inventory_count'),
    path('admin/clear-cache/', views.ClearStockCacheView.as_view(), name='clear_stock_cache'),
]

health_urls = [
    path('health/', views.StockHealthCheckView.as_view(), name='stock_health'),
    path('health/detailed/', views.DetailedStockHealthCheckView.as_view(), name='detailed_stock_health'),
]

download_urls = [
    path('download/stock-template/', views.StockImportTemplateView.as_view(), name='stock_import_template'),
    path('download/transfer-template/', views.TransferImportTemplateView.as_view(), name='transfer_import_template'),
    path('print/barcode/<str:barcode>/', views.PrintBarcodeView.as_view(), name='print_barcode'),
    path('print/stock-label/<int:stock_id>/', views.PrintStockLabelView.as_view(), name='print_stock_label'),
]


# ================================
# FINAL URLPATTERNS (NO MORE api/v1/ inside!)
# ================================
urlpatterns = [
    # Main API (ViewSets + custom endpoints)
    path('', include(core_api_urls)),

    # Grouped endpoints
    path('reports/', include(report_urls)),
    path('bulk/', include(bulk_urls)),
    path('nested/', include(nested_urls)),
    path('admin/', include(admin_urls)),
    path('', include(health_urls)),
    path('', include(download_urls)),
]


# ================================
# WEBSOCKET URLS (Django Channels)
# ================================
websocket_urlpatterns = [
    path('ws/stock_updates/', views.StockWebSocketConsumer.as_asgi(), name='stock_updates_ws'),
    path('ws/warehouse_updates/', views.WarehouseWebSocketConsumer.as_asgi(), name='warehouse_updates_ws'),
    path('ws/transfer_updates/', views.TransferWebSocketConsumer.as_asgi(), name='transfer_updates_ws'),
    path('ws/dashboard/', views.StockDashboardConsumer.as_asgi(), name='stock_dashboard_ws'),
    path('ws/notifications/', views.StockNotificationConsumer.as_asgi(), name='stock_notifications_ws'),
    path('ws/analytics/', views.StockAnalyticsConsumer.as_asgi(), name='stock_analytics_ws'),

    # Specific item streams
    path('ws/stock/<str:stock_id>/', views.StockWebSocketConsumer.as_asgi()),
    path('ws/warehouse/<str:warehouse_id>/', views.WarehouseWebSocketConsumer.as_asgi()),
    path('ws/transfer/<str:transfer_id>/', views.TransferWebSocketConsumer.as_asgi()),
]


print(f"Loaded {len(urlpatterns)} stock management endpoints + {len(websocket_urlpatterns)} WebSocket routes")