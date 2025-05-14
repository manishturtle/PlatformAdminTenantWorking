from django.db import models
from customers.models import Customer

# Create your models here.
class CredentialType(models.Model):
    # Status choices
    ACTIVE = 'Active'
    INACTIVE = 'Inactive'
    
    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (INACTIVE, 'Inactive'),
    ]
    
    # Fields
    ClientId = models.IntegerField(null=False, default=1)
    CompanyId = models.IntegerField(null=False, default=1)
    CredentialTypeId = models.AutoField(primary_key=True)
    CredentialTypeName = models.CharField(max_length=100, null=False)
    URL = models.URLField(max_length=255, null=True, blank=True)
    Status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=ACTIVE,
        null=False
    )
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=100, null=True, blank=True)
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=100, null=True, blank=True)
    
    def __str__(self):
        return self.CredentialTypeName
    
    class Meta:
        db_table = 'CredentialTypes'
        verbose_name = 'Credential Type'
        verbose_name_plural = 'Credential Types'

class Credential(models.Model):
    # Fields
    ClientId = models.IntegerField(null=False, default=1)
    CompanyId = models.IntegerField(null=False, default=1)
    CredentialId = models.AutoField(primary_key=True)
    CustomerId = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        db_column='CustomerId',
        related_name='credentials'
    )
    CredentialTypeId = models.ForeignKey(
        CredentialType,
        on_delete=models.PROTECT,
        db_column='CredentialTypeId',
        related_name='credentials'
    )

    UserName = models.CharField(max_length=255, null=False)
    Password = models.CharField(max_length=255, null=False)

    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=100, null=True, blank=True)
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=100, null=True, blank=True)
    
    # OTP codes
    EmailOTP = models.CharField(max_length=255, null=True, blank=True)
    MobileOTP = models.CharField(max_length=255, null=True, blank=True)
     
    def __str__(self):
        return f"{self.CustomerId} - {self.CredentialTypeId} - {self.UserName}"
    
    class Meta:
        db_table = 'Credentials'
        verbose_name = 'Credential'
        verbose_name_plural = 'Credentials'
