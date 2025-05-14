from django.db import models
from django.core.validators import RegexValidator
from django_tenants.models import TenantMixin, DomainMixin
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from datetime import datetime, timedelta
from subscription_plan.models import SubscriptionPlan  # Import the SubscriptionPlan from subscription_plan app

# Create your models here.

class TenantManager(models.Manager):
    """Custom manager for the Tenant model to provide additional functionality."""
    def create_tenant(self, name, schema_name, **kwargs):
        """Create a new tenant with the given name and schema_name."""
        tenant = self.model(
            name=name,
            schema_name=schema_name,
            **kwargs
        )
        tenant.save()
        return tenant

class Tenant(TenantMixin):
    """
    Model representing a tenant in the multi-tenant SaaS ERP system.
    Inherits from TenantMixin provided by django-tenants.
    """
    auto_create_schema = True  # Ensure schemas are automatically created
    name = models.CharField(max_length=255, help_text="Name of the tenant/client")
    url_suffix = models.CharField(
        max_length=63,
        unique=True,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9-]+$',
                message='URL suffix can only contain letters, numbers, and hyphens.',
                code='invalid_url_suffix'
            ),
        ],
        help_text='Custom URL suffix for this tenant (e.g., "company-name" for company-name.example.com). '
                 'Only letters, numbers, and hyphens are allowed.'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('trial', 'Trial'),
        ('suspended', 'Suspended'),
        ('inactive', 'Inactive'),
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='trial',
        help_text="Current status of the tenant"
    )
    
    ENVIRONMENT_CHOICES = (
        ('development', 'Development'),
        ('testing', 'Testing'),
        ('staging', 'Staging'),
        ('production', 'Production'),
    )
    environment = models.CharField(
        max_length=20, 
        choices=ENVIRONMENT_CHOICES, 
        default='production',
        help_text="Environment where this tenant is deployed"
    )
    
    trial_end_date = models.DateField(
        null=True, 
        blank=True, 
        help_text='Date when the trial period ends'
    )
    
    paid_until = models.DateField(
        null=True, 
        blank=True, 
        help_text='Date until which the subscription is paid'
    )
    
    subscription_plan = models.ForeignKey(
        'subscription_plan.SubscriptionPlan',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tenants',
        help_text='The subscription plan this tenant is on'
    )
    
    client = models.ForeignKey(
        'CrmClient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tenants',
        help_text='The CRM client associated with this tenant'
    )
    
    # Field name in the model should match the database column name
    tenant_admin_email = models.EmailField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Email address of the tenant admin'
    )
    
    def __str__(self):
        return self.name
    
    objects = TenantManager()
    
    def save(self, *args, **kwargs):
        # If schema_name is not set, use the url_suffix as schema_name
        if not self.schema_name and self.url_suffix:
            self.schema_name = self.url_suffix
        
        # Call the parent save method
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'ecomm_superadmin_tenants'
        verbose_name = 'Tenant'
        verbose_name_plural = 'Tenants'

class User(AbstractUser):
    """
    Custom User model for the application.
    Extends Django's AbstractUser to add additional fields and functionality.
    """
    email = models.EmailField(unique=True)
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    # Use email as the username field
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']
    
    def __str__(self):
        return self.email
    
    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"

class CrmClient(models.Model):
    """
    CRM Client model for storing client information.
    """
    client_name = models.CharField(max_length=255)
    contact_person_email = models.EmailField(max_length=255)
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return self.client_name
    
    class Meta:
        db_table = 'ecomm_superadmin_crmclients'
        verbose_name = "CRM Client"
        verbose_name_plural = "CRM Clients"

class Application(models.Model):
    """
    Model to store application information in the public schema.
    """
    app_id = models.AutoField(primary_key=True)
    application_name = models.CharField(max_length=100)
    app_default_url = models.URLField(
        max_length=200, 
        help_text="Base URL of the application",
        default=""
    )
    app_secret_key = models.CharField(
        max_length=255, 
        help_text="Secret key for API authentication",
        default=""
    )
    app_endpoint_route = models.CharField(
        max_length=200, 
        help_text="Home route for the application",
        default=""
    )
    app_backend_url = models.URLField(
        max_length=200, 
        help_text="Backend URL for the application",
        default=""
    )
    migrate_schema_endpoint = models.CharField(
        max_length=200, 
        help_text="Home route for the application",
        default=""
    )
    
    description = models.TextField(
        blank=True, 
        null=True, 
        help_text="Description of the application"
    )
    client_id = models.IntegerField(
        default=1,
        help_text="ID of the client associated with this application"
    )
    company_id = models.IntegerField(
        default=1,
        help_text="ID of the company associated with this application"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
    updated_by = models.CharField(max_length=255, null=True, blank=True)

    def __str__(self):
        return self.application_name

    class Meta:
        db_table = 'application'
        verbose_name = "Application"
        verbose_name_plural = "Applications"

class TenantApplication(models.Model):
    """
    Model to manage the many-to-many relationship between Tenant and Application.
    """
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='tenant_applications')
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='tenant_applications')
    is_active = models.BooleanField(default=True, help_text="Whether this application is currently active for the tenant")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")

    def __str__(self):
        return f"{self.tenant.name} - {self.application.application_name}"

    class Meta:
        db_table = 'ecomm_superadmin_tenantapplication'
        verbose_name = "Tenant Application"
        verbose_name_plural = "Tenant Applications"
        unique_together = ('tenant', 'application')

class Domain(DomainMixin):
    """
    Domain model for django_tenants compatibility.
    Maps domains to tenants for routing.
    """
    tenant = models.ForeignKey(
        Tenant, 
        on_delete=models.CASCADE, 
        related_name='domains'
    )
    folder = models.CharField(max_length=100, null=True, blank=True, 
                             help_text="Subfolder name for this tenant (e.g., 'qa' for localhost/qa/)")
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        if self.folder:
            return f"{self.domain}/{self.folder}"
        return self.domain
    
    class Meta:
        db_table = 'ecomm_superadmin_domain'
        verbose_name = "Domain"
        verbose_name_plural = "Domains"
        unique_together = ('domain', 'folder')
