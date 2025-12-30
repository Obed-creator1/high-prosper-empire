# drones/payment_drop.py
from customers.models import Customer
from payments.models import Payment, PaymentMethod


def dispatch_cash_drone(customer_id, amount_rwf):
    customer = Customer.objects.get(id=customer_id)

    drone = DroneFleet.objects.assign_nearest_available(
        lat=customer.gps_lat,
        lng=customer.gps_lng
    )

    drone.load_cash(amount_rwf)  # Physical RWF notes in secure box
    drone.load_receipt(customer.latest_invoice)
    drone.mission_type = "CASH_COLLECTION"
    drone.launch()

    # Drone arrives → customer pays cash → drone scans notes → confirms on-chain
    if drone.payment_verified:
        Payment.objects.create(
            customer=customer,
            amount=amount_rwf,
            method=PaymentMethod.objects.get(name='drone_cash'),
            status='Successful',
            metadata={"drone_id": drone.id, "gps_drop": drone.drop_coords}
        )
        mint_hpc_for_payment(payment)  # Instant HPC reward to customer