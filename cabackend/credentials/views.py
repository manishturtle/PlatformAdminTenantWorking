from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .models import CredentialType, Credential
from .serializers import CredentialTypeSerializer, CredentialSerializer
from customers.models import Customer

# Create your views here.
class CustomPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class CredentialTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for credential types.
    
    Provides CRUD operations:
    - GET /api/credential-types/ - List all credential types
      Query parameters:
      - include_inactive: Set to 'true' to include inactive credential types
      - page: Page number for pagination
      - page_size: Number of items per page
    - POST /api/credential-types/ - Create a new credential type
    - GET /api/credential-types/{id}/ - Retrieve a specific credential type
    - PUT /api/credential-types/{id}/ - Update a credential type (full update)
    - PATCH /api/credential-types/{id}/ - Update a credential type (partial update)
    - DELETE /api/credential-types/{id}/ - Delete a credential type
    """
    serializer_class = CredentialTypeSerializer
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['CredentialTypeName']
    
    def get_queryset(self):
        queryset = CredentialType.objects.all().order_by('CredentialTypeName')
        # Filter by status unless include_inactive is set to true
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        if not include_inactive:
            queryset = queryset.filter(Status='Active')
        return queryset

class CredentialViewSet(viewsets.ModelViewSet):
    """
    API endpoint for credentials.
    
    Provides CRUD operations:
    - GET /api/credentials/ - List all credentials
    - POST /api/credentials/ - Create a new credential
    - GET /api/credentials/{id}/ - Retrieve a specific credential
    - PUT /api/credentials/{id}/ - Update a credential (full update)
    - PATCH /api/credentials/{id}/ - Update a credential (partial update)
    - DELETE /api/credentials/{id}/ - Delete a credential
    """
    queryset = Credential.objects.all()
    serializer_class = CredentialSerializer
    pagination_class = CustomPageNumberPagination
    
    def perform_create(self, serializer):
        # Set the CreatedBy field to the current user if authenticated
        if self.request.user.is_authenticated:
            serializer.save(CreatedBy=str(self.request.user))
        else:
            serializer.save()
    
    def perform_update(self, serializer):
        # Set the UpdatedBy field to the current user if authenticated
        if self.request.user.is_authenticated:
            serializer.save(UpdatedBy=str(self.request.user))
        else:
            serializer.save()

class CustomerCredentialViewSet(viewsets.ViewSet):
    """
    API endpoint for customer credentials.
    
    Provides operations:
    - GET /api/customers/{customer_id}/credentials/ - List all credentials for a specific customer
    - POST /api/customers/{customer_id}/credentials/ - Create a new credential for a customer
    """
    serializer_class = CredentialSerializer
    
    def list(self, request, customer_id=None):
        """
        Retrieve all credentials for a specific customer.
        """
        # Check if customer exists
        customer = get_object_or_404(Customer, CustomerID=customer_id)
        
        # Get credentials for this customer
        credentials = Credential.objects.filter(CustomerId=customer)
        
        # Apply pagination
        paginator = CustomPageNumberPagination()
        page = paginator.paginate_queryset(credentials, request)
        
        if page is not None:
            serializer = CredentialSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = CredentialSerializer(credentials, many=True)
        return Response(serializer.data)
    
    def create(self, request, customer_id=None):
        """
        Create a new credential for a customer.
        """
        # Debug logging
        print(f"\nReceived credential creation request for customer {customer_id}")
        print(f"Request data: {request.data}")
        
        # Check if customer exists
        try:
            customer = get_object_or_404(Customer, CustomerID=customer_id)
        except Exception as e:
            print(f"Error finding customer: {e}")
            return Response({"detail": f"Customer with ID {customer_id} not found"}, status=status.HTTP_404_NOT_FOUND)
        
        # Create a mutable copy of the request data
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        
        # Debug logging
        print(f"Original data: {data}")
        
        # Add CustomerId to the data
        # This is needed because the serializer requires it
        data['CustomerId'] = customer_id
        
        # Add default values for required fields if missing
        if 'ClientId' not in data or not data['ClientId']:
            data['ClientId'] = 1
        if 'CompanyId' not in data or not data['CompanyId']:
            data['CompanyId'] = 1
            
        # Ensure CredentialTypeId is properly formatted
        if 'CredentialTypeId' in data and data['CredentialTypeId']:
            try:
                # If it's a string, try to convert to int
                if isinstance(data['CredentialTypeId'], str):
                    data['CredentialTypeId'] = int(data['CredentialTypeId'])
            except (ValueError, TypeError):
                print(f"Error converting CredentialTypeId: {data['CredentialTypeId']}")
                return Response({"CredentialTypeId": ["Invalid credential type ID"]}, status=status.HTTP_400_BAD_REQUEST)
        
        # Debug logging
        print(f"Modified data for serializer: {data}")
        
        # Create serializer with the modified data
        serializer = CredentialSerializer(data=data)
        
        if serializer.is_valid():
            try:
                # Set the customer ID directly in the save method
                credential = serializer.save(
                    CustomerId=customer,
                    CreatedBy=str(request.user) if request.user.is_authenticated else 'system'
                )
                print(f"Credential created successfully: {credential.CredentialId}")
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"Error saving credential: {e}")
                return Response({"detail": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Debug logging for validation errors
        print(f"Validation errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    ordering_fields = ['CredentialTypeName', 'Status', 'CreatedAt']
    ordering = ['CredentialTypeName']
    # permission_classes = [IsAuthenticated]  # Uncomment if authentication is required
    
    def perform_create(self, serializer):
        # Set the CreatedBy field to the current user if authenticated
        if self.request.user.is_authenticated:
            serializer.save(CreatedBy=str(self.request.user))
        else:
            serializer.save()
    
    def perform_update(self, serializer):
        # Set the UpdatedBy field to the current user if authenticated
        if self.request.user.is_authenticated:
            serializer.save(UpdatedBy=str(self.request.user))
        else:
            serializer.save()
            
    def get_queryset(self):
        """
        Override the get_queryset method to filter inactive credential types
        unless include_inactive=true is specified in the query parameters.
        """
        queryset = CredentialType.objects.all().order_by('CredentialTypeName')
        
        # Check if include_inactive parameter is provided
        include_inactive = self.request.query_params.get('include_inactive', '').lower()
        
        # Filter out inactive credential types unless include_inactive=true
        if include_inactive != 'true':
            queryset = queryset.filter(Status=CredentialType.ACTIVE)
            
        return queryset
