from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class FeatureGroup(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    app_id = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'feature_groups'

    def __str__(self):
        return self.name

    @classmethod
    def get_default_group(cls, app_id):
        """Get or create a default group for an application"""
        group, created = cls.objects.get_or_create(
            app_id=app_id,
            name='Default Group',
            defaults={'description': 'Default feature group'}
        )
        return group


class Feature(models.Model):
    group = models.ForeignKey(
        FeatureGroup, 
        on_delete=models.CASCADE, 
        related_name='features',
        null=True,
        blank=True
    )
    app_id = models.IntegerField()
    name = models.CharField(max_length=255)
    key = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    granual_settings = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'features'
        unique_together = (('app_id', 'key'),)

    def __str__(self):
        try:
            app = Application.objects.get(app_id=self.app_id)
            return f"{app.application_name} - {self.name}"
        except Application.DoesNotExist:
            return f"App {self.app_id} - {self.name}"

    def save(self, *args, **kwargs):
        # Ensure group exists
        if not self.group and self.app_id:
            self.group = FeatureGroup.get_default_group(self.app_id)
        super().save(*args, **kwargs)

    def get_subfeatures(self):
        """Get subfeatures from granual_settings"""
        return self.granual_settings.get('subfeatures', [])


class SubscriptionPlan(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('deprecated', 'Deprecated')
    ]
    
    BILLING_CYCLE_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
        ('one_time', 'One Time'),
        ('weekly', 'Weekly')
    ]
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    line_of_business = models.ForeignKey(
        'ecomm_superadmin.LineOfBusiness',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subscription_plans',
        help_text='The line of business this subscription plan belongs to'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='inactive')
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    valid_from = models.DateTimeField(default=timezone.now)
    valid_until = models.DateTimeField(null=True, blank=True)
    billing_cycle = models.CharField(
        max_length=20,
        choices=BILLING_CYCLE_CHOICES,
        help_text='Billing cycle for the subscription plan',
        null=False,
        blank=False
    )
    
    # System-wide settings
    max_users = models.IntegerField(validators=[MinValueValidator(1)])
    transaction_limit = models.IntegerField(validators=[MinValueValidator(0)])
    api_call_limit = models.IntegerField(validators=[MinValueValidator(0)])
    storage_limit = models.IntegerField(help_text="Storage limit in GB", validators=[MinValueValidator(0)])
    session_type = models.CharField(max_length=50, choices=[
        ('concurrent', 'Concurrent'),
        ('named', 'Named'),
    ])
    support_level = models.CharField(max_length=50, choices=[
        ('basic', 'Basic'),
        ('standard', 'Standard'),
        ('premium', 'Premium'),
    ])

    # Store additional settings as JSON
    granular_settings = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'subscription_plans'

    def __str__(self):
        return self.name

    def is_valid(self):
        now = timezone.now()
        return (
            self.status == 'active' and
            self.valid_from <= now and
            (self.valid_until is None or self.valid_until > now)
        )


class PlanFeatureEntitlement(models.Model):
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE, related_name='feature_entitlements')
    feature = models.ForeignKey(Feature, on_delete=models.CASCADE, related_name='plan_entitlements')
    granual_settings = models.JSONField(null=True, blank=True, default=dict)  # Override feature-specific settings for this plan
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'plan_feature_entitlements'

    def __str__(self):
        return f"{self.plan.name} - {self.feature.name}"
