"""
Views for tenant users and tenant admins.
"""
import logging
from django.db import connection
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from urllib.parse import urlparse, unquote
from django.db.models import Q
from ecomm_superadmin.models import Tenant as EcommSuperadminTenant, Application
from .models import TenantUser, UserRole, UserProfile, LoginConfig
from .serializers import LoginConfigSerializer
from subscription_plan.models import SubscriptionPlan, PlanFeatureEntitlement
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
import os

# Configure logging
logger = logging.getLogger(__name__)


class LoginConfigView(APIView):
    """
    API endpoint for managing tenant login page configuration.
    Allows tenant admins to customize their login page with a logo and brand name.
    """
    permission_classes = [AllowAny]

    def get_tenant(self, tenant_slug):
        """Get tenant from url_suffix"""
        try:
            return EcommSuperadminTenant.objects.get(url_suffix=tenant_slug)
        except EcommSuperadminTenant.DoesNotExist:
            return None

    def get_client_id(self, tenant_slug):
        """Get client_id from tenant slug"""
        tenant = self.get_tenant(tenant_slug)
        if tenant:
            return tenant.client_id
        return None

    def get(self, request, tenant_slug):
        """Get the current login configuration for the tenant"""
        try:
            # Ensure the LoginConfig table exists
            LoginConfig.create_table_if_not_exists()
            tenant = self.get_tenant(tenant_slug)
            if not tenant:
                return Response(
                    {"error": "Invalid tenant slug",
                     "message": f'The tenant "{tenant_slug}" does not exist',
                     "status_code": 404}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            client_id = tenant.client_id
            config = LoginConfig.objects.filter(client_id=client_id).first()
            if not config:
                return Response({}, status=status.HTTP_404_NOT_FOUND)

            serializer = LoginConfigSerializer(config)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Error retrieving login config: {str(e)}")
            return Response(
                {"error": "Failed to retrieve login configuration"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request, tenant_slug):
        """Create or update login configuration for the tenant"""
        try:
            logger.info(f"Received login config POST request for tenant: {tenant_slug}")
            logger.info(f"Request data: {request.data}")
            logger.info(f"Request FILES: {request.FILES}")
            
            # Ensure the LoginConfig table exists
            LoginConfig.create_table_if_not_exists()
            tenant = self.get_tenant(tenant_slug)
            if not tenant:
                return Response(
                    {"error": "Invalid tenant slug",
                     "message": f'The tenant "{tenant_slug}" does not exist',
                     "status_code": 404}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            client_id = tenant.client_id

            # Get existing config or create new one
            config = LoginConfig.objects.filter(client_id=client_id).first()
            
            # Make a mutable copy of request data
            data = request.data.copy()
            
            # Handle file upload
            if 'logo' in request.FILES and isinstance(request.FILES['logo'], UploadedFile):
                logo_file = request.FILES['logo']
                logger.info(f"Processing logo file: name={logo_file.name}, size={logo_file.size}, content_type={logo_file.content_type}")
                data['logo'] = logo_file

            # Set client_id and user info
            data['client_id'] = client_id
            data['updated_by'] = request.user.email if not request.user.is_anonymous else None
            if not config:
                data['created_by'] = request.user.email if not request.user.is_anonymous else None
            
            # Handle file upload
            if 'logo' in request.FILES:
                logo_file = request.FILES['logo']
                logger.info(f"Received logo file: name={logo_file.name}, size={logo_file.size}, content_type={logo_file.content_type}")
                data['logo'] = logo_file

            serializer = LoginConfigSerializer(config, data=data) if config else LoginConfigSerializer(data=data)
            
            if serializer.is_valid():
                # Delete old logo file if exists and new logo is uploaded
                if config and config.logo and 'logo' in request.FILES:
                    try:
                        default_storage.delete(config.logo.path)
                    except Exception as e:
                        logger.warning(f"Failed to delete old logo: {str(e)}")

                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            logger.error(f"Validation errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error saving login config: {str(e)}")
            logger.exception("Full traceback:")
            return Response(
                {
                    "error": "Failed to save login configuration",
                    "detail": str(e)
                }, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TenantUserCheckView(APIView):
    """
    API endpoint to check if a tenant user exists and has a role.
    
    This view checks if a user exists in the TenantUser table and if they have
    an entry in the UserRole table. It does not require the user to be a tenant admin.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        """
        Check if a tenant user exists and has a role.
        
        Request body:
        - email: string (required)
        
        Returns:
        - 200 OK: {"exists": true, "has_role": true} if the user exists and has a role
        - 200 OK: {"exists": true, "has_role": false} if the user exists but has no role
        - 200 OK: {"exists": false} if the user does not exist
        - 400 Bad Request: If email is not provided
        """
        # Get the email from the request data
        email = request.data.get('email')
        
        # Log the request for debugging
        logger.info(f"TenantUserCheckView - Checking user with email: {email}")
        
        # Check if email is provided
        if not email:
            logger.warning("TenantUserCheckView - No email provided")
            return Response(
                {"detail": "Email is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Log the current connection schema
        logger.info(f"TenantUserCheckView - Current connection schema: {connection.schema_name}")
        
        # Check if the user exists in the TenantUser table
        try:
            user = TenantUser.objects.get(email=email)
            logger.info(f"TenantUserCheckView - User found: {user.id}")
            
            # Check if the user has a role
            has_role = UserRole.objects.filter(user=user).exists()
            logger.info(f"TenantUserCheckView - User has role: {has_role}")
            
            return Response({
                "exists": True,
                "has_role": has_role,
                "user_id": user.id,
                "is_active": user.is_active,
                "is_staff": user.is_staff
            })
            
        except TenantUser.DoesNotExist:
            logger.info(f"TenantUserCheckView - User not found with email: {email}")
            return Response({"exists": False})
        except Exception as e:
            logger.error(f"TenantUserCheckView - Error checking user: {str(e)}", exc_info=True)
            return Response(
                {"detail": f"Error checking user: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class TenantUserLoginView(APIView):
    """
    API endpoint for tenant user login.
    
    This view authenticates a tenant user and checks if they have a role.
    It does not require the user to be a tenant admin.
    """
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request, *args, **kwargs):
        """
        Authenticate a tenant user.
        
        Request body:
        - email: string (required)
        - password: string (required)
        
        Returns:
        - 200 OK: {"token": "...", "user": {...}} if authentication succeeds
        - 400 Bad Request: If email or password is not provided
        - 401 Unauthorized: If authentication fails
        - 403 Forbidden: If user has no assigned role
        """
        # Get credentials from request data
        email = request.data.get('email')
        password = request.data.get('password')
        redirect_url = request.data.get('redirect_url', '')
        
        # Parse redirect URL to get tenant schema
        url_obj = urlparse(redirect_url)
        pathname = unquote(url_obj.path)
        tenant_schema = pathname.split('/')[1].lower() if len(pathname.split('/')) > 1 else ''
        default_url = f'{url_obj.scheme}://{url_obj.netloc}/'

        # Validate tenant schema exists
        try:
            tenant = EcommSuperadminTenant.objects.get(schema_name=tenant_schema)
        except EcommSuperadminTenant.DoesNotExist:
            return Response({
                'error': 'Tenant not found',
                'message': f'The requested tenant {tenant_schema} does not exist'
            }, status=404)

        # Get application details and validate
        try:
            application = Application.objects.get(app_default_url=default_url)
            app_endpoint_route = application.app_endpoint_route.lstrip("/")
            app_secret_key = application.app_secret_key
            app_id = application.app_id
            
            if not app_endpoint_route or not app_secret_key:
                return Response({
                    'error': 'Invalid application configuration',
                    'message': 'Application endpoint or secret key not configured'
                }, status=400)
                
        except Application.DoesNotExist:
            return Response({
                'error': 'Application not found',
                'message': 'Unable to find application for the given URL'
            }, status=404)
        
        # Log the request for debugging
        logger.info(f"TenantUserLoginView - Login attempt for user: {email} on tenant: {tenant_schema}")
        logger.info(f"TenantUserLoginView - Current connection schema: {connection.schema_name}")
        
        # Validate input
        if not email or not password:
            logger.warning("TenantUserLoginView - Missing email or password")
            return Response(
                {"detail": "Email and password are required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Manual authentication instead of using Django's authenticate
        try:
            # Find the user by email
            user = TenantUser.objects.get(email=email)
            
            # Check if the password is correct
            if not user.check_password(password):
                logger.warning(f"TenantUserLoginView - Invalid password for: {email}")
                return Response(
                    {"detail": "Invalid credentials"}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
            # Check if the user is active
            if not user.is_active:
                logger.warning(f"TenantUserLoginView - User is inactive: {email}")
                return Response(
                    {"detail": "This account is inactive."}, 
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except TenantUser.DoesNotExist:
            logger.warning(f"TenantUserLoginView - User not found: {email}")
            return Response(
                {"detail": "Invalid credentials"}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get user profile
        try:
            profile = UserProfile.objects.get(user=user)
        except UserProfile.DoesNotExist:
            logger.error(f"TenantUserLoginView - No profile found for user: {user.id}")
            return Response(
                {"detail": "User profile not found"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        # Get subscription plan and features for the tenant
        try:
            # Get subscription plan ID from tenant
            subscription_plan_id = request.tenant.subscription_plan_id
            
            if subscription_plan_id:
                # Get the subscription plan using the ID
                subscription_plan = SubscriptionPlan.objects.get(
                    id=subscription_plan_id,
                    status='active'
                )
                
                # Get all feature entitlements for this plan
                feature_entitlements = PlanFeatureEntitlement.objects.filter(
                    plan=subscription_plan
                ).select_related('feature')
                
                # Prepare plan and feature data
                plan_data = {
                    'id': subscription_plan.id,
                    'name': subscription_plan.name,
                    'description': subscription_plan.description,
                    'price': str(subscription_plan.price),  # Convert Decimal to string
                    'status': subscription_plan.status,
                    'valid_from': subscription_plan.valid_from,
                    'valid_until': subscription_plan.valid_until,
                    'max_users': subscription_plan.max_users,
                    'storage_limit': subscription_plan.storage_limit,
                    'support_level': subscription_plan.support_level,
                    'features': [
                    {
                        'id': fe.feature.id,
                        'name': fe.feature.name,
                        'key': fe.feature.key,
                        'description': fe.feature.description,
                        # 'granual_settings': fe.granual_settings.get('granual_settings', {}),
                        'subfeatures': fe.feature.get_subfeatures()  # This returns the list of subfeatures directly
                    }
                    for fe in feature_entitlements
                ]    
                }
            else:
                logger.warning(f"TenantUserLoginView - No subscription plan ID found for tenant: {request.tenant.schema_name}")
                plan_data = None
                
        except SubscriptionPlan.DoesNotExist:
            logger.warning(f"TenantUserLoginView - Subscription plan not found for tenant: {request.tenant.schema_name}")
            plan_data = None
        except Exception as e:
            logger.error(f"TenantUserLoginView - Error fetching subscription plan: {str(e)}")
            plan_data = None
        except SubscriptionPlan.DoesNotExist:
            plan_data = None
        except Exception as e:
            logger.error(f"Error fetching subscription plan: {str(e)}")
            plan_data = None

        # Generate JWT token
        refresh = RefreshToken.for_user(user)
        
        # Add custom claims to the token
        refresh['email'] = user.email
        refresh['user_id'] = user.id
        refresh['is_staff'] = user.is_staff
        refresh['is_tenant_admin'] = profile.is_tenant_admin
        # refresh['tenant_slug'] = request.tenant_slug

        
        # Add tenant information
        if hasattr(request, 'tenant'):
            refresh['tenant_id'] = request.tenant.id
            refresh['tenant_schema'] = request.tenant.schema_name
            refresh['tenant_slug'] = request.tenant_slug
        
        # Add subscription plan information to token
        if plan_data:
            refresh['subscription_plan'] = {
                'id': plan_data['id'],
                'name': plan_data['name'],
                'status': plan_data['status'],
                'valid_until': str(plan_data['valid_until']) if plan_data['valid_until'] else None,
                'features': [
                    {
                        'id': f['id'],
                        'key': f['key'],
                        'name': f['name']
                    }
                    for f in plan_data['features']
                ]
            }
        
        # Update last login
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        # Log successful login
        logger.info(f"TenantUserLoginView - Login successful for user: {user.id}")

        final_redirect_url = f'{default_url}{app_endpoint_route}?token={str(refresh.access_token)}&tenant_slug={request.tenant_slug}&app_id={app_id}'
        
        # Return token and user data along with application details
        return Response({
            "token": {
                "access": str(refresh.access_token),
                "refresh": str(refresh)
            },
            "user": {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "tenant_slug": request.tenant_slug,
                "app_id": app_id,
                "is_staff": user.is_staff,
                "is_tenant_admin": profile.is_tenant_admin,
                # "has_role": has_role,
                'redirect_app_url': final_redirect_url,
                'subscription_plan': plan_data
            },
           
        })
