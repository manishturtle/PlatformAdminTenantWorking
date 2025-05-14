from django.shortcuts import render
from django.db.models import Q
from django.db import IntegrityError
from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .models import Customer
from .serializers import CustomerSerializer


from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
# from itrapp.middleware import JWTAuthenticationMiddleware
# from rest_framework_simplejwt.authentication import JWTAuthentication
from itrapp.middleware import CustomJWTAuthentication

# Create your views here.

class CustomPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

class CustomerViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows customers to be viewed and created.
    
    Supports filtering by:
    - search: Search across FirstName, LastName, and Email
    - customer_type: Filter by CustomerType
    - source: Filter by Source
    
    Supports pagination:
    - page: Page number
    - page_size: Number of items per page
    
    Supports retrieving a single customer:
    - GET /customers/{id}/: Retrieve a single customer by ID
    
    Supports creating a new customer:
    - POST /customers/: Create a new customer
    
    Supports updating a customer:
    - PUT /customers/{id}/: Update an existing customer
    
    Supports deleting a customer:
    - DELETE /customers/{id}/: Delete an existing customer
    """


    # Token authentication and permissions
    authentication_classes = [CustomJWTAuthentication]
    permission_classes = [IsAuthenticated]  

    queryset = Customer.objects.all().order_by('CustomerID')
    serializer_class = CustomerSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['CustomerType', 'Source']
    search_fields = ['FirstName', 'LastName', 'Email']
    lookup_field = 'CustomerID'  # Use CustomerID as the lookup field
    
    def get_queryset(self):
        """
        Optionally restricts the returned customers by filtering
        against query parameters in the URL.
        """
        queryset = Customer.objects.all().order_by('CustomerID')
        
        # Get query parameters
        search = self.request.query_params.get('search', None)
        customer_type = self.request.query_params.get('customer_type', None)
        source = self.request.query_params.get('source', None)
        
        # Apply filters if parameters are provided
        if search:
            queryset = queryset.filter(
                Q(FirstName__icontains=search) |
                Q(LastName__icontains=search) |
                Q(Email__icontains=search)
            )
        
        if customer_type:
            queryset = queryset.filter(CustomerType=customer_type)
            
        if source:
            queryset = queryset.filter(Source=source)
            
        return queryset
    
    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single customer by ID.
        Returns a 404 error if the customer doesn't exist.
        """
        try:
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        except Customer.DoesNotExist:
            return Response(
                {"error": "Customer not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def create(self, request, *args, **kwargs):
        """
        Create a new customer with conditional field validation based on CustomerType.
        
        Validation rules:
        - FirstName and LastName are always required.
        - Either Email or Phone is always required.
        - All other fields are optional if CustomerType is 'Lead' or 'Disqualified Lead'.
        - All other fields except AadharCard and PANCard are mandatory if CustomerType is 'New', 'Active', or 'Dormant'.
        
        Returns:
        - 201 Created: If the customer is created successfully
        - 400 Bad Request: If validation fails, with detailed error messages
        """
        # Always set ClientId and CompanyId to 1
        data = request.data.copy()
        data['ClientId'] = 1
        data['CompanyId'] = 1
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            try:
                serializer.save()
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except IntegrityError as e:
                # Handle unique constraint violations
                error_message = str(e)
                if "Customers_Email_key" in error_message:
                    return Response(
                        {
                            "status": "error",
                            "message": "Validation failed",
                            "errors": {"Email": ["This email address is already registered."]}
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif "Customers_AadharCard_key" in error_message:
                    return Response(
                        {
                            "status": "error",
                            "message": "Validation failed",
                            "errors": {"AadharCard": ["This Aadhar Card number is already registered."]}
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                elif "Customers_PANCard_key" in error_message:
                    return Response(
                        {
                            "status": "error",
                            "message": "Validation failed",
                            "errors": {"PANCard": ["This PAN Card number is already registered."]}
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                else:
                    # For other integrity errors
                    return Response(
                        {
                            "status": "error",
                            "message": "Database constraint violation",
                            "errors": {"detail": ["This record cannot be created due to a database constraint."]}
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
        
        # Return detailed validation errors
        return Response(
            {
                "status": "error",
                "message": "Validation failed",
                "errors": serializer.errors
            }, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update an existing customer with conditional field validation based on CustomerType.
        
        Validation rules:
        - FirstName and LastName are always required.
        - Either Email or Phone is always required.
        - All other fields are optional if CustomerType is 'Lead' or 'Disqualified Lead'.
        - All other fields except AadharCard and PANCard are mandatory if CustomerType is 'New', 'Active', or 'Dormant'.
        
        Returns:
        - 200 OK: If the customer is updated successfully
        - 400 Bad Request: If validation fails, with detailed error messages
        - 404 Not Found: If the customer doesn't exist
        """
        try:
            # Always set ClientId and CompanyId to 1
            data = request.data.copy()
            data['ClientId'] = 1
            data['CompanyId'] = 1
            
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=data)
            if serializer.is_valid():
                try:
                    serializer.save()
                    return Response(serializer.data)
                except IntegrityError as e:
                    # Handle unique constraint violations
                    error_message = str(e)
                    if "Customers_Email_key" in error_message:
                        return Response(
                            {
                                "status": "error",
                                "message": "Validation failed",
                                "errors": {"Email": ["This email address is already registered."]}
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    elif "Customers_AadharCard_key" in error_message:
                        return Response(
                            {
                                "status": "error",
                                "message": "Validation failed",
                                "errors": {"AadharCard": ["This Aadhar Card number is already registered."]}
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    elif "Customers_PANCard_key" in error_message:
                        return Response(
                            {
                                "status": "error",
                                "message": "Validation failed",
                                "errors": {"PANCard": ["This PAN Card number is already registered."]}
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    else:
                        # For other integrity errors
                        return Response(
                            {
                                "status": "error",
                                "message": "Database constraint violation",
                                "errors": {"detail": ["This record cannot be updated due to a database constraint."]}
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
            
            # Return detailed validation errors
            return Response(
                {
                    "status": "error",
                    "message": "Validation failed",
                    "errors": serializer.errors
                }, 
                status=status.HTTP_400_BAD_REQUEST
            )
        except Customer.DoesNotExist:
            return Response(
                {"error": "Customer not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete an existing customer.
        Returns a 404 error if the customer doesn't exist.
        """
        try:
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Customer.DoesNotExist:
            return Response(
                {"error": "Customer not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
