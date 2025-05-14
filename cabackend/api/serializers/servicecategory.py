from rest_framework import serializers
from ..models.servicecategory import ServiceCategory
from ..models.sop import SOPMaster
from .sop import SOPMasterSerializer

class ServiceCategorySerializer(serializers.ModelSerializer):
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
        read_only_fields = ['servicecategoryid', 'created_at', 'updated_at']

    def validate_servicecategoryname(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Service category name must be at least 2 characters long")
        if len(value) > 100:
            raise serializers.ValidationError("Service category name must be at most 100 characters long")
        if not value.replace(' ', '').replace('-', '').replace('_', '').isalnum():
            raise serializers.ValidationError("Service category name can only contain letters, numbers, spaces, hyphens, and underscores")
        return value.strip()

    def validate_status(self, value):
        valid_statuses = ['active', 'inactive']
        if value.lower() not in valid_statuses:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid_statuses)}")
        return value.lower()

    def validate_sopid(self, value):
        if value:
            try:
                SOPMaster.objects.get(pk=value.SOPId)
            except SOPMaster.DoesNotExist:
                raise serializers.ValidationError("Selected SOP does not exist")
        return value
