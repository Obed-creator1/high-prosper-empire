# payments/signals.py
from decimal import Decimal
from django.contrib.humanize.templatetags.humanize import intcomma
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment
from customers.models import Customer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from users.models import CustomUser
from notifications.models import Notification

@receiver(post_save, sender=Payment)
def payment_updated(sender, instance, created, **kwargs):
    if not created:
        return  # Only notify on new payments

    customer = instance.customer
    collector = customer.village.collector if customer.village else None

    title = "New Payment Received"
    message = f"RWF {instance.amount} paid by {customer.name} ({customer.phone})"
    action = "payment_success" if instance.status == "Successful" else "payment_pending"

    # Notify admins & managers
    for user in CustomUser.objects.filter(role__in=['admin', 'ceo', 'manager']):
        Notification.objects.create(
            user=user,
            title=title,
            message=message,
            action=action,
            related_customer=customer
        )

    # Notify collector
    if collector:
        Notification.objects.create(
            user=collector,
            title=title,
            message=message,
            action=action,
            related_customer=customer
        )

    # Notify customer
    if customer.user:
        Notification.objects.create(
            user=customer.user,
            title="Payment Received",
            message=f"Your payment of RWF {instance.amount} has been {instance.status.lower()}",
            action=action,
            related_customer=customer
        )

    # Broadcast to notification channel
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "notifications",
        {
            "type": "notification_update",
            "notification": {
                "id": Notification.objects.last().id,
                "title": title,
                "message": message,
                "notification_type": action,
                "created_at": instance.created_at.isoformat(),
                "is_read": False
            }
        }
    )

@receiver(post_save, sender=Payment)
def handle_overpayment_hpc_credit(sender, instance, created, **kwargs):
    """
    If payment causes overpayment on invoice, mint HPC credit for the excess
    """
    if not created:  # Only on new payments
        return

    if instance.status != 'Successful':
        return

    if not instance.invoice:
        return

    invoice = instance.invoice
    invoice.refresh_from_db()  # Get latest paid_amount

    if invoice.remaining < 0:  # Overpaid
        overpayment = abs(invoice.remaining)

        customer = instance.customer
        if not customer.hpc_wallet_address:
            return  # No wallet

        # Mint HPC = overpayment amount
        from blockchain.hpc import mint_hpc
        try:
            mint_hpc(
                to_address=customer.hpc_wallet_address,
                amount=overpayment,
                reason=f"Overpayment credit - Invoice {invoice.uid}"
            )

            # Notify customer
            from notifications.utils import send_notification_with_fallback
            send_notification_with_fallback(
                customer.user,
                "HPC Credit Received! 🎉",
                f"You overpaid RWF {intcomma(overpayment)} on invoice {invoice.uid}.\n"
                f"This has been credited as HPC to your wallet!",
                "/wallet"
            )
        except Exception as e:
            print(f"HPC mint failed for overpayment: {e}")

@receiver(post_save, sender=Payment)
def reward_early_payment(sender, instance, created, **kwargs):
    if not created or instance.status != 'Successful' or not instance.invoice:
        return

    days_early = (instance.invoice.due_date - timezone.now().date()).days

    if days_early <= 0:
        return

    # Use Decimal for all calculations
    reward_rate = Decimal('0.005')  # 0.5% per month early
    reward_months = Decimal(days_early) / Decimal('30')
    reward_hpc = instance.amount * reward_rate * reward_months

    min_reward = Decimal('100')  # Minimum 100 HPC
    if reward_hpc < min_reward:
        return

    customer = instance.customer
    if not customer.hpc_wallet_address:
        return

    # Mint HPC
    from blockchain.hpc import mint_hpc
    try:
        mint_hpc(
            to_address=customer.hpc_wallet_address,
            amount=reward_hpc.quantize(Decimal('1')),  # Round to whole HPC
            reason=f"Early payment reward (+{days_early} days) - Invoice {instance.invoice.uid}"
        )

        # Notify
        from notifications.utils import send_notification_with_fallback
        send_notification_with_fallback(
            customer.user,
            "HPC Reward Earned! 🎉",
            f"You paid {days_early} days early — earned {reward_hpc.quantize(Decimal('1')):,} HPC!",
            "/wallet"
        )
    except Exception as e:
        print(f"HPC reward mint failed: {e}")

@receiver(post_save, sender=Payment)
def calculate_collector_commission(sender, instance, created, **kwargs):
    """
    Collector gets 10% commission on EVERY successful payment they collect in the field.
    Paid instantly to their wallet.
    """
    if instance.status == 'Successful' and hasattr(instance, 'collector') and instance.collector:
        collector = instance.collector

        # 10% flat commission
        commission_rate = Decimal('0.10')  # 10%
        commission_amount = instance.amount * commission_rate

        if commission_amount > 0:
            # Add to collector's wallet (you have a wallet_balance field or similar)
            collector.wallet_balance += commission_amount
            collector.save(update_fields=['wallet_balance'])

            # Optional: Log commission payment
            CommissionLog.objects.create(
                collector=collector,
                payment=instance,
                amount=commission_amount,
                percentage=10
            )

            # Optional: Extra HPC bonus for high performers (keep your early bonus separate if needed)
            # Example: 50 HPC per RWF 50,000 collected
            hpc_bonus = int(commission_amount // 50000) * 50
            if hpc_bonus > 0:
                mint_hpc(
                    to_address=collector.hpc_wallet_address,
                    amount=hpc_bonus,
                    reason=f"10% commission bonus - Payment {instance.reference}"
                )

            # Notify collector instantly
            from notifications.utils import send_notification_with_fallback
            send_notification_with_fallback(
                collector,
                "Commission Earned! 💰",
                f"You collected RWF {intcomma(instance.amount)} → Earned RWF {intcomma(commission_amount)} commission (10%)!\n"
                f"{hpc_bonus > 0 and f'Plus {hpc_bonus} HPC bonus!' or ''}",
                "/collector/wallet"
            )


@receiver(post_save, sender=Payment)
def handle_collector_commission_and_payout(sender, instance, created, **kwargs):
    if instance.status == 'Successful' and hasattr(instance, 'collector') and instance.collector:
        collector = instance.collector

        # Calculate 10% commission
        commission = instance.amount * Decimal('0.10')

        if commission > 0:
            # Save to wallet
            collector.wallet_balance += commission
            collector.save(update_fields=['wallet_balance'])

            # INSTANT MOMO PAYOUT
            success = MoMoPayoutService.payout_to_collector(
                collector=collector,
                amount=commission,
                reference=f"COMM-{instance.reference}"
            )

            # Notify collector
            status_text = "paid instantly to your MoMo!" if success else "added to your wallet (payout queued)"
            send_notification_with_fallback(
                collector,
                "Commission Paid! 💸",
                f"You earned RWF {intcomma(commission)} commission — {status_text}\n"
                f"Keep collecting!",
                "/collector/wallet"
            )