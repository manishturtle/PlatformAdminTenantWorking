import jwt
from django.conf import settings
from rest_framework import authentication
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth.models import AnonymousUser

class JWTCustomUser:
    """
    Custom user class for JWT authentication
    """
    def __init__(self, user_id):
        self.user_id = user_id
        self.is_authenticated = True

    def __str__(self):
        return self.user_id


class JWTAuthentication(authentication.BaseAuthentication):
    """
    Custom JWT authentication for Django REST Framework
    """
    def authenticate(self, request):
        # Get the Authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if not auth_header:
            return None
        
        # Check if the header starts with 'Bearer '
        if not auth_header.startswith('Bearer '):
            return None
        
        # Extract the token
        token = auth_header.split(' ')[1]
        
        try:
            # Decode the token
            payload = jwt.decode(
                token, 
                settings.SIMPLE_JWT['SIGNING_KEY'],
                algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
            )
            
            # Get the user_id from the token
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('Invalid token: user_id not found')
            
            # Create a custom user object
            user = JWTCustomUser(user_id)
            
            # Return the user and token
            return (user, token)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            raise AuthenticationFailed(f'Authentication failed: {str(e)}')
