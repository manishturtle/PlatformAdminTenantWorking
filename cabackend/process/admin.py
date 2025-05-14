from django.contrib import admin
from .models import ProcessMaster

# Register your models here.
@admin.register(ProcessMaster)
class ProcessMasterAdmin(admin.ModelAdmin):
    list_display = ('ProcessId', 'ProcessName', 'CreatedAt', 'CreatedBy')
    search_fields = ('ProcessName', 'Description')
    list_filter = ('CreatedAt',)
    readonly_fields = ('ProcessId', 'CreatedAt', 'UpdatedAt')
