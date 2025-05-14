from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.shortcuts import get_object_or_404
from django.http import FileResponse
import os
from django.conf import settings
from django.db import transaction

from .models import SOPMaster, SOPSteps
from .serializers import SOPStepsSerializer, SOPStepCreateSerializer, SOPStepReorderSerializer
from .views import CustomPageNumberPagination

class SOPStepsViewSet(viewsets.ModelViewSet):
    """
    API endpoint for SOP steps management.
    
    Provides CRUD operations for SOP steps.
    """
    queryset = SOPSteps.objects.all()
    serializer_class = SOPStepsSerializer
    pagination_class = CustomPageNumberPagination
    
    def update(self, request, *args, **kwargs):
        # Ensure ClientId and CompanyId remain as 1
        data = request.data.copy()
        data['ClientId'] = 1
        data['CompanyId'] = 1
        
        # Ensure Sequence field is included
        if 'Sequence' not in data:
            data['Sequence'] = 1  # Default value if not provided
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Set UpdatedBy if user is authenticated
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        serializer.save(UpdatedBy=str(self.request.user) if self.request.user.is_authenticated else None)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download the document for a step.
        """
        step = self.get_object()
        
        if not step.DocumentPath:
            return Response(
                {"error": "No document available for this step"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Use the full path as DocumentPath now contains the complete path
        file_path = step.DocumentPath
        
        if not os.path.exists(file_path):
            return Response(
                {"error": "Document file not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        response = FileResponse(open(file_path, 'rb'))
        response['Content-Disposition'] = f'attachment; filename="{step.OriginalFileName}"'
        return response


class SOPStepsBySOPViewSet(viewsets.ViewSet):
    """
    API endpoint for managing steps related to a specific SOP.
    """
    pagination_class = CustomPageNumberPagination
    
    @action(detail=False, methods=['post'], url_path='reorder')
    def reorder(self, request, sop_id=None):
        """
        Reorder steps for a specific SOP.
        POST /sops/{sop_id}/steps/reorder/
        
        Accepts a JSON array of objects with StepId and Sequence fields.
        Updates the Sequence field for each step in the SOPSteps table.
        
        Example request body:
        {
            "steps": [
                {"StepId": 1, "Sequence": 3},
                {"StepId": 2, "Sequence": 1},
                {"StepId": 3, "Sequence": 2}
            ]
        }
        """
        # Verify the SOP exists
        sop = get_object_or_404(SOPMaster, SOPId=sop_id)
        
        # Validate the request data
        serializer = SOPStepReorderSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Get the steps to reorder
        steps_data = serializer.validated_data.get('steps', [])
        
        # Verify all steps belong to this SOP
        step_ids = [step['StepId'] for step in steps_data]
        steps = SOPSteps.objects.filter(StepId__in=step_ids, SOPId_id=sop.SOPId)
        
        # Check if all steps were found
        if steps.count() != len(step_ids):
            return Response(
                {"error": "One or more steps do not exist or do not belong to this SOP"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update sequences in a transaction to ensure atomicity
        with transaction.atomic():
            for step_data in steps_data:
                step_id = step_data['StepId']
                sequence = step_data['Sequence']
                
                # Update the step's sequence
                SOPSteps.objects.filter(StepId=step_id).update(Sequence=sequence)
        
        return Response(
            {"message": f"Successfully reordered {len(steps_data)} steps for SOP '{sop.SOPName}'"},
            status=status.HTTP_200_OK
        )
    
    def list(self, request, sop_id=None):
        """
        List all steps for a specific SOP.
        GET /sops/{sop_id}/steps/
        """
        # Verify the SOP exists
        sop = get_object_or_404(SOPMaster, SOPId=sop_id)
        
        # Get all steps for this SOP, ordered by Sequence field in ascending order
        queryset = SOPSteps.objects.filter(SOPId_id=sop.SOPId).order_by('Sequence')
        
        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        
        # Serialize the data
        serializer = SOPStepsSerializer(page, many=True)
        
        # Return paginated response
        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request, sop_id=None):
        """
        Create a new step for a specific SOP.
        POST /sops/{sop_id}/steps/
        """
        # Verify the SOP exists
        sop = get_object_or_404(SOPMaster, SOPId=sop_id)
        
        # Create serializer
        serializer = SOPStepCreateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Extract document if present
            document = None
            if 'document' in request.FILES:
                document = request.FILES['document']
                
            # Prepare validated data
            validated_data = serializer.validated_data.copy()
            if 'document' in validated_data:
                del validated_data['document']
                
            # If Sequence is not provided, find the next available sequence number
            if 'Sequence' not in validated_data or not validated_data['Sequence']:
                # Get the highest sequence number for this SOP and add 1
                highest_sequence = SOPSteps.objects.filter(SOPId_id=sop.SOPId).order_by('-Sequence').first()
                next_sequence = 1
                if highest_sequence:
                    next_sequence = highest_sequence.Sequence + 1
                validated_data['Sequence'] = next_sequence
            
            # Create step with default values
            step = SOPSteps.objects.create(
                SOPId_id=sop.SOPId,  # Use SOPId_id to set the foreign key directly
                ClientId=1,
                CompanyId=1,
                CreatedBy=str(request.user) if request.user.is_authenticated else None,
                **validated_data
            )
            
            # Process document if uploaded
            if document:
                # Get SOP details for folder naming
                sop_name = sop.SOPName.replace(' ', '_')
                sop_version = sop.Version
                
                # Create directory structure: C:\software4ca_docs\<SOPName>\Version\
                upload_dir = os.path.join('C:\\software4ca_docs', sop_name, str(sop_version))
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
                step.DocumentPath = os.path.join('C:\\software4ca_docs', sop_name, str(sop_version), filename)
                step.OriginalFileName = original_filename
                step.FileName = filename
                step.save()
            
            # Return the created step
            return Response(
                SOPStepsSerializer(step).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
