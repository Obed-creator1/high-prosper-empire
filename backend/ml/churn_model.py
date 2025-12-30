# HIGH PROSPER AI – Churn Prediction 2026
from datetime import timedelta

import pandas as pd
from django.utils import timezone
from sklearn.ensemble import RandomForestClassifier
import joblib

def train_churn_model():
    from customers.models import Customer, Payment, Invoice

def generate_features():
    from customers.models import Customer
    data = []
    for customer in Customer.objects.all():
        last_payment_days = customer.days_delinquent
        balance = customer.balance
        monthly_fee = customer.monthly_fee
        complaints_last_6m = customer.complaints.filter(created_at__gte=timezone.now() - timedelta(days=180)).count()

        data.append({
            'days_delinquent': last_payment_days,
            'balance_ratio': balance / monthly_fee if monthly_fee else 0,
            'complaints_6m': complaints_last_6m,
            'risk_score': customer.risk_score,
            'churned': customer.status in ['Suspended', 'Terminated']  # label
        })
    df = pd.DataFrame(data)
    X = df.drop('churned', axis=1)
    y = df['churned']

    model = RandomForestClassifier(n_estimators=200, max_depth=10)
    model.fit(X, y)
    joblib.dump(model, 'churn_model_2026.pkl')
    return model