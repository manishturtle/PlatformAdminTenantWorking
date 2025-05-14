from django.db import models
from servicecategory.models import ServiceCategory

# Create your models here.

# Constants for default values
class ServiceAgent(models.Model):
    CLIENT_ID = 1
    COMPANY_ID = 1

    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]

    # Fields
    serviceagentid = models.AutoField(primary_key=True)
    serviceagentname = models.CharField(max_length=100, null=False)
    emailid = models.EmailField(max_length=255, blank=True, null=True, unique=True)
    password = models.CharField(max_length=128, null=True, blank=True)  # For storing hashed passwords
    allowportalaccess = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Active')
    expertat = models.ManyToManyField(
        ServiceCategory,
        blank=True,
        related_name='service_agents'
    )
    clientid = models.IntegerField(default=CLIENT_ID, null=False)
    companyid = models.IntegerField(default=COMPANY_ID, null=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, default='system')
    updated_by = models.CharField(max_length=100, null=True, blank=True)

    class Meta:
        db_table = 'serviceagent'
        ordering = ['serviceagentname']
        unique_together = ('clientid', 'companyid', 'serviceagentname')
        verbose_name = 'Service Agent'
        verbose_name_plural = 'Service Agents'

    def __str__(self):
        return f"{self.serviceagentname} ({self.emailid or 'No email'})"

    def save(self, *args, **kwargs):
        if not self.created_by:
            self.created_by = 'system'
        if not self.updated_by:
            self.updated_by = self.created_by
        super().save(*args, **kwargs)

    @property
    def expert_at_names(self):
        return [category.servicecategoryname for category in self.expertat.all()]
