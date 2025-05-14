from rest_framework import viewsets, status
from rest_framework.response import Response
from django.db import connection
from ecomm_tenant.api_utils import APIErrorResponse
import logging

logger = logging.getLogger(__name__)

class TenantAwareViewSet(viewsets.ModelViewSet):
    """
    Base viewset that ensures all operations are tenant-aware.
    This class ensures that data is properly isolated per tenant and that
    required tables exist before processing any request.
    """
    
    # List of paths that should skip tenant check (e.g., public endpoints)
    skip_tenant_check_paths = ['/api/platform-admin/', '/api/public/']

    def dispatch(self, request, *args, **kwargs):
        """
        Override dispatch to ensure tables exist before processing any request.
        """
        try:
            # Get model class from queryset
            model_class = self.get_queryset().model
            
            # Ensure table exists
            table_exists = model_class.create_table_if_not_exists()
            if not table_exists:
                logger.error(f"Could not create required table for {model_class.__name__}")
                return APIErrorResponse.server_error(
                    message=f"Could not create required table for {model_class.__name__}"
                )
                
            # Set search path to prioritize tenant schema
            if hasattr(connection, 'schema_name'):
                with connection.cursor() as cursor:
                    cursor.execute(f'SET search_path TO "{connection.schema_name}", public')
            
            # Check if tenant exists
            if not hasattr(request, 'tenant') and not self._should_skip_tenant_check(request):
                tenant_slug = request.path_info.split('/')[2] if '/api/' in request.path_info else None
                if tenant_slug:
                    return APIErrorResponse.tenant_not_found(tenant_slug)
            
            return super().dispatch(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error in tenant-aware dispatch: {str(e)}")
            return APIErrorResponse.server_error(
                message="Tenant setup error", 
                exception=e
            )

    def get_queryset(self):
        """
        Return queryset for the current tenant.
        The tenant context is set by the TenantRoutingMiddleware.
        """
        queryset = super().get_queryset()
        
        # Apply tenant filtering if needed
        if hasattr(self.request, 'tenant') and hasattr(queryset.model, 'client_id'):
            tenant_id = getattr(self.request.tenant, 'id', None)
            if tenant_id:
                queryset = queryset.filter(client_id=tenant_id)
        
        return queryset

    def perform_create(self, serializer):
        """
        Perform create operation in the context of the current tenant.
        """
        # Set tenant-specific fields
        if hasattr(self.request, 'tenant'):
            tenant_id = getattr(self.request.tenant, 'id', None)
            if tenant_id:
                serializer.save(
                    created_by=self.request.user if hasattr(self.request, 'user') else None,
                    client_id=tenant_id,
                    company_id=getattr(self.request.user, 'company_id', 1) if hasattr(self.request, 'user') else 1
                )
                return
        
        # Fallback if tenant context is not available
        serializer.save(created_by=self.request.user if hasattr(self.request, 'user') else None)

    def perform_update(self, serializer):
        """
        Perform update operation in the context of the current tenant.
        """
        # Set tenant-specific fields
        if hasattr(self.request, 'tenant'):
            tenant_id = getattr(self.request.tenant, 'id', None)
            if tenant_id:
                serializer.save(
                    updated_by=self.request.user if hasattr(self.request, 'user') else None,
                    client_id=tenant_id,
                    company_id=getattr(self.request.user, 'company_id', 1) if hasattr(self.request, 'user') else 1
                )
                return
        
        # Fallback if tenant context is not available
        serializer.save(updated_by=self.request.user if hasattr(self.request, 'user') else None)

    def perform_destroy(self, instance):
        """
        Perform destroy operation in the context of the current tenant.
        """
        # Ensure we're using the tenant schema
        if hasattr(connection, 'schema_name'):
            with connection.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{connection.schema_name}", public')
        
        # Perform the deletion
        instance.delete()
    
    def _should_skip_tenant_check(self, request):
        """
        Determine if tenant check should be skipped for this request.
        """
        path = request.path_info
        return any(path.startswith(prefix) for prefix in self.skip_tenant_check_paths)
