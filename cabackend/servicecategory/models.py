from django.db import models
from sop.models import SOPMaster

class ServiceCategory(models.Model):
    # Constants for default values
    CLIENT_ID = 1
    COMPANY_ID = 1

    # Status choices
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive')
    ]

    # Fields
    servicecategoryid = models.AutoField(primary_key=True)
    servicecategoryname = models.CharField(max_length=100, null=False)
    sopid = models.ForeignKey(
        SOPMaster,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='service_categories'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        null=False,
        default='active'
    )
    clientid = models.IntegerField(default=CLIENT_ID, null=False)
    companyid = models.IntegerField(default=COMPANY_ID, null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, default='system')
    updated_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'servicecategory'
        ordering = ['servicecategoryname']
        app_label = 'servicecategory'
        verbose_name = 'Service Category'
        verbose_name_plural = 'Service Categories'

    def __str__(self):
        return f"{self.servicecategoryname} (ID: {self.servicecategoryid})"

    def save(self, *args, **kwargs):
        if not self.created_by:
            self.created_by = 'system'
        if not self.updated_by:
            self.updated_by = self.created_by
        super().save(*args, **kwargs)
