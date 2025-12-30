# fleet/predictive_maintenance.py
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from joblib import dump, load
from datetime import date

from .models import Vehicle, FuelLog

def train_maintenance_model():
    # Gather historical vehicle data
    logs = FuelLog.objects.all().values('vehicle__id', 'fuel_amount', 'odometer_reading', 'date')
    df = pd.DataFrame(logs)

    if df.empty:
        return None

    # Create target variable: needs_service (1 if vehicle had service within next 30 days)
    # This is simplified; in production, use actual service history
    df['needs_service'] = df['odometer_reading'].diff().fillna(0) > 1000  # example threshold

    X = df[['fuel_amount', 'odometer_reading']]
    y = df['needs_service']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)

    dump(model, 'fleet/maintenance_model.joblib')
    print("Predictive maintenance model trained.")

def predict_vehicle_maintenance(vehicle_id, fuel_amount, odometer_reading):
    try:
        model = load('fleet/maintenance_model.joblib')
    except:
        train_maintenance_model()
        model = load('fleet/maintenance_model.joblib')

    pred = model.predict([[fuel_amount, odometer_reading]])
    return bool(pred[0])
