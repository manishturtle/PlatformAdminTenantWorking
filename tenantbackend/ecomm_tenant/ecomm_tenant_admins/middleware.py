from django.conf import settings
from django.db import connection
from django.http import Http404, HttpResponseNotFound, JsonResponse
from django.urls import resolve, Resolver404
from django.utils.deprecation import MiddlewareMixin
from ecomm_superadmin.models import Tenant, Domain
from ecomm_tenant.tenant_utils import get_tenant_by_slug, set_tenant_context, ensure_tenant_tables, set_search_path, reset_search_path
from ecomm_tenant.app_registry import TenantAppRegistry
import re
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class TenantRoutingMiddleware(MiddlewareMixin):
    """
    Custom middleware to handle path-based routing in a multi-tenant application.
    
    This middleware extracts tenant slugs from URL paths and sets the appropriate schema
    for tenant-specific requests. It modifies the request path to remove the tenant slug
    so that the URL resolver can find the correct view.
    
    Supports multiple URL patterns:
    1. /{tenant_slug}/ - For tenant users
    2. /{tenant_slug}/tenant-admin/ - For tenant admins
    3. /platform-admin/ - For platform admins
    4. /api/{tenant_slug}/... - For API calls
    5. /{tenant_slug}/api/... - For legacy API calls (will be normalized)
    
    This middleware handles schema routing for all registered tenant-aware applications.
    New applications can be added to the tenant system by registering them in the
    TenantAppRegistry.
    """
    
    def __init__(self, get_response):
        """
        Initialize the middleware with the get_response callable.
        """
        self.get_response = get_response
        logger.info("TenantRoutingMiddleware initialized")
    
    def __call__(self, request):
        """
        Process each request to check for tenant-specific URLs.
        """
        # Get the request path
        path = request.path_info
        
        # Log every request for debugging
        logger.info(f"TenantRoutingMiddleware processing request: {path}")
        
        # Skip processing for static, media, and admin paths
        if self._should_skip_processing(path):
            logger.info(f"Skipping path: {path}")
            return self.get_response(request)
        
        # Extract tenant slug from URL
        tenant_slug = self._extract_tenant_slug(request)
        
        if tenant_slug:
            logger.info(f"Extracted tenant slug: {tenant_slug}")
            
            # Get tenant by slug
            tenant = get_tenant_by_slug(tenant_slug)
            
            if tenant:
                # Set up tenant context
                self._setup_tenant_context(request, tenant, tenant_slug)
                
                # Normalize path if needed
                self._normalize_path(request, tenant_slug)
            else:
                # Return an error for invalid tenant slug
                logger.warning(f"No tenant found for slug: {tenant_slug}")
                # Check if this is an API request
                if '/api/' in request.path_info:
                    # Return JSON error for API requests
                    return JsonResponse({
                        'error': 'Invalid tenant slug',
                        'message': f'The tenant "{tenant_slug}" does not exist',
                        'status_code': 404
                    }, status=404)
                else:
                    # Return HTML error for browser requests
                    return HttpResponseNotFound(f"<h1>Invalid Tenant</h1><p>The tenant \"{tenant_slug}\" does not exist.</p>")
        
        # Process the request
        response = self.get_response(request)
        
        # Reset schema to public
        if hasattr(request, 'tenant_url') and request.tenant_url:
            reset_search_path()
            logger.debug(f"Reset schema to public after processing request: {path}")
        
        return response
    
    def _should_skip_processing(self, path):
        """
        Check if path should skip tenant processing
        """
        skip_prefixes = ['/admin/', '/static/', '/media/', '/platform-admin/', '/api/platform-admin/']
        return any(path.startswith(prefix) for prefix in skip_prefixes)
    
    def _extract_tenant_slug(self, request):
        """
        Extract tenant slug from URL, headers, or JWT token
        """
        path = request.path_info
        path_parts = path.split('/')
        
        # API pattern: /api/{tenant_slug}/...
        if len(path_parts) > 2 and path_parts[1] == 'api' and len(path_parts) > 2 and path_parts[2]:
            tenant_slug = path_parts[2]
            
            # Handle [tenant] placeholder
            if tenant_slug == '[tenant]':
                # Try header
                header_tenant = request.META.get('HTTP_X_TENANT_NAME')
                if header_tenant and header_tenant != '[tenant]':
                    return header_tenant
                
                # Try JWT token
                tenant_slug = self._extract_tenant_from_jwt(request)
                if tenant_slug:
                    return tenant_slug
            
            return tenant_slug
            
        # Frontend pattern: /{tenant_slug}/...
        elif len(path_parts) > 1 and path_parts[1] and path_parts[1] != 'api':
            return path_parts[1]
        
        # Check headers as fallback
        header_tenant = request.META.get('HTTP_X_TENANT_NAME')
        if header_tenant and header_tenant != '[tenant]':
            return header_tenant
            
        return None
    
    def _extract_tenant_from_jwt(self, request):
        """
        Extract tenant slug from JWT token
        """
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            jwt_auth = JWTAuthentication()
            
            header = jwt_auth.get_header(request)
            if header:
                raw_token = jwt_auth.get_raw_token(header)
                if raw_token:
                    validated_token = jwt_auth.get_validated_token(raw_token)
                    token_tenant_slug = validated_token.get('tenant_slug')
                    if token_tenant_slug:
                        logger.info(f"Using tenant slug from JWT token: {token_tenant_slug}")
                        return token_tenant_slug
        except Exception as e:
            logger.warning(f"Error extracting tenant from JWT token: {str(e)}")
        
        return None
    
    def _setup_tenant_context(self, request, tenant, tenant_slug):
        """
        Set up tenant context on request and connection
        """
        # Set tenant on connection
        set_tenant_context(tenant)
        
        # Set tenant on request
        request.tenant = tenant
        request.tenant_slug = tenant_slug
        request.tenant_url = True
        
        # Check if this is a tenant admin route
        path_parts = request.path_info.split('/')
        is_tenant_admin = False
        
        # Check for tenant-admin in path
        if '/tenant-admin/' in request.path_info or '/tenant-admin-roles/' in request.path_info:
            is_tenant_admin = True
        elif len(path_parts) > 3 and path_parts[3] in ['tenant-admin', 'tenant-admin-roles']:
            is_tenant_admin = True
        
        if is_tenant_admin:
            request.is_tenant_admin = True
            request.META['HTTP_X_TENANT_ADMIN'] = 'true'
        
        # Set tenant name header
        request.META['HTTP_X_TENANT_NAME'] = tenant_slug
        
        # Ensure all tenant tables exist for registered apps
        ensure_tenant_tables(tenant)
        
        logger.info(f"Set tenant context for {tenant_slug} with schema {tenant.schema_name}")
    
    def _normalize_path(self, request, tenant_slug):
        """
        Normalize path for consistent routing
        """
        path = request.path_info
        path_parts = path.split('/')
        
        # Handle problematic pattern: /{tenant_slug}/api/...
        if path.startswith(f'/{tenant_slug}/api/'):
            # Transform /{tenant_slug}/api/... to /api/{tenant_slug}/...
            new_path = f'/api/{tenant_slug}/' + '/'.join(path_parts[3:])
            request.path_info = new_path
            logger.debug(f"Normalized path from {path} to {new_path}")
            
            # Check if this is a tenant-admin API route after transformation
            if '/tenant-admin/' in new_path:
                request.is_tenant_admin = True
                request.META['HTTP_X_TENANT_ADMIN'] = 'true'
