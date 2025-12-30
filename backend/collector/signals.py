# collector/signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Collector

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=User)
def create_or_update_collector_profile(sender, instance, created, **kwargs):
    """
    Automatically manage Collector profile based on user's role.

    - Creates a Collector profile when a user is created with role='collector'.
    - Creates a Collector profile if an existing user's role is changed to 'collector'.
    - Deletes the Collector profile if the user's role changes away from 'collector'.
    """
    # Skip if user is being created without a role yet (rare edge case)
    if not instance.role:
        return

    try:
        if instance.role == 'collector':
            # Create or retrieve the Collector profile
            collector, created_collector = Collector.objects.get_or_create(
                user=instance,
                defaults={
                    'is_active': True,
                    'joined_date': timezone.now(),
                    # Add any other defaults you want here
                    # e.g., 'rating': 0.0, 'efficiency_percentage': 0.0, etc.
                }
            )

            if created_collector:
                logger.info(f"Created Collector profile for user: {instance.username}")
            else:
                logger.debug(f"Collector profile already exists for user: {instance.username}")

        elif not created:  # Only on updates, not initial creation
            # Remove Collector profile if role is no longer 'collector'
            if Collector.objects.filter(user=instance).exists():
                Collector.objects.filter(user=instance).delete()
                logger.info(f"Deleted Collector profile for user: {instance.username} (role changed)")

    except Exception as e:
        logger.error(
            f"Error managing Collector profile for user {instance.username}: {str(e)}",
            exc_info=True
        )