from django.db import models

# Create your models here.
class ProcessMaster(models.Model):
    # Audience choices
    AUDIENCE_CHOICES = [
        ('Individual', 'Individual'),
        ('Company', 'Company'),
    ]
    
    # Status choices
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]
    
    # Fields
    ClientId = models.IntegerField(null=False, default=1)
    CompanyId = models.IntegerField(null=False, default=1)
    ProcessId = models.AutoField(primary_key=True)
    ProcessName = models.CharField(max_length=255, null=False)
    Description = models.CharField(max_length=1000, null=True, blank=True)
    ProcessAudience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='Individual')
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=100, null=True, blank=True)
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=100, null=True, blank=True)
    
    def __str__(self):
        return self.ProcessName
    
    class Meta:
        db_table = 'ProcessMaster'
        verbose_name = 'Process'
        verbose_name_plural = 'Processes'
