from django.contrib import admin
from .models import SOPMaster

# Register your models here.
@admin.register(SOPMaster)
class SOPMasterAdmin(admin.ModelAdmin):
    list_display = ('SOPId', 'SOPName', 'CreatedAt', 'CreatedBy')
    search_fields = ('SOPName', 'Description')
    list_filter = ('CreatedAt',)
    readonly_fields = ('SOPId', 'CreatedAt', 'UpdatedAt')
