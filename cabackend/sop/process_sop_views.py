from rest_framework import viewsets, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import SOPMaster
from process.models import ProcessMaster
from .serializers import SOPMasterSerializer, SOPCreateSerializer
from .views import CustomPageNumberPagination

class ProcessSOPViewSet(viewsets.ViewSet):
    """
    API endpoint for managing SOPs related to a specific process.
    """
    pagination_class = CustomPageNumberPagination
    
    def list(self, request, process_id=None):
        """
        List all SOPs for a specific process.
        GET /processes/{process_id}/sops/
        """
        # Verify the process exists
        process = get_object_or_404(ProcessMaster, ProcessId=process_id)
        
        # Get all SOPs for this process
        queryset = SOPMaster.objects.filter(ProcessId=process)
        
        # Apply pagination
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        
        # Serialize the data
        serializer = SOPMasterSerializer(page, many=True)
        
        # Return paginated response
        return paginator.get_paginated_response(serializer.data)
    
    def create(self, request, process_id=None):
        """
        Create a new SOP for a specific process.
        POST /processes/{process_id}/sops/
        """
        # Verify the process exists
        process = get_object_or_404(ProcessMaster, ProcessId=process_id)
        
        # Create serializer with context containing process_id
        serializer = SOPCreateSerializer(data=request.data, context={'process_id': process_id})
        
        if serializer.is_valid():
            # Save with CreatedBy if user is authenticated
            sop = serializer.save(
                CreatedBy=str(request.user) if request.user.is_authenticated else None
            )
            
            # Return the created SOP with full serializer
            return Response(
                SOPMasterSerializer(sop).data, 
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
