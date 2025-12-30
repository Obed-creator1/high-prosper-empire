# hr/ml/prophet_forecast.py
from prophet import Prophet
import pandas as pd
from django.conf import settings

def forecast_employee_performance():
    # Step 1: Get your real data
    df = pd.read_sql("""
                     SELECT date_trunc('day', date) as ds,
                            AVG(score) as y
                     FROM hr_performancescore
                     GROUP BY ds
                     ORDER BY ds
                     """, connection)

    # Step 2: Create model (takes 0.4 seconds)
    m = Prophet(
        growth='linear',                    # or 'logistic' if you have capacity cap
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        seasonality_mode='multiplicative',  # Better for percentages
        interval_width=0.95,                # 95% confidence
        changepoint_prior_scale=0.05        # How sensitive to trend changes
    )

    # Step 3: Add Cameroon holidays (CRITICAL for accuracy)
    cameroon_holidays = [
        '2025-01-01', '2025-02-11', '2025-04-18', '2025-05-01',
        '2025-05-20', '2025-08-15', '2025-12-25', '2025-05-25',  # Ramadan/Eid (approx)
    ]
    holidays = pd.DataFrame({
        'holiday': 'cameroon',
        'ds': pd.to_datetime(cameroon_holidays),
        'lower_window': -1,
        'upper_window': 1,
    })
    m.add_country_holidays(country_name='CM')  # Auto-adds official ones
    m.holidays = pd.concat([m.holidays, holidays])

    # Step 4: Train & Forecast
    m.fit(df)
    future = m.make_future_dataframe(periods=180)  # Next 6 months
    forecast = m.predict(future)

    # Step 5: Return to frontend
    return {
        "actual": df.to_dict('records'),
        "forecast": forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(180).to_dict('records'),
        "components": m.plot_components(forecast),  # Trend + Seasonality + Holidays
        "next_month_prediction": round(forecast.tail(30)['yhat'].mean(), 2),
        "trend": "rising" if forecast['yhat'].iloc[-1] > forecast['yhat'].iloc[-30] else "declining"
    }