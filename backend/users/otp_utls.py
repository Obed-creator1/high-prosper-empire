import random
from django.utils import timezone
from datetime import timedelta
from .models import OTP


def generate_otp(user):
    # Clear previous unused OTPs
    OTP.objects.filter(user=user, is_used=False).delete()

    code = str(random.randint(100000, 999999))
    expires_at = timezone.now() + timedelta(minutes=5)
    otp = OTP.objects.create(user=user, code=code, expires_at=expires_at)
    return otp
