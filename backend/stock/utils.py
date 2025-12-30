"""
Stock Management Utilities
Comprehensive inventory optimization and validation utilities
"""
import asyncio
import logging
import json
import hashlib
import barcode
from barcode.writer import ImageWriter
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple
from django.utils import timezone
from django.conf import settings
from django.core.cache import cache
from django.db.models import F, Q, Sum, Avg, Count
from django.core.validators import ValidationError
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64
from PIL import Image
import qrcode
import cv2
import numpy as np

from .models import (
    StockTransaction, WarehouseStock, Stock, StockBatch,
    WarehouseTransfer, StockAlert
)

logger = logging.getLogger(__name__)

# =============================================================================
# 📊 INVENTORY OPTIMIZATION UTILITIES
# =============================================================================

def calculate_safety_stock(
        avg_daily_demand: float,
        lead_time_days: float,
        demand_std_dev: float = None,
        lead_time_std_dev: float = 0,
        service_level: float = 0.95,
        method: str = 'normal_distribution'
) -> Tuple[int, Dict[str, Any]]:
    """
    Calculate safety stock using various methods

    Args:
        avg_daily_demand: Average daily demand
        lead_time_days: Average lead time in days
        demand_std_dev: Standard deviation of daily demand
        lead_time_std_dev: Standard deviation of lead time
        service_level: Desired service level (0.95 = 95%)
        method: 'normal_distribution', 'poisson', 'fixed_percentage'

    Returns:
        Tuple of (safety_stock, calculation_details)
    """
    try:
        if method == 'normal_distribution':
            if demand_std_dev is None:
                raise ValueError("demand_std_dev required for normal distribution")

            # Safety stock = Z * sqrt(lead_time) * sigma_demand
            z_score = stats.norm.ppf(service_level)
            variability = np.sqrt(
                lead_time_days * demand_std_dev**2 +
                avg_daily_demand**2 * lead_time_std_dev**2
            )
            safety_stock = max(0, int(round(z_score * variability)))

        elif method == 'poisson':
            # Poisson approximation for low demand items
            safety_stock = max(0, int(round(avg_daily_demand * lead_time_days * 0.2)))

        elif method == 'fixed_percentage':
            # Simple percentage of average demand during lead time
            safety_stock = max(0, int(round(avg_daily_demand * lead_time_days * 0.25)))

        else:
            raise ValueError(f"Unknown method: {method}")

        details = {
            'method': method,
            'avg_daily_demand': avg_daily_demand,
            'lead_time_days': lead_time_days,
            'service_level': service_level,
            'z_score': getattr(locals(), 'z_score', 0),
            'variability': getattr(locals(), 'variability', 0),
            'calculated_safety_stock': safety_stock
        }

        return safety_stock, details

    except Exception as e:
        logger.error(f"Safety stock calculation error: {e}")
        return 0, {'error': str(e)}

def calculate_eoq(
        annual_demand: float,
        ordering_cost: float,
        holding_cost_per_unit: float,
        lead_time_days: int = 7
) -> Tuple[int, Dict[str, Any]]:
    """
    Calculate Economic Order Quantity (EOQ)

    Args:
        annual_demand: Annual demand quantity
        ordering_cost: Cost per order
        holding_cost_per_unit: Annual holding cost per unit
        lead_time_days: Lead time in days

    Returns:
        Tuple of (eoq, calculation_details)
    """
    try:
        # EOQ = sqrt(2 * D * S / H)
        eoq = max(1, int(round(np.sqrt(2 * annual_demand * ordering_cost / holding_cost_per_unit))))

        # Reorder point
        daily_demand = annual_demand / 365
        reorder_point = int(daily_demand * lead_time_days)

        # Total cost
        total_ordering_cost = (annual_demand / eoq) * ordering_cost
        total_holding_cost = (eoq / 2) * holding_cost_per_unit
        total_cost = total_ordering_cost + total_holding_cost

        details = {
            'annual_demand': annual_demand,
            'ordering_cost': ordering_cost,
            'holding_cost_per_unit': holding_cost_per_unit,
            'lead_time_days': lead_time_days,
            'daily_demand': daily_demand,
            'reorder_point': reorder_point,
            'eoq': eoq,
            'total_ordering_cost': float(total_ordering_cost),
            'total_holding_cost': float(total_holding_cost),
            'total_cost': float(total_cost),
            'orders_per_year': annual_demand / eoq
        }

        return eoq, details

    except Exception as e:
        logger.error(f"EOQ calculation error: {e}")
        return 0, {'error': str(e)}

def forecast_demand(
        historical_data: List[Dict[str, Any]],
        forecast_periods: int = 30,
        method: str = 'linear_regression',
        seasonality_weight: float = 0.3
) -> Tuple[List[float], Dict[str, Any]]:
    """
    Forecast future demand using multiple methods

    Args:
        historical_data: List of {'date': datetime, 'quantity': int}
        forecast_periods: Number of periods to forecast
        method: 'linear_regression', 'moving_average', 'exponential_smoothing', 'arima'
        seasonality_weight: Weight for seasonal component

    Returns:
        Tuple of (forecasted_values, forecast_details)
    """
    try:
        if not historical_data:
            return [0] * forecast_periods, {'error': 'No historical data'}

        df = pd.DataFrame(historical_data)
        df['date_numeric'] = pd.to_datetime(df['date']).map(lambda x: x.timestamp())
        df = df.sort_values('date_numeric')

        forecasted_values = []
        details = {'method': method, 'historical_points': len(df)}

        if method == 'linear_regression':
            X = df['date_numeric'].values.reshape(-1, 1)
            y = df['quantity'].values

            model = LinearRegression()
            model.fit(X, y)

            last_date = df['date_numeric'].iloc[-1]
            for i in range(forecast_periods):
                future_date = last_date + (i + 1) * 24 * 3600  # Daily forecast
                prediction = max(0, model.predict([[future_date]])[0])
                forecasted_values.append(float(prediction))

            details.update({
                'slope': float(model.coef_[0]),
                'intercept': float(model.intercept_),
                'r_squared': float(model.score(X, y))
            })

        elif method == 'moving_average':
            window = min(7, len(df))  # 7-day moving average
            recent_avg = df['quantity'].tail(window).mean()
            forecasted_values = [recent_avg] * forecast_periods
            details['window_size'] = window
            details['recent_average'] = float(recent_avg)

        elif method == 'exponential_smoothing':
            alpha = 0.3
            forecast = [df['quantity'].iloc[-1]]

            for i in range(1, forecast_periods):
                next_forecast = alpha * df['quantity'].iloc[-1] + (1 - alpha) * forecast[-1]
                forecast.append(next_forecast)

            forecasted_values = forecast
            details['alpha'] = alpha

        # Apply seasonality adjustment
        if seasonality_weight > 0 and len(df) > 7:
            seasonal_avg = df['quantity'].rolling(window=7).mean().iloc[-1]
            base_avg = df['quantity'].mean()
            seasonal_factor = seasonal_avg / base_avg if base_avg > 0 else 1
            forecasted_values = [
                val * (1 + seasonality_weight * (seasonal_factor - 1))
                for val in forecasted_values
            ]
            details['seasonal_factor'] = float(seasonal_factor)

        return forecasted_values, details

    except Exception as e:
        logger.error(f"Demand forecast error: {e}")
        return [0] * forecast_periods, {'error': str(e)}

# =============================================================================
# 🔢 BARCODE AND QR CODE GENERATION
# =============================================================================

def generate_barcode(
        stock_sku: str,
        barcode_type: str = 'code128',
        barcode_format: str = 'PNG',
        size: Tuple[int, int] = (200, 100)
) -> Optional[str]:
    """
    Generate barcode image for stock item

    Args:
        stock_sku: Stock SKU or ID
        barcode_type: 'code128', 'ean13', 'code39', 'qrcode'
        barcode_format: 'PNG', 'SVG', 'BASE64'
        size: Width, height for image

    Returns:
        Base64 encoded barcode image or None
    """
    try:
        if barcode_type == 'qrcode':
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(stock_sku)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
        else:
            # Standard barcode
            if barcode_type == 'ean13' and len(stock_sku) != 13:
                # Generate check digit for EAN13
                stock_sku = f"{stock_sku[:12]}{calculate_ean13_checksum(stock_sku[:12])}"

            barcode_class = getattr(barcode, barcode_type.replace('-', '_').upper())
            code = barcode_class(stock_sku, writer=ImageWriter())
            img = code.generate()

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()

        if barcode_format.upper() == 'BASE64':
            return f"data:image/png;base64,{img_str}"
        else:
            return img_str

    except Exception as e:
        logger.error(f"Barcode generation error for {stock_sku}: {e}")
        return None

def calculate_ean13_checksum(sku: str) -> str:
    """Calculate EAN-13 checksum digit"""
    if len(sku) != 12:
        raise ValueError("EAN-13 requires 12 digits")

    def calculate_checksum(digits: str) -> int:
        total = 0
        for i, digit in enumerate(digits):
            d = int(digit)
            if i % 2 == 0:
                total += d
            else:
                total += d * 3
        return (10 - (total % 10)) % 10

    return str(calculate_checksum(sku))

def generate_batch_barcode(batch_number: str, expiry_date: str) -> Optional[str]:
    """Generate barcode with batch and expiry information"""
    data = f"BATCH:{batch_number}|EXP:{expiry_date}"
    return generate_barcode(data, barcode_type='code128')

# =============================================================================
# ✅ DATA VALIDATION UTILITIES
# =============================================================================

def validate_stock_data(data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Comprehensive stock data validation

    Args:
        data: Dictionary containing stock data

    Returns:
        Tuple of (is_valid, validation_errors)
    """
    errors = []

    # Required fields
    required_fields = ['sku', 'name', 'category_id', 'unit_price']
    for field in required_fields:
        if not data.get(field):
            errors.append(f"{field} is required")

    # SKU validation
    if 'sku' in data:
        if len(data['sku']) < 3 or len(data['sku']) > 50:
            errors.append("SKU must be 3-50 characters")
        if not data['sku'].isalnum():
            errors.append("SKU must be alphanumeric")

    # Price validation
    if 'unit_price' in data:
        try:
            price = Decimal(str(data['unit_price']))
            if price < 0:
                errors.append("Unit price cannot be negative")
        except (ValueError, TypeError):
            errors.append("Unit price must be a valid number")

    # Quantity validation
    if 'quantity' in data:
        try:
            qty = int(data['quantity'])
            if qty < 0:
                errors.append("Quantity cannot be negative")
        except (ValueError, TypeError):
            errors.append("Quantity must be a valid integer")

    # Reorder level validation
    if 'reorder_level' in data and 'min_stock_level' in data:
        try:
            reorder = int(data['reorder_level'])
            min_level = int(data['min_stock_level'])
            if reorder < min_level:
                errors.append("Reorder level must be >= minimum stock level")
        except (ValueError, TypeError):
            errors.append("Reorder and minimum stock levels must be valid integers")

    # Batch expiry validation
    if 'expiry_date' in data:
        try:
            expiry = datetime.fromisoformat(data['expiry_date'].replace('Z', '+00:00'))
            if expiry < timezone.now():
                errors.append("Expiry date cannot be in the past")
        except ValueError:
            errors.append("Invalid expiry date format")

    # Check for duplicate SKU
    if 'sku' in data and not errors:
        from .models import Stock
        if Stock.objects.filter(sku=data['sku']).exists():
            errors.append(f"SKU {data['sku']} already exists")

    return len(errors) == 0, errors

def validate_bulk_import_data(df: pd.DataFrame) -> Tuple[bool, Dict[str, Any]]:
    """
    Validate bulk import DataFrame

    Returns:
        Tuple of (is_valid, validation_report)
    """
    validation_report = {
        'total_rows': len(df),
        'valid_rows': 0,
        'invalid_rows': 0,
        'errors': [],
        'warnings': [],
        'required_columns': ['sku', 'name', 'quantity', 'unit_price']
    }

    required_columns = validation_report['required_columns']
    missing_columns = [col for col in required_columns if col not in df.columns]

    if missing_columns:
        validation_report['errors'].append(f"Missing columns: {', '.join(missing_columns)}")
        return False, validation_report

    for idx, row in df.iterrows():
        is_valid, errors = validate_stock_data(row.to_dict())
        if is_valid:
            validation_report['valid_rows'] += 1
        else:
            validation_report['invalid_rows'] += 1
            validation_report['errors'].extend([
                f"Row {idx + 2}: {error}" for error in errors
            ])

    return validation_report['valid_rows'] == len(df), validation_report

# =============================================================================
# 📈 ANALYTICS AND REPORTING UTILITIES
# =============================================================================

def calculate_abc_analysis(
        transactions: List[Dict],
        value_thresholds: Dict[str, float] = None
) -> Dict[str, Any]:
    """
    Calculate ABC analysis classification

    Args:
        transactions: List of transaction dictionaries
        value_thresholds: Custom A/B/C thresholds

    Returns:
        ABC analysis results
    """
    default_thresholds = {'A': 0.80, 'B': 0.95}
    thresholds = value_thresholds or default_thresholds

    # Calculate item values
    item_values = {}
    total_value = 0

    for transaction in transactions:
        sku = transaction.get('stock__sku')
        quantity = transaction.get('quantity', 0)
        unit_price = transaction.get('unit_price', 0)
        value = quantity * unit_price

        item_values[sku] = item_values.get(sku, 0) + value
        total_value += value

    # Sort by value and calculate percentages
    sorted_items = sorted(item_values.items(), key=lambda x: x[1], reverse=True)
    abc_results = []
    cumulative_value = 0

    for i, (sku, value) in enumerate(sorted_items):
        cumulative_value += value
        percentage = cumulative_value / total_value if total_value > 0 else 0

        if percentage <= thresholds['A']:
            category = 'A'
        elif percentage <= thresholds['B']:
            category = 'B'
        else:
            category = 'C'

        abc_results.append({
            'sku': sku,
            'value': float(value),
            'percentage': float(percentage),
            'category': category,
            'rank': i + 1
        })

    # Summary statistics
    categories = {'A': 0, 'B': 0, 'C': 0}
    category_values = {'A': 0, 'B': 0, 'C': 0}

    for item in abc_results:
        categories[item['category']] += 1
        category_values[item['category']] += item['value']

    return {
        'items': abc_results,
        'summary': {
            'total_items': len(abc_results),
            'total_value': float(total_value),
            'categories': categories,
            'category_values': {k: float(v) for k, v in category_values.items()}
        },
        'thresholds': thresholds
    }

def calculate_inventory_metrics(warehouse_id: str = None) -> Dict[str, Any]:
    """
    Calculate comprehensive inventory performance metrics
    """
    filters = {}
    if warehouse_id:
        filters['warehouse_id'] = warehouse_id

    # Current inventory metrics
    current_stock = WarehouseStock.objects.filter(**filters).aggregate(
        total_items=Count('id'),
        total_quantity=Sum('quantity'),
        total_value=Sum(F('quantity') * F('unit_price')),
        critical_items=Count('id', filter=Q(quantity__lte=F('stock__reorder_level')))
    )

    # Turnover metrics (last 12 months)
    year_ago = timezone.now() - timedelta(days=365)
    turnover_data = StockTransaction.objects.filter(
        created_at__gte=year_ago,
        **filters,
        transaction_type__in=['sale', 'issue']
    ).aggregate(
        total_outbound=Sum('quantity'),
        cogs=Sum(F('quantity') * F('unit_price'))
    )

    avg_inventory_value = current_stock['total_value'] / 2 if current_stock['total_value'] else 0
    turnover_ratio = turnover_data['cogs'] / avg_inventory_value if avg_inventory_value > 0 else 0
    doi = 365 / turnover_ratio if turnover_ratio > 0 else 0

    return {
        'current_inventory': {
            'total_items': current_stock['total_items'] or 0,
            'total_quantity': current_stock['total_quantity'] or 0,
            'total_value': float(current_stock['total_value'] or 0),
            'critical_items': current_stock['critical_items'] or 0,
            'inventory_turnover': float(turnover_ratio),
            'days_inventory_outstanding': float(doi)
        },
        'timestamp': timezone.now().isoformat()
    }

# =============================================================================
# 🛡️ DATA INTEGRITY UTILITIES
# =============================================================================

def detect_stock_discrepancies(warehouse_id: str = None) -> List[Dict[str, Any]]:
    """
    Detect potential stock discrepancies

    Returns:
        List of discrepancy reports
    """
    discrepancies = []

    warehouse_stocks = WarehouseStock.objects.filter(
        stock__is_active=True,
        quantity__gt=0
    )

    if warehouse_id:
        warehouse_stocks = warehouse_stocks.filter(warehouse_id=warehouse_id)

    for ws in warehouse_stocks:
        # Check 1: Reserved vs Available
        if ws.reserved_quantity > ws.quantity:
            discrepancies.append({
                'type': 'reserved_exceeds_available',
                'stock_id': str(ws.stock_id),
                'sku': ws.stock.sku,
                'warehouse_id': str(ws.warehouse_id),
                'available': ws.quantity,
                'reserved': ws.reserved_quantity,
                'discrepancy': ws.reserved_quantity - ws.quantity,
                'severity': 'high'
            })

        # Check 2: Negative quantities in transactions
        recent_transactions = StockTransaction.objects.filter(
            stock=ws.stock,
            warehouse=ws.warehouse,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).aggregate(total_qty=Sum('quantity'))

        if recent_transactions['total_qty'] and recent_transactions['total_qty'] < 0:
            discrepancies.append({
                'type': 'negative_transactions',
                'stock_id': str(ws.stock_id),
                'sku': ws.stock.sku,
                'warehouse_id': str(ws.warehouse_id),
                'recent_total': recent_transactions['total_qty'],
                'current_quantity': ws.quantity,
                'severity': 'medium'
            })

    return discrepancies

def reconcile_stock_levels(warehouse_id: str = None, dry_run: bool = True) -> Dict[str, Any]:
    """
    Reconcile and fix stock level discrepancies

    Args:
        warehouse_id: Specific warehouse to reconcile
        dry_run: If True, only report what would be fixed

    Returns:
        Reconciliation report
    """
    report = {
        'total_items_checked': 0,
        'items_fixed': 0,
        'corrections_made': [],
        'dry_run': dry_run,
        'timestamp': timezone.now().isoformat()
    }

    discrepancies = detect_stock_discrepancies(warehouse_id)

    for discrepancy in discrepancies:
        if discrepancy['type'] == 'reserved_exceeds_available':
            stock_id = discrepancy['stock_id']
            warehouse_id = discrepancy['warehouse_id']
            excess_reserved = discrepancy['discrepancy']

            ws = WarehouseStock.objects.get(
                stock_id=stock_id,
                warehouse_id=warehouse_id
            )

            if not dry_run:
                old_reserved = ws.reserved_quantity
                ws.reserved_quantity = max(0, ws.reserved_quantity - excess_reserved)
                ws.save(update_fields=['reserved_quantity'])

                # Log correction
                StockTransaction.objects.create(
                    stock_id=stock_id,
                    warehouse_id=warehouse_id,
                    transaction_type='reconciliation',
                    quantity=excess_reserved,
                    reference='reserved_excess_correction',
                    notes=f'Fixed reserved > available: {old_reserved} -> {ws.reserved_quantity}'
                )

                report['items_fixed'] += 1
                report['corrections_made'].append({
                    'stock_id': stock_id,
                    'action': 'reduced_reserved_quantity',
                    'old_value': old_reserved,
                    'new_value': ws.reserved_quantity,
                    'difference': excess_reserved
                })

    report['total_items_checked'] = len(detect_stock_discrepancies(warehouse_id))
    return report

# =============================================================================
# 📊 VISUALIZATION UTILITIES
# =============================================================================

def generate_inventory_dashboard_charts(
        warehouse_id: str = None,
        days: int = 30
) -> Dict[str, str]:
    """
    Generate dashboard charts as base64 images

    Returns:
        Dictionary of chart_name: base64_image
    """
    charts = {}

    try:
        # Prepare data
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        transactions = StockTransaction.objects.filter(
            created_at__range=[start_date, end_date]
        )

        if warehouse_id:
            transactions = transactions.filter(warehouse_id=warehouse_id)

        df = pd.DataFrame(list(transactions.values(
            'created_at', 'quantity', 'transaction_type'
        )))
        df['date'] = pd.to_datetime(df['created_at']).dt.date
        daily_data = df.groupby(['date', 'transaction_type']).agg({
            'quantity': 'sum'
        }).reset_index()

        # Chart 1: Daily Movement
        plt.figure(figsize=(12, 6))
        daily_pivot = daily_data.pivot(index='date', columns='transaction_type', values='quantity').fillna(0)
        daily_pivot.plot(kind='line', marker='o')
        plt.title('Daily Stock Movement')
        plt.xlabel('Date')
        plt.ylabel('Quantity')
        plt.xticks(rotation=45)
        plt.tight_layout()

        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        charts['daily_movement'] = base64.b64encode(buffer.getvalue()).decode()
        plt.close()

        # Chart 2: Transaction Type Distribution
        plt.figure(figsize=(10, 6))
        type_counts = df['transaction_type'].value_counts()
        plt.pie(type_counts.values, labels=type_counts.index, autopct='%1.1f%%')
        plt.title('Transaction Type Distribution')

        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        charts['transaction_distribution'] = base64.b64encode(buffer.getvalue()).decode()
        plt.close()

    except Exception as e:
        logger.error(f"Dashboard chart generation error: {e}")
        charts = {'error': str(e)}

    return charts

# =============================================================================
# 🔍 ADVANCED UTILITIES
# =============================================================================

def generate_stock_hash(stock_data: Dict[str, Any]) -> str:
    """Generate hash for stock data integrity checking"""
    data_string = json.dumps(stock_data, sort_keys=True, default=str)
    return hashlib.sha256(data_string.encode()).hexdigest()

def compress_stock_image(image_path: str, quality: int = 85) -> Optional[str]:
    """Compress stock images for storage"""
    try:
        img = Image.open(image_path)
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=quality, optimize=True)
        return base64.b64encode(buffer.getvalue()).decode()
    except Exception as e:
        logger.error(f"Image compression error: {e}")
        return None

def scan_barcode_from_image(image_path: str) -> Optional[str]:
    """
    Scan barcode from product image using OpenCV
    """
    try:
        image = cv2.imread(image_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Barcode detection
        barcodes = pyzbar.decode(gray)

        for barcode in barcodes:
            return barcode.data.decode('utf-8')

        return None
    except Exception as e:
        logger.error(f"Barcode scanning error: {e}")
        return None

# =============================================================================
# 🚀 PERFORMANCE UTILITIES
# =============================================================================

class StockCacheManager:
    """Advanced caching manager for stock operations"""

    @staticmethod
    def get_warehouse_summary_cache_key(warehouse_id: str) -> str:
        return f"warehouse_summary_{warehouse_id}"

    @staticmethod
    def get_stock_cache_key(stock_id: str, warehouse_id: str) -> str:
        return f"stock_{stock_id}_{warehouse_id}"

    @staticmethod
    def invalidate_stock_cache(stock_id: str = None, warehouse_id: str = None):
        """Smart cache invalidation"""
        if stock_id and warehouse_id:
            cache_key = StockCacheManager.get_stock_cache_key(stock_id, warehouse_id)
            cache.delete(cache_key)
        elif warehouse_id:
            cache_key = StockCacheManager.get_warehouse_summary_cache_key(warehouse_id)
            cache.delete(cache_key)
            # Invalidate all stock items in warehouse
            cache_pattern = f"stock_*_{warehouse_id}"
            # Redis pattern delete would go here

# =============================================================================
# 📧 NOTIFICATION UTILITIES
# =============================================================================

def format_stock_alert_message(alert: StockAlert) -> Dict[str, Any]:
    """Format alert message for different channels"""
    messages = {
        'email': {
            'subject': f"🚨 {alert.severity.upper()} Stock Alert: {alert.stock.name}",
            'body': f"""
            Stock Alert: {alert.message}
            
            Stock: {alert.stock.name} ({alert.stock.sku})
            Current Quantity: {alert.current_quantity}
            Reorder Level: {alert.stock.reorder_level}
            Severity: {alert.severity}
            Timestamp: {alert.created_at}
            """
        },
        'sms': f"🚨 {alert.stock.name}: {alert.message}",
        'websocket': {
            'type': 'critical_stock_alert',
            'alert': {
                'id': str(alert.id),
                'stock_id': str(alert.stock_id),
                'message': alert.message,
                'severity': alert.severity,
                'timestamp': alert.created_at.isoformat()
            }
        }
    }
    return messages.get(alert.alert_type, messages['email'])

# =============================================================================
# 🧪 ADVANCED THROTTLE UTILITIES
# =============================================================================

class AdaptiveThrottleMixin:
    """Mixin for adaptive throttling based on system load"""

    async def get_system_load_factor(self) -> float:
        """Calculate system load factor (0.0 - 2.0)"""
        try:
            import psutil
            cpu_load = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()

            # Redis queue length
            queue_length = 0
            try:
                queue_length = int(cache.client.llen('celery'))
            except:
                pass

            # Combined load factor
            cpu_factor = min(2.0, cpu_load / 80.0)
            memory_factor = min(2.0, memory.percent / 85.0)
            queue_factor = min(2.0, queue_length / 100.0)

            return max(cpu_factor, memory_factor, queue_factor)
        except:
            return 1.0

    def adjust_rate_for_load(self, base_rate: str) -> str:
        """Adjust rate based on system load"""
        load_factor = asyncio.get_event_loop().run_until_complete(
            self.get_system_load_factor()
        )

        if load_factor > 1.5:
            # High load - reduce by 50%
            num, period = base_rate.split('/')
            return f"{int(int(num) * 0.5)}/{period}"
        elif load_factor > 1.2:
            # Medium load - reduce by 25%
            num, period = base_rate.split('/')
            return f"{int(int(num) * 0.75)}/{period}"

        return base_rate


# Export main functions
__all__ = [
    # Optimization
    'calculate_safety_stock',
    'calculate_eoq',
    'forecast_demand',

    # Barcode/QR
    'generate_barcode',
    'generate_batch_barcode',
    'calculate_ean13_checksum',

    # Validation
    'validate_stock_data',
    'validate_bulk_import_data',

    # Analytics
    'calculate_abc_analysis',
    'calculate_inventory_metrics',

    # Integrity
    'detect_stock_discrepancies',
    'reconcile_stock_levels',

    # Visualization
    'generate_inventory_dashboard_charts',

    # Utilities
    'generate_stock_hash',
    'StockCacheManager',
    'format_stock_alert_message'
]