from rest_framework import serializers
from .models import SOPMaster, SOPSteps
from process.models import ProcessMaster
from process.serializers import ProcessMasterSerializer
import os
from django.conf import settings

class SOPMasterSerializer(serializers.ModelSerializer):
    process = ProcessMasterSerializer(source='ProcessId', read_only=True)
    is_edit_mode = serializers.BooleanField(write_only=True, required=False, default=False)
    
    class Meta:
        model = SOPMaster
        fields = [
            'SOPId',
            'ClientId',
            'CompanyId',
            'ProcessId',
            'process',
            'SOPName',
            'Description',
            'Version',
            'VersionEffectiveDate',
            'Status',
            'CreatedAt',
            'CreatedBy',
            'UpdatedAt',
            'UpdatedBy',
            'is_edit_mode'
        ]
        read_only_fields = ['SOPId', 'CreatedAt', 'UpdatedAt']
    
    def validate(self, data):
        # Remove is_edit_mode from data after using it
        is_edit_mode = data.pop('is_edit_mode', False)
        
        # If we're in edit mode, bypass the uniqueness check
        if is_edit_mode and self.instance:
            # This is an update operation, so we bypass the uniqueness check
            return data
        
        # For create operations, we still need to validate uniqueness
        # Check if ProcessId and Version combination already exists
        process_id = data.get('ProcessId')
        version = data.get('Version')
        
        if process_id and version and not self.instance:
            # Only check for new records (not updates)
            if SOPMaster.objects.filter(ProcessId=process_id, Version=version).exists():
                raise serializers.ValidationError({
                    "non_field_errors": ["The fields ProcessId, Version must make a unique set."]
                })
        
        return data

class SOPCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SOPMaster
        fields = [
            'SOPName',
            'Description',
            'VersionEffectiveDate',
            'Status'
        ]
    
    def create(self, validated_data):
        # Get the process_id from the URL
        process_id = self.context['process_id']
        
        # Get the process instance
        process = ProcessMaster.objects.get(ProcessId=process_id)
        
        # Find the highest version for this process
        highest_version = SOPMaster.objects.filter(ProcessId=process).order_by('-Version').first()
        new_version = 1
        if highest_version:
            new_version = highest_version.Version + 1
        
        # Create the SOP with the next version number
        sop = SOPMaster.objects.create(
            ProcessId=process,
            Version=new_version,
            ClientId=1,  # Default value as per business requirements
            CompanyId=1,  # Default value as per business requirements
            **validated_data
        )
        return sop

class SOPActivateSerializer(serializers.Serializer):
    # Empty serializer for activate endpoint
    pass


class SOPStepsSerializer(serializers.ModelSerializer):
    document = serializers.FileField(required=False, write_only=True)
    sop = SOPMasterSerializer(source='SOPId', read_only=True)
    
    class Meta:
        model = SOPSteps
        fields = [
            'StepId',
            'SOPId',
            'sop',
            'Sequence',
            'StepName',
            'Comments',
            'DocumentPath',
            'OriginalFileName',
            'FileName',
            'URL',
            'Duration',
            'CreatedAt',
            'CreatedBy',
            'UpdatedAt',
            'UpdatedBy',
            'document'
        ]
        read_only_fields = ['StepId', 'DocumentPath', 'OriginalFileName', 'FileName', 'CreatedAt', 'UpdatedAt']
    
    def create(self, validated_data):
        # Handle file upload if present
        document = validated_data.pop('document', None)
        
        # Create the step instance
        step = SOPSteps.objects.create(**validated_data)
        
        # Process the file if it was uploaded
        if document:
            self._process_document(step, document)
        
        return step
    
    def update(self, instance, validated_data):
        # Handle file upload if present
        document = validated_data.pop('document', None)
        
        # Update the step instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        # Process the file if it was uploaded
        if document:
            self._process_document(instance, document)
        
        instance.save()
        return instance
    
    def _process_document(self, step, document):
        # Get SOP details for folder naming
        sop = step.SOPId
        sop_name = sop.SOPName.replace(' ', '_')
        sop_version = sop.Version
        
        # Create directory structure: C:\software4ca\<SOPName>\Version\
        upload_dir = os.path.join(settings.MEDIA_ROOT, sop_name, str(sop_version))
        os.makedirs(upload_dir, exist_ok=True)
        
        # Get original filename and extension
        original_filename = document.name
        file_extension = os.path.splitext(original_filename)[1]
        
        # Rename file to <StepName>.<extension>
        step_name = step.StepName.replace(' ', '_')
        filename = f"{step_name}{file_extension}"
        file_path = os.path.join(upload_dir, filename)
        
        # Save the file
        with open(file_path, 'wb+') as destination:
            for chunk in document.chunks():
                destination.write(chunk)
        
        # Update the step with file information
        step.DocumentPath = os.path.join(sop_name, str(sop_version), filename)
        step.OriginalFileName = original_filename
        step.FileName = filename
        step.save()


class SOPStepCreateSerializer(serializers.ModelSerializer):
    document = serializers.FileField(required=False)
    
    class Meta:
        model = SOPSteps
        fields = [
            'Sequence',
            'StepName',
            'Comments',
            'Prerequisites',
            'Postrequisites',
            'Duration',
            'document'
        ]


class SOPStepReorderItemSerializer(serializers.Serializer):
    StepId = serializers.IntegerField(required=True)
    Sequence = serializers.IntegerField(required=True, min_value=1)


class SOPStepReorderSerializer(serializers.Serializer):
    steps = SOPStepReorderItemSerializer(many=True)
