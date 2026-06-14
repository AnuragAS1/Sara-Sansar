"""User + AgentProfile models (demo version, SQLite-friendly)."""
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import RegexValidator
from django.db import models


NEPAL_PHONE_VALIDATOR = RegexValidator(
    regex=r"^\+977[-\s]?9\d{2}[-\s]?\d{7}$",
    message="Enter a valid Nepal mobile number, e.g. +977-98XXXXXXXX",
)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        return self._create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True, validators=[NEPAL_PHONE_VALIDATOR])

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_agent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # email + password is enough; name/phone collected post-signup

    def __str__(self):
        return self.email


class AgentProfile(models.Model):
    PRICING_BASIC = "basic"
    PRICING_STANDARD = "standard"
    PRICING_PREMIUM = "premium"
    PRICING_CHOICES = [
        (PRICING_BASIC, "Basic"),
        (PRICING_STANDARD, "Standard"),
        (PRICING_PREMIUM, "Premium"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="agent_profile")
    agency_name = models.CharField(max_length=160, blank=True)
    license_number = models.CharField(max_length=60, blank=True)
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to="agents/", blank=True, null=True)

    contact_phone = models.CharField(max_length=20, validators=[NEPAL_PHONE_VALIDATOR])
    whatsapp_number = models.CharField(max_length=20, blank=True)
    viber_number = models.CharField(max_length=20, blank=True)

    pricing_tier = models.CharField(max_length=20, choices=PRICING_CHOICES, default=PRICING_BASIC)

    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} — {self.agency_name or 'Independent'}"


class AgentMembership(models.Model):
    """Tracks agent subscription status with trial + paid plans."""
    PLAN_TRIAL = "trial"
    PLAN_BASIC = "basic"
    PLAN_STANDARD = "standard"
    PLAN_PREMIUM = "premium"
    PLAN_CHOICES = [
        (PLAN_TRIAL, "Trial (30 days)"),
        (PLAN_BASIC, "Basic — NPR 999/mo"),
        (PLAN_STANDARD, "Standard — NPR 2,499/mo"),
        (PLAN_PREMIUM, "Premium — NPR 4,999/mo"),
    ]

    STATUS_ACTIVE = "active"
    STATUS_EXPIRED = "expired"
    STATUS_CANCELLED = "cancelled"
    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    PAYMENT_ESEWA = "esewa"
    PAYMENT_KHALTI = "khalti"
    PAYMENT_STRIPE = "stripe"
    PAYMENT_BANK = "bank_transfer"
    PAYMENT_CHOICES = [
        (PAYMENT_ESEWA, "eSewa"),
        (PAYMENT_KHALTI, "Khalti"),
        (PAYMENT_STRIPE, "Stripe / Card"),
        (PAYMENT_BANK, "Bank Transfer"),
    ]

    agent = models.OneToOneField(AgentProfile, on_delete=models.CASCADE, related_name="membership")
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=PLAN_TRIAL)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, blank=True)

    trial_start = models.DateTimeField(auto_now_add=True)
    trial_end = models.DateTimeField(null=True, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)

    # Payment reference IDs
    esewa_ref = models.CharField(max_length=100, blank=True)
    khalti_ref = models.CharField(max_length=100, blank=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)

    max_listings = models.PositiveIntegerField(default=5, help_text="Max active listings for this plan")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.agent.user.email} — {self.get_plan_display()} ({self.status})"

    @property
    def is_active(self):
        from django.utils import timezone
        if self.status != self.STATUS_ACTIVE:
            return False
        if self.plan == self.PLAN_TRIAL and self.trial_end:
            return timezone.now() < self.trial_end
        if self.current_period_end:
            return timezone.now() < self.current_period_end
        return True

    @property
    def plan_limits(self):
        limits = {
            self.PLAN_TRIAL: {"listings": 3, "photos_per_listing": 5},
            self.PLAN_BASIC: {"listings": 10, "photos_per_listing": 10},
            self.PLAN_STANDARD: {"listings": 50, "photos_per_listing": 20},
            self.PLAN_PREMIUM: {"listings": 999, "photos_per_listing": 50},
        }
        return limits.get(self.plan, limits[self.PLAN_TRIAL])
