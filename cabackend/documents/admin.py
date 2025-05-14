from django.contrib import admin
from .models import DocumentMaster, Document

# Register your models here.

@admin.register(DocumentMaster)
class DocumentMasterAdmin(admin.ModelAdmin):
    list_display = ('DocumentTypeId', 'DocumentTypeName', 'DocumentType', 'CreatedAt', 'UpdatedAt')
    list_filter = ('DocumentType',)
    search_fields = ('DocumentTypeName',)
    readonly_fields = ('CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy')

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('DocumentId', 'DocumentName', 'CustomerId', 'DocumentTypeId', 'Version', 'VisibleToCust', 'CreatedAt')
    list_filter = ('DocumentTypeId', 'VisibleToCust')
    search_fields = ('DocumentName', 'CustomerId__FirstName', 'CustomerId__LastName')
    readonly_fields = ('CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy')
