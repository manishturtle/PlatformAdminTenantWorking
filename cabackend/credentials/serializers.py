from rest_framework import serializers
from .models import CredentialType, Credential
from customers.models import Customer

class CredentialTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CredentialType
        fields = [
            'CredentialTypeId', 
            'ClientId',
            'CompanyId',
            'CredentialTypeName', 
            'URL',
            'Status', 
            'CreatedAt', 
            'CreatedBy', 
            'UpdatedAt', 
            'UpdatedBy'
        ]
        read_only_fields = ['CredentialTypeId', 'CreatedAt', 'UpdatedAt']

class CredentialSerializer(serializers.ModelSerializer):
    credential_type_name = serializers.ReadOnlyField(source='CredentialTypeId.CredentialTypeName')
    credential_type_url = serializers.ReadOnlyField(source='CredentialTypeId.URL')
    CustomerId = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all())
    
    class Meta:
        model = Credential
        fields = [
            'CredentialId',
            'ClientId',
            'CompanyId',
            'CustomerId',
            'CredentialTypeId',
            'credential_type_name',
            'credential_type_url',
            'UserName',
            'Password',
            'EmailOTP',
            'MobileOTP',
            'CreatedAt',
            'CreatedBy',
            'UpdatedAt',
            'UpdatedBy'
        ]
        read_only_fields = ['CredentialId', 'CreatedAt', 'UpdatedAt', 'CreatedBy', 'UpdatedBy']
    
    def to_internal_value(self, data):
        # Create a mutable copy of the data
        data_copy = data.copy() if hasattr(data, 'copy') else dict(data)
        
        # Handle CredentialTypeId conversion from string to integer if needed
        if 'CredentialTypeId' in data_copy and isinstance(data_copy['CredentialTypeId'], str):
            try:
                data_copy['CredentialTypeId'] = int(data_copy['CredentialTypeId'])
            except (ValueError, TypeError):
                pass  # Let the field validation handle it
        
        # Handle CustomerId conversion from string to integer if needed
        if 'CustomerId' in data_copy and isinstance(data_copy['CustomerId'], str):
            try:
                data_copy['CustomerId'] = int(data_copy['CustomerId'])
            except (ValueError, TypeError):
                pass  # Let the field validation handle it
                
        return super().to_internal_value(data_copy)
