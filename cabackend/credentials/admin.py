from django.contrib import admin
from .models import CredentialType

# Register your models here.
@admin.register(CredentialType)
class CredentialTypeAdmin(admin.ModelAdmin):
    list_display = ('CredentialTypeId', 'CredentialTypeName', 'Status', 'CreatedAt', 'UpdatedAt')
    list_filter = ('Status',)
    search_fields = ('CredentialTypeName',)
    readonly_fields = ('CreatedAt', 'UpdatedAt')
