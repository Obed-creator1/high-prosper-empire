# backend/procurement/api/serializers.py
from rest_framework import serializers
from .models import (
    Item, ItemCategory, Supplier,
    PurchaseRequisition, PurchaseRequisitionItem,
    RFQ, Quotation,
    PurchaseOrder, PurchaseOrderItem,
    GoodsReceipt, GoodsReceiptItem,
    SupplierInvoice
)
from stock.models import Stock


# ========================
# CORE CATALOG
# ========================
class ItemCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCategory
        fields = ['id', 'name', 'description', 'is_service_category']


class ItemListSerializer(serializers.ModelSerializer):
    item_type_display = serializers.CharField(source='get_item_type_display', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Item
        fields = [
            'id', 'sku', 'name', 'item_type', 'item_type_display',
            'category', 'category_name', 'unit_of_measure',
            'cost_price', 'selling_price', 'currency',
            'track_inventory', 'is_active'
        ]


class ItemDetailSerializer(serializers.ModelSerializer):
    category = ItemCategorySerializer(read_only=True)

    class Meta:
        model = Item
        fields = '__all__'


# ========================
# SUPPLIER
# ========================
class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_full_address(self, obj):
        address_parts = [
            obj.address, obj.city, obj.state, obj.zip_code, obj.country
        ]
        return ', '.join([part for part in address_parts if part])

    def get_active_items(self, obj):
        return Stock.objects.filter(supplier=obj, is_active=True).count()


# ========================
# PURCHASE REQUISITION
# ========================
class PurchaseRequisitionItemSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = PurchaseRequisitionItem
        fields = '__all__'


class PurchaseRequisitionListSerializer(serializers.ModelSerializer):
    requester_name = serializers.CharField(source='requester.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PurchaseRequisition
        fields = [
            'id', 'pr_number', 'title', 'requester', 'requester_name',
            'department', 'required_by_date', 'status', 'status_display',
            'total_estimated_amount', 'created_at'
        ]


class PurchaseRequisitionDetailSerializer(serializers.ModelSerializer):
    items = PurchaseRequisitionItemSerializer(many=True, read_only=True)
    requester_name = serializers.CharField(source='requester.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)

    class Meta:
        model = PurchaseRequisition
        fields = '__all__'


# ========================
# RFQ & QUOTATION
# ========================
class QuotationSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = Quotation
        fields = '__all__'


class RFQSerializer(serializers.ModelSerializer):
    quotations = QuotationSerializer(many=True, read_only=True)
    supplier_list = serializers.SlugRelatedField(
        queryset=Supplier.objects.all(),
        many=True,
        slug_field='code',
        required=False
    )

    class Meta:
        model = RFQ
        fields = '__all__'


# ========================
# PURCHASE ORDER
# ========================
class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = '__all__'


class PurchaseOrderListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'po_number', 'supplier', 'supplier_name',
            'order_date', 'expected_delivery_date', 'status', 'status_display',
            'grand_total', 'currency'
        ]


class PurchaseOrderDetailSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'


# ========================
# GOODS RECEIPT
# ========================
class GoodsReceiptItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoodsReceiptItem
        fields = '__all__'


class GoodsReceiptSerializer(serializers.ModelSerializer):
    items = GoodsReceiptItemSerializer(many=True, read_only=True)
    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True)

    class Meta:
        model = GoodsReceipt
        fields = '__all__'


# ========================
# SUPPLIER INVOICE
# ========================
class SupplierInvoiceSerializer(serializers.ModelSerializer):
    purchase_order_number = serializers.CharField(source='purchase_order.po_number', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = SupplierInvoice
        fields = '__all__'