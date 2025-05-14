from django.db import models
from sop.models import SOPMaster

class ServiceCategory(models.Model):
    servicecategoryid = models.AutoField(primary_key=True)
    servicecategoryname = models.CharField(max_length=100)
    sopid = models.ForeignKey(SOPMaster, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[('active', 'Active'), ('inactive', 'Inactive')], default='active')
    clientid = models.IntegerField(default=1)
    companyid = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=100, default='system')
    updated_by = models.CharField(max_length=100, default='system')

    class Meta:
        db_table = 'servicecategory'
        ordering = ['servicecategoryname']

    def __str__(self):
        return self.servicecategoryname
