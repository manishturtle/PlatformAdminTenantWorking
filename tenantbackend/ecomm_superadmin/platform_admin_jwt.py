from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
import jwt
from django.conf import settings
import logging
from django.db import connection

logger = logging.getLogger(__name__)

class PlatformAdminJWTAuthentication(BaseAuthentication):
    """
    JWT Authentication for Platform Admin.
    This does not switch tenant schemas as it's meant for platform admin access.
    """
    
    def authenticate(self, request):
        """
        Authenticate the request using JWT token.
        Verifies the user exists in the ecomm_superadmin_user table.
        """
        # Get the authorization header
        auth_header = get_authorization_header(request).split()
        
        if not auth_header or len(auth_header) != 2:
            return None  # Let other authentication backends try

        try:
            # The header should be "Bearer <token>"
            if auth_header[0].lower() != b'bearer':
                raise AuthenticationFailed('Authorization header must start with Bearer')

            token = auth_header[1].decode('utf-8')

            # Decode and verify the JWT token
            payload = jwt.decode(
                token,
                settings.SIMPLE_JWT['SIGNING_KEY'],
                algorithms=[settings.SIMPLE_JWT['ALGORITHM']],
                options={
                    'verify_exp': True,
                    'verify_aud': False,
                    'verify_iss': False,
                }
            )

            # Extract user_id from token
            user_id = payload.get('user_id')
            if not user_id:
                raise AuthenticationFailed('User ID not found in token')

            # Verify user exists in ecomm_superadmin_user table
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT id, email, is_active, is_staff 
                    FROM ecomm_superadmin_user 
                    WHERE id = %s
                """, [user_id])
                
                user_data = cursor.fetchone()
                
                if not user_data:
                    raise AuthenticationFailed('User not found in platform admin database')
                    
                user_id, email, is_active, is_staff = user_data
                
                if not is_active:
                    raise AuthenticationFailed('User account is disabled')
                    
                if not is_staff:
                    raise AuthenticationFailed('User is not authorized as platform admin')

            # Get the user model for DRF
            User = get_user_model()
            try:
                user = User.objects.using('default').get(id=user_id)
                return (user, token)
            except User.DoesNotExist:
                # This should not happen if the raw SQL query found the user
                raise AuthenticationFailed('User not found in auth system')

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            logger.warning(f'Invalid token: {str(e)}')
            raise AuthenticationFailed('Invalid token')
        except Exception as e:
            logger.error(f'Authentication error: {str(e)}', exc_info=True)
            raise AuthenticationFailed('Authentication failed')