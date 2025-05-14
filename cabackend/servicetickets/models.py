from django.db import models
from datetime import date
from customers.models import Customer
from servicecategory.models import ServiceCategory
from serviceagent.models import ServiceAgent
from sop.models import SOPSteps

# Create your models here.

class ServiceTicket(models.Model):
    # Primary Key
    serviceticketid = models.AutoField(primary_key=True)
    
    # Client and Company Info
    clientid = models.IntegerField(default=1, null=False)
    companyid = models.IntegerField(default=1, null=False)
    
    # Foreign Keys
    customerid = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        null=False,
        db_column='customerid',
        to_field='CustomerID'  # Reference the actual field name in Customer model
    )
    servicecategoryid = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        db_column='servicecategoryid'
    )
    serviceagentid = models.ForeignKey(
        ServiceAgent,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        db_column='serviceagentid'
    )
    
    # Ticket Details
    serviceticketsubject = models.CharField(max_length=255, null=False)
    serviceticketdesc = models.TextField(null=True, blank=True)  # Make it optional with blank=True
    creationdate = models.DateField(default=date.today)
    targetclosuredate = models.DateField(null=True)
    status = models.CharField(max_length=50, default="New")
    
    # Audit Fields
    createdat = models.DateTimeField(auto_now_add=True)
    createdby = models.CharField(max_length=255)
    updatedat = models.DateTimeField(auto_now=True)
    updatedby = models.CharField(max_length=255, null=True)

    class Meta:
        db_table = 'serviceticket'
        ordering = ['-createdat']

    def __str__(self):
        return f"Ticket {self.serviceticketid} - Customer {self.customerid.CustomerID}"


class ServiceTicket_Tasks(models.Model):
    # Status choices
    TASK_STATUS_CHOICES = [
        ('New', 'New'),
        ('Assigned', 'Assigned'),
        ('InProgress', 'In Progress'),
        ('Closed', 'Closed'),
    ]
    
    # Client and Company Info
    Client_Id = models.IntegerField(default=1, null=False)
    Company_Id = models.IntegerField(default=1, null=False)
    
    # Foreign Keys
    ServiceTicketId = models.ForeignKey(
        ServiceTicket,
        on_delete=models.CASCADE,
        null=False,
        db_column='ServiceTicketId',
        related_name='tasks'
    )
    SOPStepID = models.ForeignKey(
        SOPSteps,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        db_column='SOPStepID'
    )
    TaskServiceAgent = models.ForeignKey(
        ServiceAgent,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        db_column='TaskServiceAgent'
    )
    
    # Task Details
    ServiceTicketTaskId = models.AutoField(primary_key=True)
    Sequence = models.IntegerField(null=False)
    TaskName = models.CharField(max_length=255, null=False)
    TaskStartDate = models.DateField(null=True, blank=True)
    TaskClosureDate = models.DateField(null=True, blank=True)
    TaskStatus = models.CharField(max_length=20, choices=TASK_STATUS_CHOICES, default='New')
    
    # Audit Fields
    Createdat = models.DateTimeField(auto_now_add=True)
    Createdby = models.CharField(max_length=255)
    Updatedat = models.DateTimeField(auto_now=True)
    Updatedby = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'serviceticket_tasks'
        ordering = ['ServiceTicketId', 'Sequence']
    
    def __str__(self):
        return f"Task {self.ServiceTicketTaskId} for Ticket {self.ServiceTicketId.serviceticketid}"
