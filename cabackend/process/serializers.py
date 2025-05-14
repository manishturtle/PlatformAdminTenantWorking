from rest_framework import serializers
from .models import ProcessMaster

class ProcessMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcessMaster
        fields = [
            'ProcessId',
            'ClientId',
            'CompanyId',
            'ProcessName',
            'Description',
            'ProcessAudience',
            'Status',
            'CreatedAt',
            'CreatedBy',
            'UpdatedAt',
            'UpdatedBy'
        ]
        read_only_fields = ['ProcessId', 'CreatedAt', 'UpdatedAt']
