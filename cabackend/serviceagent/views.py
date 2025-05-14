from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import ServiceAgent
from .serializers import ServiceAgentSerializer

# Create your views here.

class ServiceAgentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing service agents.
    
    list:
        Return a list of all service agents.
        
    create:
        Create a new service agent.
        
    retrieve:
        Return the given service agent.
        
    update:
        Update the given service agent.
        
    partial_update:
        Update part of the given service agent.
        
    destroy:
        Delete the given service agent.
    """
    queryset = ServiceAgent.objects.all()
    serializer_class = ServiceAgentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['clientid', 'companyid']
    search_fields = ['serviceagentname']
    ordering_fields = ['serviceagentname', 'created_at']
    ordering = ['serviceagentname']

    def get_queryset(self):
        """
        Optionally restricts the returned agents based on query parameters.
        """
        queryset = ServiceAgent.objects.all()
        # Add prefetch_related to optimize the ManyToManyField queries
        queryset = queryset.prefetch_related('expertat')
        return queryset

    def create(self, request, *args, **kwargs):
        """
        Create a new service agent with default values.
        """
        # Set default values
        request.data['clientid'] = ServiceAgent.CLIENT_ID
        request.data['companyid'] = ServiceAgent.COMPANY_ID
        request.data['created_by'] = 'admin'
        request.data['updated_by'] = 'admin'

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """
        Update a service agent with default values.
        """
        # Set default values
        request.data['clientid'] = ServiceAgent.CLIENT_ID
        request.data['companyid'] = ServiceAgent.COMPANY_ID
        request.data['updated_by'] = 'admin'
        
        # Log the incoming data for debugging
        print(f"Update request data: {request.data}")
        
        # Check if expertat field is being sent as expertat_ids
        if 'expertat_ids' in request.data:
            print(f"Found expertat_ids in request: {request.data['expertat_ids']}")
        
        # The serializer will handle the expertat_ids field properly
        return super().update(request, *args, **kwargs)
    def perform_update(self, serializer):
        """
        Perform the update operation.
        """
        # Get the expertat_ids from the request data if it exists
        request = self.request
        print(f"Request data in perform_update: {request.data}")
        
        # Save the instance first
        instance = serializer.save(updated_by='admin')
        
        # Handle the expertat_ids field manually if it exists
        if 'expertat_ids' in request.data:
            expertat_ids = request.data.get('expertat_ids', [])
            print(f"Setting expertat_ids: {expertat_ids}")
            
            # Clear existing relations and add new ones
            instance.expertat.clear()
            for category_id in expertat_ids:
                try:
                    from servicecategory.models import ServiceCategory
                    category = ServiceCategory.objects.get(servicecategoryid=category_id)
                    instance.expertat.add(category)
                    print(f"Added category {category_id} to service agent {instance.serviceagentid}")
                except Exception as e:
                    print(f"Error adding category {category_id}: {str(e)}")
            
            # Save the instance again to ensure the many-to-many relationship is updated
            instance.save()
        else:
            print("No expertat_ids found in request data")
    def perform_destroy(self, instance):
        """
        Perform the delete operation.
        """
        instance.delete()
