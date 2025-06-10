from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed
from django.contrib.auth import get_user_model
import jwt
from django.conf import settings
import logging
from django.db import connection

from ecomm_tenant.ecomm_tenant_admins.models import TenantUser

logger = logging.getLogger(__name__)

# class TenantAdminJWTAuthentication(BaseAuthentication):
#     """
#     JWT Authentication for Tenant Users.
#     This switches the DB schema based on the tenant_slug from the token.
#     """

#     def authenticate(self, request):
#         auth_header = get_authorization_header(request).split()

#         if not auth_header or len(auth_header) != 2:
#             return None  # Let other authenticators try

#         try:
#             if auth_header[0].lower() != b'bearer':
#                 raise AuthenticationFailed('Authorization header must start with Bearer')

#             token = auth_header[1].decode('utf-8')

#             payload = jwt.decode(
#                 token,
#                 settings.SIMPLE_JWT['SIGNING_KEY'],
#                 algorithms=[settings.SIMPLE_JWT['ALGORITHM']],
#                 options={
#                     'verify_exp': True,
#                     'verify_aud': False,
#                     'verify_iss': False,
#                 }
#             )

#             # Extract required info from the token
#             tenant_slug = payload.get('tenant_slug')
#             user_id = payload.get('user_id')

#             if not tenant_slug or not user_id:
#                 raise AuthenticationFailed('tenant_slug or user_id missing from token')

#             # Set the schema to the tenant's schema
#             schema_name = tenant_slug.lower()

#             with connection.cursor() as cursor:
#                 cursor.execute(f"SET search_path TO {schema_name}, public;")

#                 try:
#                     user = TenantUser.objects.using('default').get(id=user_id)
#                 except TenantUser.DoesNotExist:
#                     raise AuthenticationFailed('Tenant user not found')

#                 if not user.is_active:
#                     raise AuthenticationFailed('Tenant user is disabled')

#                 return (user, token)

#         except jwt.ExpiredSignatureError:
#             raise AuthenticationFailed('Token has expired')
#         except jwt.InvalidTokenError as e:
#             logger.warning(f'Invalid token: {str(e)}')
#             raise AuthenticationFailed('Invalid token')
#         except Exception as e:
#             logger.error(f'Authentication error: {str(e)}', exc_info=True)
#             raise AuthenticationFailed('Authentication failed')

from django_tenants.utils import schema_context
class TenantAdminJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = get_authorization_header(request).split()

        if not auth_header or len(auth_header) != 2 or auth_header[0].lower() != b'bearer':
            return None
        try:
            token = auth_header[1].decode('utf-8')

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

            tenant_slug = payload.get('tenant_slug')
            user_id = payload.get('user_id')

            if not tenant_slug or not user_id:
                raise AuthenticationFailed('Missing tenant_slug or user_id')

            # Set schema context for ORM
            with schema_context(tenant_slug):
                try:
                    user = TenantUser.objects.get(id=user_id)
                except TenantUser.DoesNotExist:
                    raise AuthenticationFailed('Tenant user not found')

                if not user.is_active:
                    raise AuthenticationFailed('User is disabled')

                # user.email = user.email
                # user.first_name = user.first_name
                # user.client_id = user.client_id
                # user.get_full_name() = user.get_full_name()
                return (user, token)

        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed('Token expired')
        except jwt.InvalidTokenError:
            raise AuthenticationFailed('Invalid token')