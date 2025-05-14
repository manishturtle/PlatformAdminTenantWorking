from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import SOPMaster
from .serializers import SOPMasterSerializer, SOPCreateSerializer, SOPActivateSerializer
from process.models import ProcessMaster
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link() is not None,
            'previous': self.get_previous_link() is not None,
            'results': data
        })

class SOPMasterViewSet(viewsets.ModelViewSet):
    """
    API endpoint for SOP management.
    
    Provides CRUD operations for SOPs.
    """
    queryset = SOPMaster.objects.all()
    serializer_class = SOPMasterSerializer
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['SOPName', 'Description', 'Status', 'Version', 'ProcessId']
    search_fields = ['SOPName', 'Description']
    ordering_fields = ['SOPName', 'CreatedAt', 'Version', 'Status']
    ordering = ['SOPName']
    
    def list(self, request, *args, **kwargs):
        """
        Get all SOPs with option to filter by status.
        By default, returns only active SOPs unless status parameter is provided.
        """
        # Check if status filter is explicitly provided
        status_param = request.query_params.get('Status', None)
        
        # If status is explicitly set to 'Active', filter for active SOPs
        # If status is not provided or is any other value, show all SOPs
        if status_param == 'Active':
            self.queryset = SOPMaster.objects.filter(Status='Active')
        else:
            # This will return ALL SOPs regardless of status
            self.queryset = SOPMaster.objects.all()
            
        return super().list(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        # Get the current instance
        instance = self.get_object()
        
        # Create a new data dictionary with only allowed fields
        allowed_fields = ['SOPName', 'Description', 'Status', 'VersionEffectiveDate']
        data = {}
        
        # Only copy allowed fields from the request data
        for field in allowed_fields:
            if field in request.data:
                data[field] = request.data[field]
        
        # Always set these fields to ensure consistency
        data['ClientId'] = 1
        data['CompanyId'] = 1
        
        # Preserve the original ProcessId - never allow changing it
        data['ProcessId'] = instance.ProcessId.pk
        
        # Check if this is an edit operation with is_edit_mode flag
        is_edit_mode = request.data.get('is_edit_mode', False)
        if is_edit_mode:
            data['is_edit_mode'] = True
        
        # Always keep the original Version to avoid uniqueness conflicts
        data['Version'] = instance.Version
        
        # Log what we're updating
        print(f"Updating SOP {instance.SOPId} with data: {data}")
        
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Set UpdatedBy if user is authenticated
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        # Get the current instance to preserve ProcessId
        instance = serializer.instance
        
        # Save with UpdatedBy if user is authenticated
        serializer.save(
            UpdatedBy=str(self.request.user) if self.request.user.is_authenticated else None,
            ProcessId=instance.ProcessId
        )
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """
        Activate this SOP version and deactivate all other versions for the same process.
        
        When this endpoint is called:
        1. Set the Status of the SOP with the given id to 'Active'.
        2. Find all other SOPs in the SOPMaster table that have the same ProcessId.
        3. Set the Status of those other SOPs to 'Inactive'.
        
        This ensures that only one SOP version is active for a given process at any time.
        """
        # Get the SOP to activate
        sop = self.get_object()
        serializer = SOPActivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Use transaction to ensure atomicity
        with transaction.atomic():
            # Step 1: Find all other SOPs with the same ProcessId
            process_id = sop.ProcessId
            
            # Step 2: Set the Status of all other SOPs for this process to 'Inactive'
            SOPMaster.objects.filter(ProcessId=process_id).exclude(SOPId=sop.SOPId).update(Status='Inactive')
            
            # Step 3: Set the Status of this SOP to 'Active'
            sop.Status = 'Active'
            sop.save(update_fields=['Status', 'UpdatedAt'])
            
            # Log the user who made the change if authenticated
            if self.request.user.is_authenticated:
                sop.UpdatedBy = str(self.request.user)
                sop.save(update_fields=['UpdatedBy'])
        
        return Response({
            'status': 'success',
            'message': f'SOP "{sop.SOPName}" (Version {sop.Version}) activated successfully. All other versions set to inactive.',
            'sop_id': sop.SOPId,
            'process_id': sop.ProcessId.ProcessId if hasattr(sop.ProcessId, 'ProcessId') else sop.ProcessId
        }, status=status.HTTP_200_OK)
