from django.db import models
from process.models import ProcessMaster

# Create your models here.
class SOPMaster(models.Model):
    # Status choices
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
    ]
    
    # Fields
    ClientId = models.IntegerField(null=False, default=1)
    CompanyId = models.IntegerField(null=False, default=1)
    SOPId = models.AutoField(primary_key=True)
    ProcessId = models.ForeignKey(ProcessMaster, on_delete=models.CASCADE, related_name='sops')
    SOPName = models.CharField(max_length=255, null=False)
    Description = models.CharField(max_length=1000, null=True, blank=True)
    Version = models.IntegerField(null=False, default=1)
    VersionEffectiveDate = models.DateField(null=True, blank=True)
    Status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', null=False)
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=100, null=True, blank=True)
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=100, null=True, blank=True)
    
    def __str__(self):
        return self.SOPName
    
    class Meta:
        db_table = 'SOPMaster'
        verbose_name = 'SOP'
        verbose_name_plural = 'SOPs'
        # Ensure Version is unique per ProcessId
        unique_together = [['ProcessId', 'Version']]


class SOPSteps(models.Model):
    # Fields
    ClientId = models.IntegerField(null=False, default=1)
    CompanyId = models.IntegerField(null=False, default=1)
    StepId = models.AutoField(primary_key=True)
    SOPId = models.ForeignKey(SOPMaster, on_delete=models.CASCADE, related_name='steps')
    Sequence = models.IntegerField(null=False, default=1)  # Added Sequence field
    StepName = models.CharField(max_length=255, null=False)
    Comments = models.TextField(null=True, blank=True)
    Prerequisites = models.TextField(null=True, blank=True)
    Postrequisites = models.TextField(null=True, blank=True)
    DocumentPath = models.CharField(max_length=500, null=True, blank=True)
    OriginalFileName = models.CharField(max_length=255, null=True, blank=True)
    FileName = models.CharField(max_length=255, null=True, blank=True)
    URL = models.CharField(max_length=500, null=True, blank=True)
    Duration = models.IntegerField(null=False, default=1)
    CreatedAt = models.DateTimeField(auto_now_add=True)
    CreatedBy = models.CharField(max_length=100, null=True, blank=True)
    UpdatedAt = models.DateTimeField(auto_now=True)
    UpdatedBy = models.CharField(max_length=100, null=True, blank=True)
    
    def __str__(self):
        return self.StepName
    
    class Meta:
        db_table = 'SOPSteps'
        verbose_name = 'SOP Step'
        verbose_name_plural = 'SOP Steps'
        ordering = ['Sequence', 'StepId']  # Updated ordering to use Sequence first
