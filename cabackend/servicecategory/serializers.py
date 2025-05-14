from rest_framework import serializers
from .models import ServiceCategory
from sop.serializers import SOPMasterSerializer

class ServiceCategorySerializer(serializers.ModelSerializer):
    # Nested serializer for the SOPMaster relationship
    sop_details = SOPMasterSerializer(source='sopid', read_only=True)

    class Meta:
        model = ServiceCategory
        fields = [
            'servicecategoryid',
            'servicecategoryname',
            'sopid',
            'status',
            'clientid',
            'companyid',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by',
            'sop_details'
        ]
        read_only_fields = ['servicecategoryid', 'created_at', 'updated_at', 'created_by', 'updated_by']

    def create(self, validated_data):
        # Set default values for clientid and companyid if not provided
        validated_data.setdefault('clientid', ServiceCategory.CLIENT_ID)
        validated_data.setdefault('companyid', ServiceCategory.COMPANY_ID)
        user = self.context.get('request').user
        validated_data['created_by'] = user.user_id if hasattr(user, 'user_id') else 'system'
        validated_data['updated_by'] = validated_data['created_by']
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Update the updatedby field
        user = self.context.get('request').user
        validated_data['updated_by'] = user.user_id if hasattr(user, 'user_id') else 'system'
        return super().update(instance, validated_data)

    def validate_servicecategoryname(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Service category name must be at least 2 characters long")
        return value.strip()

    def validate_status(self, value):
        # Ensure status is lowercase
        return value.lower()
