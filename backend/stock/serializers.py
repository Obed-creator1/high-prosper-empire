from rest_framework import serializers
from rest_framework.validators import UniqueValidator
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum, F, Q
from decimal import Decimal
import uuid
from datetime import date, datetime, timedelta
from .models import *
from procurement.models import Supplier


class CategorySerializer(serializers.ModelSerializer):
    """Category management serializer"""
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'is_active', 'created_at', 'updated_at', 'item_count']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return Stock.objects.filter(category=obj, is_active=True).count()



class ValuationMethodSerializer(serializers.ModelSerializer):
    """Inventory valuation method serializer"""
    class Meta:
        model = ValuationMethod
        fields = ['id', 'name', 'description', 'is_active']
        read_only_fields = ['id']

class WarehouseSerializer(serializers.ModelSerializer):
    """Warehouse management serializer"""
    manager_name = serializers.SerializerMethodField()
    total_stock_value = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()
    stock_count = serializers.SerializerMethodField()
    capacity_percentage = serializers.SerializerMethodField()

    class Meta:
        model = Warehouse
        fields = [
            'id', 'name', 'code', 'address', 'city', 'state', 'zip_code',
            'country', 'manager', 'phone', 'email', 'is_active', 'capacity',
            'current_utilization', 'created_at', 'updated_at',
            'manager_name', 'total_stock_value', 'total_items', 'stock_count',
            'capacity_percentage'
        ]
        read_only_fields = ['id', 'current_utilization', 'created_at', 'updated_at']

    def get_manager_name(self, obj):
        return obj.manager.get_full_name() if obj.manager else None

    def get_total_stock_value(self, obj):
        from .models import WarehouseStock
        total = WarehouseStock.objects.filter(warehouse=obj).aggregate(
            total=Sum(F('quantity') * F('unit_price'))
        )['total'] or 0
        return float(total)

    def get_total_items(self, obj):
        from .models import WarehouseStock
        return WarehouseStock.objects.filter(warehouse=obj, quantity__gt=0).count()

    def get_stock_count(self, obj):
        from .models import WarehouseStock
        return WarehouseStock.objects.filter(warehouse=obj).count()

    def get_capacity_percentage(self, obj):
        if obj.capacity == 0:
            return 0
        return round((obj.current_utilization / obj.capacity) * 100, 2)

class WarehouseStockSerializer(serializers.ModelSerializer):
    """Warehouse-specific stock serializer"""
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    stock_code = serializers.CharField(source='stock.item_code', read_only=True)
    stock_barcode = serializers.CharField(source='stock.barcode', read_only=True)
    category_name = serializers.CharField(source='stock.category.name', read_only=True)
    supplier_name = serializers.CharField(source='stock.supplier.name', read_only=True)
    available_quantity = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()
    stock_status = serializers.CharField(source='stock.stock_status', read_only=True)
    reorder_level = serializers.CharField(source='stock.reorder_level', read_only=True)
    min_stock_level = serializers.CharField(source='stock.min_stock_level', read_only=True)
    valuation_method = serializers.CharField(source='stock.valuation_method.name', read_only=True)
    days_since_last_transaction = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseStock
        fields = [
            'id', 'stock', 'stock_name', 'stock_code', 'stock_barcode',
            'category_name', 'supplier_name', 'warehouse', 'quantity',
            'reserved_quantity', 'available_quantity', 'unit_price',
            'total_value', 'stock_status', 'reorder_level', 'min_stock_level',
            'valuation_method', 'days_since_last_transaction', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'available_quantity', 'total_value', 'days_since_last_transaction', 'created_at', 'updated_at']

    def get_available_quantity(self, obj):
        return max(0, obj.quantity - obj.reserved_quantity)

    def get_total_value(self, obj):
        return float(obj.quantity * obj.unit_price)

    def get_days_since_last_transaction(self, obj):
        from .models import StockTransaction
        last_transaction = StockTransaction.objects.filter(
            Q(from_warehouse=obj.warehouse) | Q(to_warehouse=obj.warehouse),
            stock=obj.stock
        ).order_by('-created_at').first()
        if last_transaction:
            return (date.today() - last_transaction.created_at.date()).days
        return None

class StockBatchSerializer(serializers.ModelSerializer):
    """Batch tracking serializer"""
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    stock_code = serializers.CharField(source='stock.item_code', read_only=True)
    warehouse_name = serializers.CharField(source='warehouse.name', read_only=True)
    category_name = serializers.CharField(source='stock.category.name', read_only=True)
    remaining_quantity = serializers.SerializerMethodField()
    days_to_expiry = serializers.SerializerMethodField()
    expiry_status = serializers.SerializerMethodField()
    used_percentage = serializers.SerializerMethodField()

    class Meta:
        model = StockBatch
        fields = [
            'id', 'stock', 'stock_name', 'stock_code', 'category_name',
            'warehouse', 'warehouse_name', 'batch_number', 'received_date',
            'expiry_date', 'initial_quantity', 'remaining_quantity',
            'unit_price', 'days_to_expiry', 'expiry_status', 'used_percentage',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'remaining_quantity', 'days_to_expiry',
                            'expiry_status', 'used_percentage', 'created_at', 'updated_at']

    def get_remaining_quantity(self, obj):
        return max(0, obj.initial_quantity - obj.used_quantity)

    def get_days_to_expiry(self, obj):
        if not obj.expiry_date:
            return None
        today = date.today()
        delta = obj.expiry_date - today
        return max(0, delta.days)

    def get_expiry_status(self, obj):
        if not obj.expiry_date:
            return 'no_expiry'
        days_to_expiry = self.get_days_to_expiry(obj)
        if days_to_expiry == 0:
            return 'expired'
        elif days_to_expiry <= 7:
            return 'critical'
        elif days_to_expiry <= 30:
            return 'warning'
        return 'normal'

    def get_used_percentage(self, obj):
        remaining = self.get_remaining_quantity(obj)
        if obj.initial_quantity == 0:
            return 0
        return round(((obj.initial_quantity - remaining) / obj.initial_quantity) * 100, 2)

class StockTransactionSerializer(serializers.ModelSerializer):
    """Stock transaction serializer"""
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    stock_code = serializers.CharField(source='stock.item_code', read_only=True)
    category_name = serializers.CharField(source='stock.category.name', read_only=True)
    from_warehouse_name = serializers.CharField(source='from_warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='to_warehouse.name', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    total_value = serializers.SerializerMethodField()

    class Meta:
        model = StockTransaction
        fields = [
            'id', 'stock', 'stock_name', 'stock_code', 'category_name',
            'transaction_type', 'transaction_type_display', 'quantity',
            'unit_price', 'total_value', 'reference', 'notes',
            'from_warehouse', 'from_warehouse_name', 'to_warehouse',
            'to_warehouse_name', 'user', 'user_name', 'created_at'
        ]
        read_only_fields = ['id', 'total_value', 'user_name', 'transaction_type_display', 'created_at']

    def get_total_value(self, obj):
        return float(abs(obj.quantity) * obj.unit_price)

class StockCreateSerializer(serializers.ModelSerializer):
    """Stock creation/update serializer with validation"""
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )
    default_warehouse = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.filter(is_active=True), required=False, allow_null=True
    )
    supplier = serializers.PrimaryKeyRelatedField(
        queryset=Supplier.objects.all(), required=False, allow_null=True
    )
    valuation_method = serializers.PrimaryKeyRelatedField(
        queryset=ValuationMethod.objects.filter(is_active=True), required=False, allow_null=True
    )
    item_code = serializers.CharField(
        validators=[UniqueValidator(queryset=Stock.objects.filter(is_active=True))],
        required=True
    )
    barcode = serializers.CharField(
        validators=[UniqueValidator(queryset=Stock.objects.filter(is_active=True))],
        required=False, allow_blank=True, allow_null=True
    )

    class Meta:
        model = Stock
        fields = [
            'id', 'item_code', 'barcode', 'name', 'description', 'category',
            'default_warehouse', 'supplier', 'min_stock_level', 'reorder_level',
            'max_stock_level', 'unit_price', 'valuation_method', 'status',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Custom validation for stock creation"""
        item_code = data.get('item_code')
        barcode = data.get('barcode')

        # Check if item_code or barcode already exists (case insensitive)
        if Stock.objects.filter(
                Q(item_code__iexact=item_code) | Q(barcode__iexact=barcode),
                is_active=True
        ).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError({
                'item_code': 'Item code or barcode already exists.'
            })

        # Validate stock levels
        min_level = data.get('min_stock_level', 0)
        reorder_level = data.get('reorder_level', 0)
        max_level = data.get('max_stock_level', 0)

        if reorder_level > min_level:
            raise serializers.ValidationError({
                'reorder_level': 'Reorder level cannot exceed minimum stock level.'
            })

        if min_level > max_level:
            raise serializers.ValidationError({
                'min_stock_level': 'Minimum stock level cannot exceed maximum stock level.'
            })

        return data

    def create(self, validated_data):
        """Create stock and initial warehouse stock"""
        stock = Stock.objects.create(**validated_data)

        # Create initial warehouse stock if default_warehouse provided
        default_warehouse = validated_data.get('default_warehouse')
        if default_warehouse:
            WarehouseStock.objects.get_or_create(
                stock=stock,
                warehouse=default_warehouse,
                defaults={
                    'quantity': 0,
                    'reserved_quantity': 0,
                    'unit_price': validated_data.get('unit_price', Decimal('0.00'))
                }
            )

        return stock

class StockSerializer(StockCreateSerializer):
    """Stock read-only serializer with nested relationships"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    default_warehouse_name = serializers.CharField(source='default_warehouse.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    valuation_method_name = serializers.CharField(source='valuation_method.name', read_only=True)
    total_quantity = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()
    total_available = serializers.SerializerMethodField()
    warehouse_count = serializers.SerializerMethodField()
    batch_count = serializers.SerializerMethodField()
    stock_status = serializers.SerializerMethodField()
    available_quantity = serializers.SerializerMethodField()
    low_stock_alert = serializers.SerializerMethodField()

    class Meta(StockCreateSerializer.Meta):
        read_only_fields = StockCreateSerializer.Meta.read_only_fields + [
            'category_name', 'default_warehouse_name', 'supplier_name',
            'valuation_method_name', 'total_quantity', 'total_value',
            'total_available', 'warehouse_count', 'batch_count', 'stock_status',
            'available_quantity', 'low_stock_alert'
        ]

    def get_total_quantity(self, obj):
        from .models import WarehouseStock
        total = WarehouseStock.objects.filter(stock=obj).aggregate(
            total=Sum('quantity')
        )['total'] or 0
        return int(total)

    def get_total_value(self, obj):
        from .models import WarehouseStock
        total = WarehouseStock.objects.filter(stock=obj).aggregate(
            total=Sum(F('quantity') * F('unit_price'))
        )['total'] or 0
        return float(total)

    def get_total_available(self, obj):
        from .models import WarehouseStock
        total = WarehouseStock.objects.filter(stock=obj).aggregate(
            total=Sum('available_quantity')
        )['total'] or 0
        return int(total)

    def get_warehouse_count(self, obj):
        from .models import WarehouseStock
        return WarehouseStock.objects.filter(stock=obj, quantity__gt=0).count()

    def get_batch_count(self, obj):
        return obj.batches.filter(is_active=True, remaining_quantity__gt=0).count()

    def get_stock_status(self, obj):
        from .models import WarehouseStock
        critical_count = WarehouseStock.objects.filter(
            stock=obj, quantity__lte=F('stock__reorder_level')
        ).count()

        if critical_count > 0:
            return 'critical'
        low_count = WarehouseStock.objects.filter(
            stock=obj,
            quantity__gt=F('stock__reorder_level'),
            quantity__lte=F('stock__min_stock_level')
        ).count()

        if low_count > 0:
            return 'low'

        return 'normal'

    def get_available_quantity(self, obj):
        warehouse_id = self.context.get('request').query_params.get('warehouse')
        if warehouse_id:
            try:
                warehouse_stock = WarehouseStock.objects.get(
                    stock=obj, warehouse_id=warehouse_id
                )
                return warehouse_stock.available_quantity
            except WarehouseStock.DoesNotExist:
                return 0
        return self.get_total_available(obj)

    def get_low_stock_alert(self, obj):
        from .models import WarehouseStock
        return WarehouseStock.objects.filter(
            stock=obj,
            quantity__lte=F('stock__reorder_level')
        ).exists()

class StockAdjustmentSerializer(serializers.Serializer):
    """Stock adjustment serializer"""
    stock = serializers.PrimaryKeyRelatedField(queryset=Stock.objects.filter(is_active=True))
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=-999999, max_value=999999)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    adjustment_type = serializers.ChoiceField(
        choices=[
            ('addition', 'Stock Addition'),
            ('reduction', 'Stock Reduction'),
            ('correction', 'Stock Correction')
        ]
    )
    reference = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        """Validate stock adjustment"""
        stock = data['stock']
        warehouse = data['warehouse']
        quantity = data['quantity']

        # Check if stock exists in warehouse
        try:
            warehouse_stock = WarehouseStock.objects.get(stock=stock, warehouse=warehouse)
        except WarehouseStock.DoesNotExist:
            if quantity > 0:
                # Allow creation for positive adjustments
                return data
            else:
                raise serializers.ValidationError({
                    'warehouse': f'Stock {stock.item_code} not found in warehouse {warehouse.name}'
                })

        # Validate reduction doesn't exceed available quantity
        if quantity < 0 and abs(quantity) > warehouse_stock.available_quantity:
            raise serializers.ValidationError({
                'quantity': f'Cannot reduce by {abs(quantity)}. Available: {warehouse_stock.available_quantity}'
            })

        return data

class StockMovementSerializer(serializers.Serializer):
    """Stock movement between warehouses"""
    stock = serializers.PrimaryKeyRelatedField(queryset=Stock.objects.filter(is_active=True))
    from_warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    to_warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    reference = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        """Validate stock movement"""
        from_warehouse = data['from_warehouse']
        to_warehouse = data['to_warehouse']
        stock = data['stock']
        quantity = data['quantity']

        if from_warehouse == to_warehouse:
            raise serializers.ValidationError({
                'from_warehouse': 'Source and destination warehouses must be different'
            })

        # Check stock availability
        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=stock, warehouse=from_warehouse
            )
            if warehouse_stock.available_quantity < quantity:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient stock. Available: {warehouse_stock.available_quantity}'
                })
        except WarehouseStock.DoesNotExist:
            raise serializers.ValidationError({
                'from_warehouse': f'Stock {stock.item_code} not found in source warehouse'
            })

        return data

class TransferItemSerializer(serializers.ModelSerializer):
    """Warehouse transfer item serializer"""
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    stock_code = serializers.CharField(source='stock.item_code', read_only=True)
    category_name = serializers.CharField(source='stock.category.name', read_only=True)
    from_warehouse_name = serializers.CharField(source='transfer.from_warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='transfer.to_warehouse.name', read_only=True)
    available_quantity = serializers.SerializerMethodField()

    class Meta:
        model = TransferItem
        fields = [
            'id', 'transfer', 'stock', 'stock_name', 'stock_code', 'category_name',
            'quantity', 'unit_price', 'total_value', 'from_warehouse_name',
            'to_warehouse_name', 'available_quantity'
        ]
        read_only_fields = ['id', 'total_value', 'from_warehouse_name', 'to_warehouse_name']

    def get_available_quantity(self, obj):
        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=obj.stock, warehouse=obj.transfer.from_warehouse
            )
            return warehouse_stock.available_quantity
        except WarehouseStock.DoesNotExist:
            return 0

class WarehouseTransferSerializer(serializers.ModelSerializer):
    """Warehouse transfer serializer"""
    items = TransferItemSerializer(source='transferitem_set', many=True, read_only=True)
    from_warehouse_name = serializers.CharField(source='from_warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='to_warehouse.name', read_only=True)
    item_count = serializers.SerializerMethodField()
    total_quantity = serializers.SerializerMethodField()
    total_value = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_in_transit = serializers.SerializerMethodField()

    class Meta:
        model = WarehouseTransfer
        fields = [
            'id', 'transfer_number', 'from_warehouse', 'from_warehouse_name',
            'to_warehouse', 'to_warehouse_name', 'status', 'status_display',
            'transfer_date', 'expected_delivery_date', 'actual_delivery_date',
            'item_count', 'total_quantity', 'total_value', 'days_in_transit',
            'notes', 'created_by', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['id', 'transfer_number', 'item_count', 'total_quantity',
                            'total_value', 'status_display', 'days_in_transit', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return obj.transferitem_set.count()

    def get_total_quantity(self, obj):
        return sum(item.quantity for item in obj.transferitem_set.all())

    def get_total_value(self, obj):
        total = sum(item.quantity * item.unit_price for item in obj.transferitem_set.all())
        return float(total)

    def get_days_in_transit(self, obj):
        if obj.status == 'in_transit' and obj.transfer_date:
            return (date.today() - obj.transfer_date).days
        return 0

class WarehouseTransferCreateSerializer(serializers.ModelSerializer):
    """Warehouse transfer creation serializer"""
    items_data = serializers.ListField(
        child=serializers.DictField(), write_only=True, required=True
    )
    expected_delivery_date = serializers.DateField(required=False)

    class Meta:
        model = WarehouseTransfer
        fields = [
            'from_warehouse', 'to_warehouse', 'status', 'transfer_date',
            'expected_delivery_date', 'notes', 'items_data'
        ]
        read_only_fields = ['status', 'transfer_date']

    def validate(self, data):
        """Validate transfer creation"""
        from_warehouse = data.get('from_warehouse')
        to_warehouse = data.get('to_warehouse')
        items_data = data.get('items_data', [])

        if from_warehouse == to_warehouse:
            raise serializers.ValidationError({
                'from_warehouse': 'Source and destination warehouses cannot be the same'
            })

        if not items_data:
            raise serializers.ValidationError({
                'items_data': 'At least one item must be included in the transfer'
            })

        # Validate stock availability
        for item_data in items_data:
            stock_id = item_data.get('stock')
            quantity = item_data.get('quantity', 0)

            if quantity <= 0:
                raise serializers.ValidationError({
                    'items_data': f'Invalid quantity for stock {stock_id}'
                })

            try:
                warehouse_stock = WarehouseStock.objects.get(
                    stock_id=stock_id,
                    warehouse=from_warehouse
                )
                if warehouse_stock.available_quantity < quantity:
                    raise serializers.ValidationError({
                        'items_data': f'Insufficient stock for {stock_id}: '
                                      f'{warehouse_stock.available_quantity} available'
                    })
            except WarehouseStock.DoesNotExist:
                raise serializers.ValidationError({
                    'items_data': f'Stock {stock_id} not found in source warehouse'
                })

        return data

    def create(self, validated_data):
        """Create transfer with items"""
        items_data = validated_data.pop('items_data')
        transfer = WarehouseTransfer.objects.create(**validated_data)

        for item_data in items_data:
            TransferItem.objects.create(
                transfer=transfer,
                stock_id=item_data['stock'],
                quantity=item_data['quantity'],
                unit_price=item_data.get('unit_price', Decimal('0.00'))
            )

        return transfer

class StockReservationSerializer(serializers.Serializer):
    """Stock reservation serializer"""
    stock = serializers.PrimaryKeyRelatedField(queryset=Stock.objects.filter(is_active=True))
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1)
    reference = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        """Validate stock reservation"""
        stock = data['stock']
        warehouse = data['warehouse']
        quantity = data['quantity']

        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=stock, warehouse=warehouse
            )
            if warehouse_stock.available_quantity < quantity:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient available stock. Requested: {quantity}, Available: {warehouse_stock.available_quantity}'
                })
        except WarehouseStock.DoesNotExist:
            raise serializers.ValidationError({
                'warehouse': f'Stock {stock.item_code} not found in warehouse {warehouse.name}'
            })

        return data

class StockReleaseSerializer(serializers.Serializer):
    """Stock reservation release serializer"""
    stock = serializers.PrimaryKeyRelatedField(queryset=Stock.objects.filter(is_active=True))
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1)
    reference = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate(self, data):
        """Validate stock release"""
        stock = data['stock']
        warehouse = data['warehouse']
        quantity = data['quantity']

        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=stock, warehouse=warehouse
            )
            if warehouse_stock.reserved_quantity < quantity:
                raise serializers.ValidationError({
                    'quantity': f'Cannot release {quantity}. Reserved: {warehouse_stock.reserved_quantity}'
                })
        except WarehouseStock.DoesNotExist:
            raise serializers.ValidationError({
                'warehouse': f'Stock {stock.item_code} not found in warehouse {warehouse.name}'
            })

        return data

class BatchOperationSerializer(serializers.Serializer):
    """Batch operations serializer"""
    stock_ids = serializers.ListField(
        child=serializers.UUIDField(), min_length=1, max_length=1000
    )
    warehouse_id = serializers.IntegerField(required=True)
    operation = serializers.ChoiceField(
        choices=[
            ('adjust', 'Adjust Quantity'),
            ('reserve', 'Reserve Stock'),
            ('release', 'Release Reservation'),
            ('transfer', 'Transfer Stock')
        ]
    )
    quantity = serializers.IntegerField(min_value=-999999, max_value=999999)
    unit_price = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)
    reference = serializers.CharField(max_length=200, required=False, allow_blank=True)

    def validate(self, data):
        """Validate batch operation parameters"""
        operation = data['operation']
        quantity = data['quantity']

        if operation == 'release' and quantity > 0:
            raise serializers.ValidationError({
                'quantity': 'Release operation requires negative quantity'
            })

        if operation in ['reserve', 'transfer'] and quantity <= 0:
            raise serializers.ValidationError({
                'quantity': 'Reserve/transfer operations require positive quantity'
            })

        return data

class StockImportSerializer(serializers.Serializer):
    """Stock import validation serializer"""
    file = serializers.FileField()
    warehouse_id = serializers.IntegerField()
    update_existing = serializers.BooleanField(default=False)
    create_categories = serializers.BooleanField(default=True)
    create_suppliers = serializers.BooleanField(default=True)
    valuation_method_id = serializers.IntegerField(required=False)

class BarcodeScanSerializer(serializers.Serializer):
    """Barcode scanning serializer"""
    barcode = serializers.CharField(max_length=100)
    warehouse_id = serializers.IntegerField(required=False, allow_null=True)

class QuickAdjustSerializer(serializers.Serializer):
    """Quick adjustment from mobile scan"""
    barcode = serializers.CharField(max_length=100)
    warehouse_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=-999999, max_value=999999)
    operation = serializers.ChoiceField(
        choices=[
            ('in', 'Stock In'),
            ('out', 'Stock Out'),
            ('adjust', 'Adjust to Quantity')
        ]
    )
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        """Validate quick adjustment"""
        operation = data['operation']
        quantity = data['quantity']

        if operation == 'out' and quantity > 0:
            raise serializers.ValidationError({
                'quantity': 'Stock out requires positive quantity'
            })

        if operation == 'in' and quantity < 0:
            raise serializers.ValidationError({
                'quantity': 'Stock in requires positive quantity'
            })

        return data

class StockReportSerializer(serializers.ModelSerializer):
    """Stock report serializer"""
    class Meta:
        model = StockReport
        fields = '__all__'

class AnalyticsDashboardSerializer(serializers.Serializer):
    """Analytics dashboard response serializer"""
    metrics = serializers.DictField()
    trending_items = serializers.ListField(child=serializers.DictField())
    warehouse_performance = serializers.ListField(child=serializers.DictField())
    low_stock_alerts = serializers.ListField(child=serializers.DictField())
    expiry_alerts = serializers.ListField(child=serializers.DictField())
    timestamp = serializers.DateTimeField()

class TurnoverReportSerializer(serializers.Serializer):
    """Inventory turnover report serializer"""
    period_days = serializers.IntegerField()
    turnover_analysis = serializers.ListField(child=serializers.DictField())
    average_turnover = serializers.FloatField()
    fast_moving = serializers.ListField(child=serializers.DictField())
    slow_moving = serializers.ListField(child=serializers.DictField())
    timestamp = serializers.DateTimeField()

# Nested serializers for comprehensive responses
class StockWithWarehouseStockSerializer(StockSerializer):
    """Stock with detailed warehouse stock information"""
    warehouse_stocks = WarehouseStockSerializer(source='warehouse_stocks', many=True, read_only=True)

class WarehouseWithStockSerializer(WarehouseSerializer):
    """Warehouse with detailed stock information"""
    stocks = WarehouseStockSerializer(source='warehousestock_set', many=True, read_only=True)

class StockWithBatchesSerializer(StockSerializer):
    """Stock with batch information"""
    batches = StockBatchSerializer(source='batches', many=True, read_only=True)

class ComprehensiveStockSerializer(serializers.Serializer):
    """Complete stock information for enterprise dashboard"""
    stock = StockSerializer()
    warehouse_stocks = WarehouseStockSerializer(many=True)
    batches = StockBatchSerializer(many=True)
    recent_transactions = StockTransactionSerializer(many=True, source='stocktransaction_set')
    valuation = serializers.DictField()

# Export serializers
class StockExportSerializer(serializers.Serializer):
    """Serializer for stock export data"""
    item_code = serializers.CharField()
    name = serializers.CharField()
    category = serializers.CharField()
    warehouse = serializers.CharField()
    quantity = serializers.IntegerField()
    reserved_quantity = serializers.IntegerField()
    available_quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    min_stock_level = serializers.IntegerField()
    reorder_level = serializers.IntegerField()
    stock_status = serializers.CharField()

class TransactionExportSerializer(serializers.Serializer):
    """Serializer for transaction export data"""
    date = serializers.DateTimeField()
    item_code = serializers.CharField()
    item_name = serializers.CharField()
    category = serializers.CharField()
    transaction_type = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    warehouse_from = serializers.CharField()
    warehouse_to = serializers.CharField()
    reference = serializers.CharField()
    notes = serializers.CharField()

# ERP Integration Serializers
class ERPStockSyncSerializer(serializers.Serializer):
    """ERP stock synchronization serializer"""
    erp_sync_id = serializers.CharField(max_length=100)
    sku = serializers.CharField(max_length=100)
    name = serializers.CharField(max_length=200)
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    warehouse_code = serializers.CharField(max_length=50)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    batch_number = serializers.CharField(max_length=100, required=False, allow_blank=True)

class ERPTransactionSyncSerializer(serializers.Serializer):
    """ERP transaction synchronization serializer"""
    erp_transaction_id = serializers.CharField(max_length=100)
    stock_sku = serializers.CharField(max_length=100)
    transaction_type = serializers.CharField()
    quantity = serializers.IntegerField()
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    warehouse_code = serializers.CharField(max_length=50)
    reference = serializers.CharField(max_length=200)
    timestamp = serializers.DateTimeField()

# Advanced Transfer Serializers
class WarehouseTransferItemSerializer(serializers.ModelSerializer):
    """Complete warehouse transfer item serializer with validation and calculations"""

    # Read-only display fields
    stock_name = serializers.CharField(source='stock.name', read_only=True)
    stock_code = serializers.CharField(source='stock.item_code', read_only=True)
    stock_barcode = serializers.CharField(source='stock.barcode', read_only=True)
    category_name = serializers.CharField(source='stock.category.name', read_only=True)
    supplier_name = serializers.CharField(source='stock.supplier.name', read_only=True)

    # Transfer context fields
    from_warehouse_name = serializers.CharField(source='transfer.from_warehouse.name', read_only=True)
    to_warehouse_name = serializers.CharField(source='transfer.to_warehouse.name', read_only=True)
    transfer_number = serializers.CharField(source='transfer.transfer_number', read_only=True)
    transfer_status = serializers.CharField(source='transfer.status', read_only=True)
    expected_delivery_date = serializers.DateField(source='transfer.expected_delivery_date', read_only=True)

    # Stock availability and validation
    available_quantity = serializers.SerializerMethodField()
    reserved_quantity = serializers.SerializerMethodField()
    stock_status = serializers.CharField(source='stock.stock_status', read_only=True)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        help_text="Unit price for valuation (auto-populated if not provided)"
    )

    # Calculated fields
    total_value = serializers.SerializerMethodField()
    can_transfer = serializers.SerializerMethodField()
    transfer_percentage = serializers.SerializerMethodField()

    class Meta:
        model = TransferItem
        fields = [
            # Core fields
            'id', 'transfer', 'stock', 'stock_name', 'stock_code', 'stock_barcode',
            'category_name', 'supplier_name',

            # Transfer context
            'transfer_number', 'transfer_status', 'from_warehouse_name',
            'to_warehouse_name', 'expected_delivery_date',

            # Stock details
            'quantity', 'unit_price', 'total_value',

            # Availability
            'available_quantity', 'reserved_quantity', 'stock_status',

            # Validation
            'can_transfer', 'transfer_percentage',

            # Metadata
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'total_value', 'available_quantity', 'reserved_quantity',
            'stock_name', 'stock_code', 'stock_barcode', 'category_name',
            'supplier_name', 'transfer_number', 'transfer_status',
            'from_warehouse_name', 'to_warehouse_name', 'expected_delivery_date',
            'stock_status', 'can_transfer', 'transfer_percentage',
            'created_at', 'updated_at'
        ]

    def get_available_quantity(self, obj):
        """Get available quantity in source warehouse"""
        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=obj.stock,
                warehouse=obj.transfer.from_warehouse
            )
            return warehouse_stock.available_quantity
        except WarehouseStock.DoesNotExist:
            return 0

    def get_reserved_quantity(self, obj):
        """Get currently reserved quantity in source warehouse"""
        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=obj.stock,
                warehouse=obj.transfer.from_warehouse
            )
            return warehouse_stock.reserved_quantity
        except WarehouseStock.DoesNotExist:
            return 0

    def get_total_value(self, obj):
        """Calculate total value of transferred items"""
        unit_price = obj.unit_price or Decimal('0.00')
        return float(obj.quantity * unit_price)

    def get_can_transfer(self, obj):
        """Check if transfer is possible based on stock availability"""
        available = self.get_available_quantity(obj)
        return obj.quantity <= available

    def get_transfer_percentage(self, obj):
        """Calculate percentage of available stock being transferred"""
        available = self.get_available_quantity(obj)
        if available == 0:
            return 0
        return round((obj.quantity / available) * 100, 2)

    def validate(self, data):
        """Custom validation for transfer items"""
        # Get transfer instance from context or validated data
        transfer = self.context.get('transfer') or self.instance.transfer if self.instance else None

        if not transfer:
            raise serializers.ValidationError("Transfer context is required")

        stock = data.get('stock')
        quantity = data.get('quantity', 0)

        # Validate stock exists and is active
        if stock and not stock.is_active:
            raise serializers.ValidationError({
                'stock': 'Stock item must be active'
            })

        # Validate quantity
        if quantity <= 0:
            raise serializers.ValidationError({
                'quantity': 'Transfer quantity must be greater than 0'
            })

        # Check stock availability in source warehouse
        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=stock,
                warehouse=transfer.from_warehouse
            )

            available = warehouse_stock.available_quantity

            # Check if already included in this transfer
            existing_item = TransferItem.objects.filter(
                transfer=transfer,
                stock=stock
            ).exclude(id=self.instance.id if self.instance else None).first()

            if existing_item:
                available -= existing_item.quantity

            if quantity > available:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient stock available. Requested: {quantity}, Available: {available}'
                })

        except WarehouseStock.DoesNotExist:
            raise serializers.ValidationError({
                'stock': f'Stock {stock.item_code} not found in source warehouse {transfer.from_warehouse.name}'
            })

        # Auto-populate unit_price if not provided
        if 'unit_price' not in data or data['unit_price'] is None:
            try:
                warehouse_stock = WarehouseStock.objects.get(
                    stock=stock,
                    warehouse=transfer.from_warehouse
                )
                data['unit_price'] = warehouse_stock.unit_price
            except WarehouseStock.DoesNotExist:
                data['unit_price'] = Decimal('0.00')

        return data

    def create(self, validated_data):
        """Create transfer item with automatic unit_price"""
        # Auto-populate unit_price if not provided
        if 'unit_price' not in validated_data:
            stock = validated_data['stock']
            try:
                warehouse_stock = WarehouseStock.objects.get(
                    stock=stock,
                    warehouse=self.context['transfer'].from_warehouse
                )
                validated_data['unit_price'] = warehouse_stock.unit_price
            except WarehouseStock.DoesNotExist:
                validated_data['unit_price'] = Decimal('0.00')

        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update transfer item with quantity validation"""
        # Get current transfer availability
        transfer = instance.transfer
        stock = validated_data.get('stock', instance.stock)
        new_quantity = validated_data.get('quantity', instance.quantity)

        try:
            warehouse_stock = WarehouseStock.objects.get(
                stock=stock,
                warehouse=transfer.from_warehouse
            )

            # Calculate total reserved for this transfer
            total_reserved = TransferItem.objects.filter(
                transfer=transfer,
                stock=stock
            ).aggregate(total=Sum('quantity'))['total'] or 0

            # Subtract current item if updating
            if instance.pk:
                total_reserved -= instance.quantity

            available = warehouse_stock.available_quantity - total_reserved

            if new_quantity > available:
                raise serializers.ValidationError({
                    'quantity': f'Cannot update quantity. Requested: {new_quantity}, Available after other items: {available}'
                })

        except WarehouseStock.DoesNotExist:
            raise serializers.ValidationError({
                'stock': 'Stock not found in source warehouse'
            })

        return super().update(instance, validated_data)

class WarehouseTransferCreateItemSerializer(serializers.Serializer):
    """Simplified serializer for bulk transfer creation"""
    stock = serializers.PrimaryKeyRelatedField(queryset=Stock.objects.filter(is_active=True))
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )

    def validate(self, data):
        """Quick validation for bulk operations"""
        stock = data['stock']
        quantity = data['quantity']

        # Basic availability check (detailed validation in main serializer)
        warehouse_stock = WarehouseStock.objects.filter(
            stock=stock,
            warehouse=self.context['from_warehouse']
        ).first()

        if not warehouse_stock or warehouse_stock.available_quantity < quantity:
            raise serializers.ValidationError({
                'stock': f'Insufficient stock for {stock.item_code}'
            })

        return data

class WarehouseTransferBulkSerializer(serializers.Serializer):
    """Bulk warehouse transfer creation"""
    from_warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    to_warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    expected_delivery_date = serializers.DateField(required=False)
    items = WarehouseTransferCreateItemSerializer(many=True)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)

    def validate(self, data):
        """Validate bulk transfer"""
        from_warehouse = data['from_warehouse']
        to_warehouse = data['to_warehouse']

        if from_warehouse == to_warehouse:
            raise serializers.ValidationError({
                'from_warehouse': 'Source and destination warehouses must be different'
            })

        if not data['items']:
            raise serializers.ValidationError({
                'items': 'At least one item must be included'
            })

        # Set context for item validation
        for item_serializer in data['items']:
            item_serializer.context = {
                'from_warehouse': from_warehouse,
                'to_warehouse': to_warehouse
            }

        return data

    def create(self, validated_data):
        """Create bulk transfer"""
        items_data = validated_data.pop('items')
        transfer = WarehouseTransfer.objects.create(**validated_data)

        with transaction.atomic():
            for item_data in items_data:
                TransferItem.objects.create(
                    transfer=transfer,
                    stock=item_data['stock'],
                    quantity=item_data['quantity'],
                    unit_price=item_data.get('unit_price', Decimal('0.00'))
                )

        return transfer

class StockValuationSerializer(serializers.Serializer):
    """Advanced inventory valuation serializer"""
    stock_id = serializers.UUIDField()
    stock_name = serializers.CharField()
    item_code = serializers.CharField()
    warehouse = serializers.CharField()
    total_quantity = serializers.IntegerField()
    average_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    fifo_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    lifo_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    valuation_method = serializers.CharField()
    difference = serializers.DecimalField(max_digits=12, decimal_places=2)

class InventoryAuditSerializer(serializers.Serializer):
    """Inventory audit serializer"""
    warehouse = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.filter(is_active=True))
    stock = serializers.PrimaryKeyRelatedField(queryset=Stock.objects.filter(is_active=True), required=False)
    counted_quantity = serializers.IntegerField(min_value=0)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)
    audit_date = serializers.DateField(default=date.today)

    def validate(self, data):
        """Validate audit data"""
        warehouse = data['warehouse']
        stock = data.get('stock')

        if stock:
            try:
                warehouse_stock = WarehouseStock.objects.get(
                    stock=stock, warehouse=warehouse
                )
                if warehouse_stock.quantity < data['counted_quantity']:
                    # Allow overage in audits
                    pass
            except WarehouseStock.DoesNotExist:
                raise serializers.ValidationError({
                    'stock': f'Stock not found in warehouse {warehouse.name}'
                })

        return data

# =============================================================================
# 🔔 STOCK ALERT SERIALIZER
# =============================================================================

class StockAlertSerializer(serializers.ModelSerializer):
    """Stock alert serializer with stock and warehouse details"""
    stock = StockSerializer(read_only=True)
    stock_id = serializers.PrimaryKeyRelatedField(
        queryset=Stock.objects.all(), source='stock', write_only=True
    )
    warehouse = serializers.StringRelatedField()
    warehouse_id = serializers.PrimaryKeyRelatedField(
        queryset=Warehouse.objects.all(), source='warehouse', write_only=True
    )
    is_critical = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = StockAlert
        fields = [
            'id', 'stock', 'stock_id', 'warehouse', 'warehouse_id',
            'alert_type', 'severity', 'message', 'value', 'is_active',
            'is_critical', 'days_remaining', 'created_at', 'resolved_at'
        ]
        read_only_fields = ['id', 'created_at', 'resolved_at', 'is_critical', 'days_remaining']

    def get_is_critical(self, obj):
        """Determine if alert is critical"""
        return obj.severity == 'high' and obj.is_active

    def get_days_remaining(self, obj):
        """Calculate days remaining for expiry alerts"""
        if obj.alert_type == 'batch_expiry' and obj.value:
            return int(obj.value)
        return None


class StockBatchCreateSerializer(serializers.ModelSerializer):
    """Bulk batch creation serializer"""
    stock_id = serializers.PrimaryKeyRelatedField(queryset=Stock.objects.all())
    warehouse_id = serializers.PrimaryKeyRelatedField(queryset=Warehouse.objects.all())

    class Meta:
        model = StockBatch
        fields = [
            'stock_id', 'warehouse_id', 'batch_number', 'quantity',
            'unit_price', 'expiry_date', 'manufacture_date', 'location'
        ]

    def create(self, validated_data):
        """Bulk create batches with transaction logging"""
        batches = validated_data.pop('batches', [validated_data]) if isinstance(validated_data, list) else [validated_data]
        created_batches = []

        with transaction.atomic():
            for batch_data in batches:
                batch = StockBatch.objects.create(**batch_data)

                # Update warehouse stock
                warehouse_stock, created = WarehouseStock.objects.get_or_create(
                    stock=batch_data['stock_id'],
                    warehouse=batch_data['warehouse_id'],
                    defaults={'quantity': 0, 'unit_price': batch_data['unit_price']}
                )
                warehouse_stock.quantity += batch_data['quantity']
                warehouse_stock.save()

                # Create transaction
                StockTransaction.objects.create(
                    stock=batch_data['stock_id'],
                    warehouse=batch_data['warehouse_id'],
                    transaction_type='batch_receipt',
                    quantity=batch_data['quantity'],
                    unit_price=batch_data['unit_price'],
                    reference=f"BATCH:{batch.batch_number}"
                )

                created_batches.append(batch)

        return created_batches

# =============================================================================
# 📈 STOCK BARCODE SERIALIZER
# =============================================================================

class StockBarcodeSerializer(serializers.Serializer):
    """Barcode generation serializer"""
    sku = serializers.CharField(max_length=50)
    barcode_type = serializers.ChoiceField(
        choices=[
            ('code128', 'Code 128'),
            ('code39', 'Code 39'),
            ('ean13', 'EAN-13'),
            ('qrcode', 'QR Code')
        ],
        default='code128'
    )
    format = serializers.ChoiceField(
        choices=[('BASE64', 'Base64'), ('PNG', 'PNG'), ('SVG', 'SVG')],
        default='BASE64'
    )
    width = serializers.IntegerField(default=200, min_value=100, max_value=600)
    height = serializers.IntegerField(default=100, min_value=50, max_value=300)
    barcode = serializers.SerializerMethodField()

    def get_barcode(self, obj):
        """Generate barcode image"""
        from .utils import generate_barcode
        return generate_barcode(
            obj['sku'],
            barcode_type=obj['barcode_type'],
            barcode_format=obj['format'],
            size=(obj['width'], obj['height'])
        )

# =============================================================================
# ⚖️ INVENTORY ADJUSTMENT SERIALIZER
# =============================================================================

class InventoryAdjustmentSerializer(serializers.Serializer):
    """Bulk inventory adjustment serializer"""
    adjustments = serializers.ListField(
        child=serializers.DictField(),
        min_length=1,
        max_length=1000
    )

    def validate_adjustments(self, value):
        """Validate adjustment data"""
        validated_adjustments = []

        for i, adjustment in enumerate(value):
            required_fields = ['stock_id', 'warehouse_id', 'quantity']

            for field in required_fields:
                if field not in adjustment:
                    raise serializers.ValidationError(
                        f"Adjustment {i+1}: Missing required field '{field}'"
                    )

            # Validate stock exists and has sufficient quantity for reductions
            stock_id = adjustment['stock_id']
            warehouse_id = adjustment['warehouse_id']
            new_quantity = adjustment['quantity']

            try:
                warehouse_stock = WarehouseStock.objects.get(
                    stock_id=stock_id,
                    warehouse_id=warehouse_id
                )

                if new_quantity < 0:
                    raise serializers.ValidationError(
                        f"Adjustment {i+1}: Quantity cannot be negative"
                    )

                # Check if reducing below current level
                if new_quantity < warehouse_stock.quantity:
                    adjustment['adjustment_type'] = 'reduction'
                elif new_quantity > warehouse_stock.quantity:
                    adjustment['adjustment_type'] = 'increase'
                else:
                    adjustment['adjustment_type'] = 'no_change'

                validated_adjustments.append(adjustment)

            except WarehouseStock.DoesNotExist:
                raise serializers.ValidationError(
                    f"Adjustment {i+1}: Stock {stock_id} not found in warehouse {warehouse_id}"
                )

        return validated_adjustments