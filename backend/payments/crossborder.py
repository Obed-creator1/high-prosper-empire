def initiate_crossborder_payment(customer, amount, destination_country):
    # Route based on country
    if destination_country == "TZ":
        return mpesa_tanzania_pay(customer.phone, amount)
    elif destination_country == "KE":
        return mpesa_kenya_stk_push(customer.phone, amount)
    elif destination_country == "UG":
        return mtn_uganda_momo(customer.phone, amount)
    elif destination_country == "RW":
        return mtn_rwanda_momo(customer.phone, amount)
    elif destination_country == "BI":
        return ecocash_burundi(customer.phone, amount)