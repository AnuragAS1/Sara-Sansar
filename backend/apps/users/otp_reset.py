"""OTP-based password reset. Stores OTP in Django cache (5-min TTL)."""
import random, string
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings

OTP_TTL = 300

def _key(email): return f"gs_otp_{email.lower().strip()}"

def generate_and_send_otp(email):
    otp = "".join(random.choices(string.digits, k=6))
    cache.set(_key(email), otp, timeout=OTP_TTL)
    subject = "Sara Sansar — Your password reset code"
    body = f"Your Sara Sansar password reset code is: {otp}\n\nThis code expires in 5 minutes."
    try:
        send_mail(subject, body, getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@sarasansar.np"), [email], fail_silently=True)
    except Exception:
        pass
    return otp

def verify_otp(email, otp):
    stored = cache.get(_key(email))
    return stored is not None and stored == otp.strip()

def consume_otp(email):
    cache.delete(_key(email))
