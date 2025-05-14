from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import CsrfViewMiddleware

class CSRFExemptAPIMiddleware(MiddlewareMixin):
    """
    Middleware that exempts API requests from CSRF protection.
    This middleware should be placed before django.middleware.csrf.CsrfViewMiddleware
    in your MIDDLEWARE settings.
    """
    def process_request(self, request):
        # Check if the request is an API request
        # We consider a request to be an API request if:
        # 1. It has the Accept: application/json header, or
        # 2. It has the Content-Type: application/json header, or
        # 3. It's a request to an API URL path (starts with /api/ or contains /api/)
        
        # Check headers
        accept_header = request.META.get('HTTP_ACCEPT', '')
        content_type_header = request.META.get('HTTP_CONTENT_TYPE', '')
        content_type = request.META.get('CONTENT_TYPE', '')
        
        # Check path
        path = request.path_info
        
        is_api_request = (
            'application/json' in accept_header or
            'application/json' in content_type_header or
            'application/json' in content_type or
            path.startswith('/api/') or
            '/api/' in path or
            'platform-admin' in path or  # Specific to your platform admin API
            'tenant-admin' in path       # Specific to your tenant admin API
        )
        
        if is_api_request:
            # Mark the request as CSRF exempt
            setattr(request, '_dont_enforce_csrf_checks', True)
