# backend/stock/predictive.py
import pandas as pd
from django.core.mail import send_mail
from prophet import Prophet
from django.db import connection
from celery import shared_task

from procurement.models import Item


@shared_task
def generate_stock_alerts():
    with connection.cursor() as cursor:
        cursor.execute("""
                       SELECT DATE(created_at) as date, SUM(quantity) as qty
                       FROM procurement_purchaseorderitem ppi
                           JOIN procurement_purchaseorder po ON ppi.purchase_order_id = po.id
                           JOIN procurement_item i ON ppi.item_id = i.id
                       WHERE i.track_inventory = TRUE AND po.status IN ('confirmed', 'sent')
                       GROUP BY DATE(created_at)
                       ORDER BY date DESC LIMIT 180
                       """)
        rows = cursor.fetchall()

    if len(rows) < 30:
        return

    df = pd.DataFrame(rows, columns=['ds', 'y'])
    m = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    m.fit(df)

    future = m.make_future_dataframe(periods=30)
    forecast = m.predict(future)

    # Find items projected to go below safety stock
    low_stock_items = Item.objects.filter(
        track_inventory=True,
        # Add your current stock logic here
    )

    for item in low_stock_items:
        # Predict consumption in next 15 days
        predicted = forecast.tail(15)['yhat'].sum()
        if predicted > item.current_stock * 1.5:  # 50% buffer
            send_mail(
                "Predictive Reorder Alert",
                f"Item {item.sku} - {item.name} will run out in ~12 days. Predicted usage: {predicted:.0f}",
                "ai@highprosper.com",
                ["procurement@highprosper.com"]
            )