from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings
from django.utils import timezone
import os
import uuid
from .models import DocumentMaster, Document
from .serializers import DocumentMasterSerializer, DocumentSerializer, DocumentUpdateSerializer
from customers.models import Customer
from django.db.models import Max, F, OuterRef, Subquery
from django.http import FileResponse, HttpResponse
import mimetypes

# Create your views here.

class DocumentTypeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for document types.
    
    Provides CRUD operations:
    - GET /document-types/ - List all document types
      Query parameters:
      - include_inactive: Set to 'true' to include inactive document types
    - POST /document-types/ - Create a new document type
    - GET /document-types/{id}/ - Retrieve a specific document type
    - PUT /document-types/{id}/ - Update a document type (full update)
    - PATCH /document-types/{id}/ - Update a document type (partial update)
    - DELETE /document-types/{id}/ - Delete a document type
    """
    queryset = DocumentMaster.objects.all().order_by('DocumentTypeName')
    
    def get_queryset(self):
        queryset = DocumentMaster.objects.all().order_by('DocumentTypeName')
        # Filter by status unless include_inactive is set to true
        include_inactive = self.request.query_params.get('include_inactive', 'false').lower() == 'true'
        if not include_inactive:
            queryset = queryset.filter(Status='Active')
        return queryset
    serializer_class = DocumentMasterSerializer
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

@api_view(['GET'])
# @permission_classes([IsAuthenticated])  # Uncomment if authentication is required
def list_documents(request):
    """
    API endpoint to retrieve a list of documents.
    
    Supports:
    - Filtering by CustomerId (optional)
    - Filtering by DocumentTypeId (optional)
    - Pagination
    - Returns only the latest version of each document
    
    Query parameters:
    - customer_id: Filter by customer ID (optional)
    - document_type_id: Filter by document type ID (optional)
    - page: Page number (default: 1)
    - page_size: Number of items per page (default: 10, max: 100)
    
    Returns:
    - 200 OK: List of documents
    - 400 Bad Request: Invalid query parameters
    - 500 Internal Server Error: Error retrieving documents
    """
    try:
        # Get query parameters
        customer_id = request.query_params.get('customer_id')
        document_type_id = request.query_params.get('document_type_id')
        page = int(request.query_params.get('page', '1'))
        page_size = min(int(request.query_params.get('page_size', '10')), 100)  # Limit max page size to 100
        
        # Validate page and page_size
        if page < 1 or page_size < 1:
            return Response(
                {'error': 'Page and page_size must be positive integers'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Base queryset
        queryset = Document.objects.all()
        
        # Filter by customer_id if provided
        if customer_id:
            try:
                # Verify customer exists
                Customer.objects.get(CustomerID=customer_id)
                queryset = queryset.filter(CustomerId__CustomerID=customer_id)
            except Customer.DoesNotExist:
                return Response(
                    {'error': f'Customer with ID {customer_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            except ValueError:
                return Response(
                    {'error': 'Invalid customer_id format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Filter by document_type_id if provided
        if document_type_id:
            try:
                # Verify document type exists
                DocumentMaster.objects.get(DocumentTypeId=document_type_id)
                queryset = queryset.filter(DocumentTypeId=document_type_id)
            except DocumentMaster.DoesNotExist:
                return Response(
                    {'error': f'Document type with ID {document_type_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            except ValueError:
                return Response(
                    {'error': 'Invalid document_type_id format'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Filter documents to only include those with 'Latest' status
        latest_documents = queryset.filter(DocumentStatus=Document.LATEST)
        
        # Order by most recently updated
        latest_documents = latest_documents.order_by('-UpdatedAt')
        
        # Calculate pagination
        total_items = latest_documents.count()
        total_pages = (total_items + page_size - 1) // page_size  # Ceiling division
        
        # Apply pagination
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_documents = latest_documents[start_index:end_index]
        
        # Serialize the documents
        serializer = DocumentSerializer(paginated_documents, many=True)
        
        # Prepare pagination metadata
        pagination_data = {
            'count': total_items,
            'total_pages': total_pages,
            'current_page': page,
            'page_size': page_size,
            'next': page + 1 if page < total_pages else None,
            'previous': page - 1 if page > 1 else None,
        }
        
        # Return the response
        return Response({
            'results': serializer.data,
            'pagination': pagination_data
        }, status=status.HTTP_200_OK)
    
    except ValueError as e:
        return Response(
            {'error': f'Invalid query parameter: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Error retrieving documents: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET', 'PUT', 'PATCH'])
@parser_classes([MultiPartParser, FormParser, JSONParser])
# @permission_classes([IsAuthenticated])  # Uncomment if authentication is required
def document_detail(request, document_id):
    """
    API endpoint to retrieve or update a single document by its DocumentId.
    
    HTTP Methods:
    - GET: Retrieve document details
    - PUT: Update document metadata (full update)
    - PATCH: Update document metadata (partial update)
    
    Path parameters:
    - document_id: ID of the document to retrieve or update
    
    Request body (for PUT/PATCH):
    - VisibleToCust: Boolean indicating whether the document is visible to customers
    
    Returns:
    - 200 OK: Document data
    - 400 Bad Request: Invalid request data (for PUT/PATCH)
    - 404 Not Found: Document not found
    - 500 Internal Server Error: Error retrieving or updating document
    """
    try:
        # Try to get the document by ID
        try:
            document = Document.objects.get(DocumentId=document_id)
        except Document.DoesNotExist:
            return Response(
                {'error': f'Document with ID {document_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Handle GET request
        if request.method == 'GET':
            # Serialize the document
            serializer = DocumentSerializer(document)
            
            # Return the document data
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Handle PUT/PATCH requests
        elif request.method in ['PUT', 'PATCH']:
            # Check if a file is being uploaded
            if 'File' in request.FILES:
                # Get the original document data
                original_document = document
                customer = original_document.CustomerId
                document_type = original_document.DocumentTypeId
                visible_to_cust = request.data.get('VisibleToCust', str(original_document.VisibleToCust)).lower() == 'true'
                
                # Get the uploaded file
                file = request.FILES['File']
                original_filename = file.name
                file_extension = os.path.splitext(original_filename)[1]
                
                # Get the current date in a format suitable for filenames (YYYYMMDD)
                date_stamp = timezone.now().strftime('%Y%m%d')
                
                # Calculate the new version number
                version = original_document.Version + 1
                
                # Generate the new filename according to the convention: <DocumentTypeName>_<Version>_<DateStamp>.<extension>
                # Replace spaces with underscores in document type name for filenames
                safe_doc_type_name = document_type.DocumentTypeName.replace(' ', '_')
                new_filename = f"{safe_doc_type_name}_{version}_{date_stamp}{file_extension}"
                
                # Create customer directory with format firstname_lastname_customerid
                customer_folder_name = f"{customer.FirstName.lower()}_{customer.LastName.lower()}_{customer.CustomerID}"
                
                # Create document type subfolder (adminshared or applicantshared)
                if document_type.DocumentType == DocumentMaster.ADMIN_SHARED:
                    document_type_folder = 'adminshared'
                else:  # APPLICANT_SHARED
                    document_type_folder = 'applicantshared'
                
                # Create directory structure
                base_dir = 'C:\\software4ca_docs'
                customer_dir = os.path.join(base_dir, customer_folder_name)
                document_type_dir = os.path.join(customer_dir, document_type_folder)
                
                # Create directories if they don't exist
                os.makedirs(document_type_dir, exist_ok=True)
                
                # Full path to save the file
                file_path = os.path.join(document_type_dir, new_filename)
                
                # Relative path to store in the database (relative to MEDIA_ROOT)
                relative_path = os.path.join(customer_folder_name, document_type_folder, new_filename)
                
                # Save the file
                with open(file_path, 'wb+') as destination:
                    for chunk in file.chunks():
                        destination.write(chunk)
                
                # Update existing document status to 'Deprecated'
                Document.objects.filter(
                    CustomerId=customer,
                    DocumentTypeId=document_type,
                    DocumentStatus=Document.LATEST
                ).update(
                    DocumentStatus=Document.DEPRECATED,
                    UpdatedAt=timezone.now(),
                    UpdatedBy=str(request.user) if request.user.is_authenticated else 'system'
                )
                
                # Create a new document record with 'Latest' status
                new_document = Document(
                    CustomerId=customer,
                    DocumentTypeId=document_type,
                    DocumentName=new_filename,
                    OriginalName=original_filename,
                    FilePath=relative_path,
                    DocumentStatus=Document.LATEST,
                    VisibleToCust=visible_to_cust,
                    Version=version,
                    VersionDate=timezone.now(),
                    CreatedBy=str(request.user) if request.user.is_authenticated else 'system',
                    UpdatedBy=str(request.user) if request.user.is_authenticated else 'system'
                )
                new_document.save()
                
                # Return the new document data
                serializer = DocumentSerializer(new_document)
                return Response(serializer.data, status=status.HTTP_200_OK)
            else:
                # Handle metadata update only (no file upload)
                serializer = DocumentUpdateSerializer(document, data=request.data, context={'request': request}, partial=request.method == 'PATCH')
                
                # Validate the serializer
                if serializer.is_valid():
                    # Save the updated document
                    serializer.save()
                    
                    # Return the updated document data using the full serializer
                    full_serializer = DocumentSerializer(document)
                    return Response(full_serializer.data, status=status.HTTP_200_OK)
                else:
                    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        error_action = 'retrieving' if request.method == 'GET' else 'updating'
        return Response(
            {'error': f'Error {error_action} document: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
# @permission_classes([IsAuthenticated])  # Uncomment if authentication is required
def get_document_versions(request, document_id):
    """
    API endpoint to retrieve all versions of a document.
    
    Path parameters:
    - document_id: ID of the document to retrieve versions for
    
    Returns:
    - 200 OK: Array of document version objects
    - 404 Not Found: Document not found
    - 500 Internal Server Error: Error retrieving document versions
    """
    try:
        # Try to get the document by ID
        try:
            document = Document.objects.get(DocumentId=document_id)
        except Document.DoesNotExist:
            return Response(
                {'error': f'Document with ID {document_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all versions of the document (same customer and document type)
        document_versions = Document.objects.filter(
            CustomerId=document.CustomerId,
            DocumentTypeId=document.DocumentTypeId
        ).order_by('-VersionDate', '-Version')
        
        # Serialize the document versions
        serializer = DocumentSerializer(document_versions, many=True)
        
        # Return the document versions
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    except Exception as e:
        return Response(
            {'error': f'Error retrieving document versions: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@parser_classes([MultiPartParser, FormParser])
# @permission_classes([IsAuthenticated])  # Uncomment if authentication is required
def upload_document(request):
    """
    API endpoint to upload a document.
    
    Accepts form data with:
    - CustomerId: ID of the customer
    - DocumentTypeId: ID of the document type
    - File: The file to upload
    - VisibleToCust: Whether the document is visible to the customer (optional, default: false)
    
    Returns:
    - 201 Created: Document uploaded successfully
    - 400 Bad Request: Invalid input data
    - 404 Not Found: Customer or document type not found
    - 500 Internal Server Error: Error uploading document
    """
    try:
        # Validate input data
        customer_id = request.data.get('CustomerId')
        document_type_id = request.data.get('DocumentTypeId')
        user_docu_name = request.data.get('UserDocuName', '')
        visible_to_cust = request.data.get('VisibleToCust', 'false').lower() == 'true'
        
        if not customer_id or not document_type_id or 'File' not in request.FILES:
            return Response(
                {'error': 'CustomerId, DocumentTypeId, and File are required fields'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify customer and document type exist
        try:
            customer = Customer.objects.get(CustomerID=customer_id)
        except Customer.DoesNotExist:
            return Response(
                {'error': f'Customer with ID {customer_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            document_type = DocumentMaster.objects.get(DocumentTypeId=document_type_id)
        except DocumentMaster.DoesNotExist:
            return Response(
                {'error': f'Document type with ID {document_type_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the uploaded file
        file = request.FILES['File']
        original_filename = file.name
        file_extension = os.path.splitext(original_filename)[1]
        
        # Get the current date in a format suitable for filenames (YYYYMMDD)
        date_stamp = timezone.now().strftime('%Y%m%d')
        
        # Check if there are existing versions of this document type for this customer
        version = 1
        existing_docs = Document.objects.filter(
            CustomerId=customer,
            DocumentTypeId=document_type
        ).order_by('-Version')
        
        if existing_docs.exists():
            # If there are existing versions, increment the version number
            version = existing_docs.first().Version + 1
        
        # Generate the new filename according to the convention: <DocumentTypeName>_<Version>_<DateStamp>.<extension>
        # Replace spaces with underscores in document type name for filenames
        safe_doc_type_name = document_type.DocumentTypeName.replace(' ', '_')
        new_filename = f"{safe_doc_type_name}_{version}_{date_stamp}{file_extension}"
        
        # Create customer directory with format firstname_lastname_customerid
        customer_folder_name = f"{customer.FirstName.lower()}_{customer.LastName.lower()}_{customer.CustomerID}"
        
        # Create document type subfolder (adminshared or applicantshared)
        if document_type.DocumentType == DocumentMaster.ADMIN_SHARED:
            document_type_folder = 'adminshared'
        else:  # APPLICANT_SHARED
            document_type_folder = 'applicantshared'
        
        # Create directory structure: C:\software4ca_docs\firstname_lastname_customerid\document_type_folder\
        base_dir = 'C:\\software4ca_docs'
        customer_dir = os.path.join(base_dir, customer_folder_name)
        document_type_dir = os.path.join(customer_dir, document_type_folder)
        
        # Create directories if they don't exist
        os.makedirs(document_type_dir, exist_ok=True)
        
        # Full path to save the file
        file_path = os.path.join(document_type_dir, new_filename)
        
        # Relative path to store in the database (relative to MEDIA_ROOT)
        relative_path = os.path.join(customer_folder_name, document_type_folder, new_filename)
        
        # Save the file
        with open(file_path, 'wb+') as destination:
            for chunk in file.chunks():
                destination.write(chunk)
        
        # Before creating the new document, find any existing documents with the same DocumentTypeId and CustomerId
        # and update their status to 'Deprecated'
        existing_documents = Document.objects.filter(
            CustomerId=customer,
            DocumentTypeId=document_type
        )
        
        if existing_documents.exists():
            existing_documents.update(
                DocumentStatus=Document.DEPRECATED,
                UpdatedAt=timezone.now(),
                UpdatedBy=str(request.user) if request.user.is_authenticated else 'system'
            )
        
        # Create document record with 'Latest' status
        # If UserDocuName is blank, default to OriginalName
        if not user_docu_name.strip():
            user_docu_name = original_filename
            
        document = Document(
            CustomerId=customer,
            DocumentTypeId=document_type,
            DocumentName=new_filename,  # Store the new filename in DocumentName
            UserDocuName=user_docu_name,  # Store the user-provided document name or default to original filename
            OriginalName=original_filename,  # Store the original filename
            FilePath=relative_path,
            DocumentStatus=Document.LATEST,  # Set status to Latest
            VisibleToCust=visible_to_cust,
            Version=version,  # Use the calculated version
            VersionDate=timezone.now(),
            CreatedBy=str(request.user) if request.user.is_authenticated else 'system',
            UpdatedBy=str(request.user) if request.user.is_authenticated else 'system'
        )
        document.save()
        
        # Return document metadata
        serializer = DocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    except Exception as e:
        return Response(
            {'error': f'Error uploading document: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET'])
# @permission_classes([IsAuthenticated])  # Uncomment if authentication is required
def download_document(request, document_id):
    """
    API endpoint to download a document file.
    
    Path parameters:
    - document_id: ID of the document to download
    
    Returns:
    - File response with appropriate Content-Disposition header
    - 404 Not Found: Document not found or file not found
    - 500 Internal Server Error: Error downloading document
    """
    try:
        # Try to get the document by ID
        try:
            document = Document.objects.get(DocumentId=document_id)
        except Document.DoesNotExist:
            return Response(
                {'error': f'Document with ID {document_id} not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Construct the full file path - FilePath now contains firstname_lastname_customerid/documenttype/filename
        file_path = os.path.join(settings.MEDIA_ROOT, document.FilePath)
        
        # Check if the file exists
        if not os.path.exists(file_path):
            return Response(
                {'error': f'File not found at {file_path}'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Determine the file's MIME type
        content_type, encoding = mimetypes.guess_type(file_path)
        if content_type is None:
            content_type = 'application/octet-stream'
        
        # Open the file
        file = open(file_path, 'rb')
        
        # Create a file response
        response = FileResponse(file, content_type=content_type)
        
        # Set the Content-Disposition header for download
        response['Content-Disposition'] = f'attachment; filename="{document.DocumentName}"'
        
        return response
    
    except Exception as e:
        return Response(
            {'error': f'Error downloading document: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
