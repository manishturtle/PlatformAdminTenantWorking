# # authentication.py (or wherever you want to define it)
# from rest_framework.authentication import BaseAuthentication
# from rest_framework.exceptions import AuthenticationFailed
# import jwt
# from django.conf import settings

# class CustomJWTAuthentication(BaseAuthentication):
#     def authenticate(self, request):
#         # Get the token from the Authorization header
#         auth_header = request.headers.get('Authorization')
#         if not auth_header:
#             raise AuthenticationFailed('Authorization header missing')

#         try:
#             # Split 'Bearer <token>'
#             parts = auth_header.split()
#             if parts[0].lower() != 'bearer':
#                 raise AuthenticationFailed('Authorization header must start with Bearer')
#             if len(parts) == 1:
#                 raise AuthenticationFailed('Token not found')
#             elif len(parts) > 2:
#                 raise AuthenticationFailed('Authorization header must be Bearer <token>')

#             token = parts[1]
#             # Decode the JWT token
#             payload = jwt.decode(token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=[settings.SIMPLE_JWT['ALGORITHM']])

#             # Extract tenant_slug from the token payload
#             tenant_slug = payload.get('tenant_slug')
#             if not tenant_slug:
#                 raise AuthenticationFailed('Tenant slug not found in token')

#             # Fetch the user from the custom user table using tenant_slug and any other criteria (e.g., email or id)
#             user = CustomUser.objects.filter(tenant_slug=tenant_slug).first()
#             if not user:
#                 raise AuthenticationFailed('User not found')

#             # Attach user object to the request
#             return (user, token)  # Return the user and token

#         except jwt.ExpiredSignatureError:
#             raise AuthenticationFailed('token is expired')
#         except jwt.DecodeError:
#             raise AuthenticationFailed('token is invalid')
#         except Exception as e:
#             raise AuthenticationFailed(str(e))



# authentication.py
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
import jwt
from django.conf import settings
from django.db import connection, connections
from django.db.utils import ConnectionDoesNotExist
from threading import local, current_thread
from functools import wraps
class SimpleTenantUser:
    """A minimal user class that provides just what DRF needs"""
    
    def __init__(self, user_id, tenant_slug, tenant_id):
        self._user_id = user_id
        self._tenant_slug = tenant_slug
        self._tenant_id = tenant_id

    @property
    def id(self):
        return self._user_id

    @property
    def tenant_slug(self):
        return self._tenant_slug

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_active(self):
        return True

    def get_username(self):
        return str(self._user_id)

    def __str__(self):
        return f"TenantUser(user_id={self._user_id}, tenant={self._tenant_slug}, tenant_id={self._tenant_id})"

from .router import _thread_locals, get_current_schema

# Using get_current_schema from router.py

def validate_schema_name(schema_name):
    """Validate schema name to prevent SQL injection"""
    if not schema_name.isalnum() and not all(c in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_' for c in schema_name):
        raise AuthenticationFailed('Invalid schema name')

def schema_exists(schema_name):
    """Check if the schema exists in the database"""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = %s);",
            [schema_name]
        )
        return cursor.fetchone()[0]

def set_schema_for_request(schema_name):
    """Set the schema for the current request/thread"""
    # Validate schema name
    validate_schema_name(schema_name)
    
    # Check if schema exists
    if not schema_exists(schema_name):
        raise AuthenticationFailed(f'Schema {schema_name} does not exist')
    
    _thread_locals.schema = schema_name
    with connection.cursor() as cursor:
        try:
            # First reset to public schema
            cursor.execute('SET search_path TO public;')
            # Then set to the tenant schema
            cursor.execute('SET search_path TO %s, public;', [schema_name])
            print(f'Successfully switched to schema: {schema_name}')
        except Exception as e:
            print(f'Error switching schema: {str(e)}')
            cursor.execute('SET search_path TO public;')
            raise AuthenticationFailed(f'Failed to switch to schema {schema_name}: {str(e)}')

def tenant_schema_required(view_func):
    """Decorator to ensure a view has a tenant schema set"""
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        schema = get_current_schema()
        if not schema:
            raise AuthenticationFailed('No tenant schema set for this request')
        return view_func(request, *args, **kwargs)
    return _wrapped_view

class CustomJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        """Authenticate the request and return a two-tuple of (user, token)."""
        # Get the token from the Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None  # Allow other authentication methods to try

        try:
            # Split 'Bearer <token>'
            parts = auth_header.split()
            if parts[0].lower() != 'bearer':
                raise AuthenticationFailed('Authorization header must start with Bearer')
            if len(parts) == 1:
                raise AuthenticationFailed('Token not found')
            elif len(parts) > 2:
                raise AuthenticationFailed('Authorization header must be Bearer <token>')

            token = parts[1]
            # Decode the JWT token
            payload = jwt.decode(token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=[settings.SIMPLE_JWT['ALGORITHM']])

            # Extract tenant_slug from the token payload
            tenant_slug = payload.get('tenant_slug')
            if not tenant_slug:
                raise AuthenticationFailed('Tenant slug not found in token')

            # Get user_id from token
            user_id = payload.get('user_id')
            tenant_id = payload.get('tenant_id')

            if not user_id:
                raise AuthenticationFailed('user_id not found in token')

            # Set schema for this request/thread
            self.switch_schema(tenant_slug)

            try:
                # Verify user exists in tenant schema
                with connection.cursor() as cursor:
                    try:
                        cursor.execute(
                            'SELECT EXISTS(SELECT 1 FROM "ecomm_tenant_admins_tenantuser" WHERE id = %s);',
                            [user_id]
                        )
                        user_exists = cursor.fetchone()[0]
                    except Exception as e:
                        if 'relation' in str(e) and 'does not exist' in str(e):
                            raise AuthenticationFailed(f'User table not found in schema {tenant_slug}')
                        raise
                    
                if not user_exists:
                    raise AuthenticationFailed(f'User {user_id} not found in tenant schema {tenant_slug}')
                    
                # Create tenant user
                user = SimpleTenantUser(user_id=user_id, tenant_slug=tenant_slug, tenant_id=tenant_id)
            except Exception as e:
                # Reset schema if anything goes wrong
                with connection.cursor() as cursor:
                    cursor.execute('SET search_path TO public;')
                raise
            
            return (user, token)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token is expired')
        except jwt.DecodeError:
            raise AuthenticationFailed('Token is invalid')
        except Exception as e:
            raise AuthenticationFailed(str(e))

    def switch_schema(self, tenant_slug):
        """
        Switch to the correct database schema for the current request/thread
        """
        try:
            schema_name = tenant_slug
            set_schema_for_request(schema_name)
            print(f"Schema switched to: {schema_name} for thread {id(current_thread())}")
        except Exception as e:
            raise AuthenticationFailed(f"Error switching schema: {str(e)}")
