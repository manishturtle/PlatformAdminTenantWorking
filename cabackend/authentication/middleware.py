import re
import jwt
from django.http import JsonResponse
from django.conf import settings
from rest_framework import status
from django.contrib.auth.models import AnonymousUser
from .authentication import JWTCustomUser

class JWTAuthenticationMiddleware:
    """
    Middleware to authenticate requests using JWT tokens.
    Protects all endpoints except those in the EXEMPT_URLS list.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        # Define URLs that don't require authentication
        self.EXEMPT_URLS = [
            r'^/api/login/$',    # Login endpoint with api prefix
            r'^/api/token/$',    # Token obtain endpoint
            r'^/login/$',        # Login endpoint
            r'^/admin/',         # Admin panel
            r'^/api-auth/',      # DRF browsable API authentication
            r'^/docs/',          # API documentation
            r'^/$',              # Root URL
            r'^/sops/',          # SOP endpoints
        ]
        self.EXEMPT_PATTERNS = [re.compile(url) for url in self.EXEMPT_URLS]

    def __call__(self, request):
        # Check if the URL is exempt from authentication
        path = request.path_info
        
        # Print debug information
        print(f"Processing request to: {path}")
        
        # Check if the URL is exempt from authentication
        if any(pattern.match(path) for pattern in self.EXEMPT_PATTERNS):
            print(f"URL {path} is exempt from authentication")
            return self.get_response(request)

        # Skip OPTIONS requests for CORS
        if request.method == 'OPTIONS':
            print(f"Skipping OPTIONS request for CORS")
            return self.get_response(request)

        # Get the Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        # If no Authorization header, return 401
        if not auth_header:
            print(f"No Authorization header found")
            return JsonResponse(
                {'error': 'Authentication credentials were not provided.'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Validate the JWT token
        try:
            # Extract the token from the Authorization header
            if not auth_header.startswith('Bearer '):
                print(f"Authorization header does not start with 'Bearer '")
                return JsonResponse(
                    {'error': 'Invalid token format. Header must start with "Bearer "'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Get the token part (after "Bearer ")
            token = auth_header.split(' ')[1]
            
            # Decode and validate the token
            payload = jwt.decode(
                token, 
                settings.SIMPLE_JWT['SIGNING_KEY'],
                algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
            )
            
            # Check if the token has a user_id claim
            user_id = payload.get('user_id')
            if not user_id:
                print(f"Token does not contain user_id")
                return JsonResponse(
                    {'error': 'Invalid token: user_id not found'}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            # Set a custom user object on the request
            request.user = JWTCustomUser(user_id)
            print(f"Authentication successful for user: {user_id}")
            
        except jwt.ExpiredSignatureError:
            print("Token has expired")
            return JsonResponse(
                {'error': 'Token has expired'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except jwt.InvalidTokenError:
            print("Invalid token")
            return JsonResponse(
                {'error': 'Invalid token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            print(f"Error validating token: {str(e)}")
            return JsonResponse(
                {'error': f'Error validating token: {str(e)}'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # If we get here, the token is valid and we can proceed
        return self.get_response(request)
