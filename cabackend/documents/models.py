from django.db import models
from customers.models import Customer

# Create your models here.

class DocumentMaster(models.Model):
    # Document Type choices
    APPLICANT_SHARED = 'Applicant Shared'
    ADMIN_SHARED = 'Admin Shared'
    
    DOCUMENT_TYPE_CHOICES = [
        (APPLICANT_SHARED, 'Applicant Shared'),
        (ADMIN_SHARED, 'Admin Shared'),
    ]
    
    # Status choices
    ACTIVE = 'Active'
    INACTIVE = 'Inactive'
    
    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (INACTIVE, 'Inactive'),
    ]
    
    # Primary key
    DocumentTypeId = models.AutoField(primary_key=True)
    
    # Fields
    DocumentTypeName = models.CharField(max_length=100, null=False)
    DocumentType = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPE_CHOICES,
        null=False
    )
    Status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default=ACTIVE,
        null=False
    )
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=100, null=False, default='system')
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=100, null=False, default='system')
    
    def __str__(self):
        return self.DocumentTypeName
    
    class Meta:
        db_table = 'DocumentMaster'
        verbose_name = 'Document Type'
        verbose_name_plural = 'Document Types'

class Document(models.Model):
    # Document Status choices
    PENDING = 'Pending'
    APPROVED = 'Approved'
    REJECTED = 'Rejected'
    ARCHIVED = 'Archived'
    LATEST = 'Latest'
    DEPRECATED = 'Deprecated'
    
    DOCUMENT_STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (APPROVED, 'Approved'),
        (REJECTED, 'Rejected'),
        (ARCHIVED, 'Archived'),
        (LATEST, 'Latest'),
        (DEPRECATED, 'Deprecated'),
    ]
    
    # Primary key
    DocumentId = models.AutoField(primary_key=True)
    
    # Fields
    ClientId = models.IntegerField(null=False, default=1)
    CompanyId = models.IntegerField(null=False, default=1)
    CustomerId = models.ForeignKey(
        Customer, 
        on_delete=models.CASCADE, 
        db_column='CustomerId',
        related_name='documents'
    )
    DocumentTypeId = models.ForeignKey(
        DocumentMaster,
        on_delete=models.PROTECT,
        db_column='DocumentTypeId',
        related_name='documents'
    )
    DocumentName = models.CharField(max_length=255, null=False)
    UserDocuName = models.CharField(max_length=255, null=True, blank=True)
    OriginalName = models.CharField(max_length=255, null=False, default='')
    FilePath = models.CharField(max_length=255, null=False)
    DocumentStatus = models.CharField(
        max_length=20,
        choices=DOCUMENT_STATUS_CHOICES,
        default=PENDING,
        null=False
    )
    VisibleToCust = models.BooleanField(default=False)
    Version = models.IntegerField(null=False, default=1)
    VersionDate = models.DateTimeField(null=True, blank=True)
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=100, null=False, default='system')
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=100, null=False, default='system')
    
    def __str__(self):
        return self.DocumentName
    
    class Meta:
        db_table = 'Documents'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
