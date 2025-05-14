from django.db import models
from serviceagent.models import ServiceAgent

# Create your models here.
class Customer(models.Model):
    # Source choices
    EXISTING = 'Existing'
    REFERRAL = 'Referral'
    GOOGLE_ADS = 'Google Ads'
    WEBSITE = 'Website'
    ONLINE_PORTAL = 'Online Portal'
    CHANNEL_PARTNER = 'Channel Partner/Relative'
    OTHERS = 'Others'
    
    SOURCE_CHOICES = [
        (EXISTING, 'Existing'),
        (REFERRAL, 'Referral'),
        (GOOGLE_ADS, 'Google Ads'),
        (WEBSITE, 'Website'),
        (ONLINE_PORTAL, 'Online Portal'),
        (CHANNEL_PARTNER, 'Channel Partner/Relative'),
        (OTHERS, 'Others'),
    ]
    
    CUSTOMER_TYPE_CHOICES = [
        ('Lead', 'Lead'),
        ('Disqualified Lead', 'Disqualified Lead'),
        ('New', 'New'),
        ('Active', 'Active'),
        ('Dormant', 'Dormant'),
    ]
    
    # Primary Key
    CustomerID = models.AutoField(primary_key=True)
    
    # Foreign Keys
    ClientId = models.IntegerField()
    CompanyId = models.IntegerField()
    AccountOwner = models.ForeignKey(ServiceAgent, on_delete=models.SET_NULL, null=True, blank=True, related_name='owned_customers')
    
    # Customer Information
    FirstName = models.CharField(max_length=50)
    LastName = models.CharField(max_length=50)
    Email = models.EmailField(max_length=100, null=True, blank=True)
    Phone = models.CharField(max_length=20, null=True, blank=True)
    ReferredBy = models.CharField(max_length=100, null=True, blank=True, help_text="Name or ID of the person who referred this customer")
    Source = models.CharField(
        max_length=30,  
        choices=SOURCE_CHOICES,
        default=OTHERS,
    )
    ChannelPartner = models.CharField(max_length=100, null=True, blank=True, help_text="Name of the channel partner")
    AadharCard = models.CharField(max_length=16, null=True, blank=True, unique=True)
    PANCard = models.CharField(max_length=10, null=True, blank=True, unique=True)
    Password = models.CharField(max_length=64, null=True, blank=True, help_text="SHA-256 hashed password for customer portal access")
    AllowPortalAccess = models.BooleanField(default=True)
    ReferredBy = models.CharField(max_length=255, null=True, blank=True)
    EmailVerified = models.BooleanField(default=False)
    MobileVerified = models.BooleanField(default=False)
    CustomerType = models.CharField(
        max_length=20,
        choices=CUSTOMER_TYPE_CHOICES,
        default='Lead',
    )
    
    # Audit Fields
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=50)
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=50)
    
    def __str__(self):
        return f"{self.FirstName} {self.LastName}"
    
    class Meta:
        db_table = '"Customers"'  # Exact match with database table name
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
