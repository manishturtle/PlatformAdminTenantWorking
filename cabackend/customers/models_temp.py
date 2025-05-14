from django.db import models

# Create your models here.
class Customer(models.Model):
    # Choices for CustomerType field
    CUSTOMER_TYPE_CHOICES = [
        ('Lead', 'Lead'),
        ('Prospect', 'Prospect'),
        ('Customer', 'Customer'),
        ('Former Customer', 'Former Customer'),
    ]
    
    # Choices for Source field
    SOURCE_CHOICES = [
        ('Website', 'Website'),
        ('Referral', 'Referral'),
        ('Advertisement', 'Advertisement'),
        ('Cold Call', 'Cold Call'),
        ('Other', 'Other'),
    ]
    
    # Primary Key
    CustomerID = models.AutoField(primary_key=True)
    
    # Foreign Keys
    ClientId = models.IntegerField()
    CompanyId = models.IntegerField()
    
    # Customer Information
    FirstName = models.CharField(max_length=50)
    LastName = models.CharField(max_length=50)
    Email = models.EmailField(max_length=100, null=True, blank=True)
    Phone = models.CharField(max_length=20, null=True, blank=True)
    AadharCard = models.CharField(max_length=16, null=True, blank=True, unique=True)
    PANCard = models.CharField(max_length=10, null=True, blank=True, unique=True)
    AllowPortalAccess = models.BooleanField(default=True)
    Source = models.CharField(
        max_length=20,
        choices=SOURCE_CHOICES,
        default='Website',
    )
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
        db_table = "Customers"
