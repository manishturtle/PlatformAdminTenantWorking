from functools import wraps
from django.http import JsonResponse
import jwt
from django.conf import settings
from customers.models import Customer

def portal_auth_required(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        # List of endpoints that don't require authentication
        public_endpoints = [
            '/api/portal/check-email/',
            '/api/portal/login/',
            '/api/portal/request-otp/',
            '/api/portal/verify-otp/',
            '/api/portal/resend-otp/',
            '/api/portal/signup/'
        ]

        # Skip authentication for public endpoints
        if any(request.path.endswith(endpoint.rstrip('/')) for endpoint in public_endpoints):
            return view_func(request, *args, **kwargs)

        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'error': 'No token provided'}, status=401)

        token = auth_header.split(' ')[1]
        try:
            # Use a different secret key for portal tokens
            payload = jwt.decode(token, settings.PORTAL_JWT_SECRET, algorithms=['HS256'])
            customer_id = payload.get('customer_id')
            
            if not customer_id:
                return JsonResponse({'error': 'Invalid token'}, status=401)

            # Get customer and verify portal access
            try:
                customer = Customer.objects.get(id=customer_id)
                if not customer.AllowPortalAccess:
                    return JsonResponse({'error': 'Portal access denied'}, status=403)
                if not customer.EmailVerified:
                    return JsonResponse({'error': 'Email not verified'}, status=403)
                
                # Attach customer to request
                request.customer = customer
                return view_func(request, *args, **kwargs)
            except Customer.DoesNotExist:
                return JsonResponse({'error': 'Customer not found'}, status=401)

        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired'}, status=401)
        except jwt.InvalidTokenError:
            return JsonResponse({'error': 'Invalid token'}, status=401)

    return _wrapped_view
