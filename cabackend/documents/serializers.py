from rest_framework import serializers
from .models import DocumentMaster, Document

class DocumentMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentMaster
        fields = [
            'DocumentTypeId', 
            'DocumentTypeName', 
            'DocumentType', 
            'Status',
            'CreatedAt', 
            'CreatedBy', 
            'UpdatedAt', 
            'UpdatedBy'
        ]
        read_only_fields = ['DocumentTypeId', 'CreatedAt', 'UpdatedAt']

class DocumentSerializer(serializers.ModelSerializer):
    document_type_name = serializers.ReadOnlyField(source='DocumentTypeId.DocumentTypeName')
    
    class Meta:
        model = Document
        fields = [
            'DocumentId',
            'ClientId',
            'CompanyId',
            'CustomerId',
            'DocumentTypeId',
            'document_type_name',
            'DocumentName',
            'UserDocuName',
            'OriginalName',
            'FilePath',
            'DocumentStatus',
            'VisibleToCust',
            'Version',
            'VersionDate',
            'CreatedAt',
            'CreatedBy',
            'UpdatedAt',
            'UpdatedBy'
        ]
        read_only_fields = ['DocumentId', 'FilePath', 'Version', 'VersionDate', 'CreatedAt', 'UpdatedAt']

class DocumentUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating document metadata.
    Only allows updating specific fields, not file-related fields.
    """
    class Meta:
        model = Document
        fields = ['VisibleToCust', 'DocumentStatus', 'UserDocuName']
        extra_kwargs = {
            'DocumentStatus': {'required': False},
            'UserDocuName': {'required': False}
        }
        
    def update(self, instance, validated_data):
        # Update only the allowed fields
        instance.VisibleToCust = validated_data.get('VisibleToCust', instance.VisibleToCust)
        instance.UserDocuName = validated_data.get('UserDocuName', instance.UserDocuName)
        
        # Update DocumentStatus if provided
        if 'DocumentStatus' in validated_data:
            instance.DocumentStatus = validated_data.get('DocumentStatus')
        
        # Update the UpdatedBy field if user is authenticated
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            instance.UpdatedBy = str(request.user)
        
        # Save the instance
        instance.save()
        return instance
