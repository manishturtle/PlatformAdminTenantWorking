"""
Views for ecomm_superadmin app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from django.contrib.auth import authenticate, login, get_user_model
from django.db import connection
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
import uuid
from subscription_plan.models import SubscriptionPlan
from .models import TenantSubscriptionLicenses
from django.utils import timezone

logger = logging.getLogger(__name__)

from .models import Tenant, User, CrmClient, Application
from .serializers import TenantSerializer, LoginSerializer, UserSerializer, UserAdminSerializer, CrmClientSerializer, ApplicationSerializer

# @method_decorator(csrf_exempt, name='dispatch')
# class PlatformAdminTenantView(APIView):
#     """
#     API endpoint that allows platform admins to manage tenants.
#     Uses direct database access to avoid model field mapping issues.
#     """
#     permission_classes = [IsAuthenticated, IsAdminUser]
    
#     def get(self, request, format=None):
#         """
#         List all tenants directly from the database.
#         """
#         try:
#             with connection.cursor() as cursor:
#                 cursor.execute("""
#                     SELECT 
#                         id, schema_name, name, url_suffix, created_at, updated_at,
#                         status, environment, trial_end_date, paid_until,
#                         subscription_plan_id, client_id
#                     FROM ecomm_superadmin_tenants
#                     ORDER BY created_at DESC
#                 """)
                
#                 # Get column names
#                 columns = [col[0] for col in cursor.description]
                
#                 # Fetch all rows
#                 rows = cursor.fetchall()
                
#                 # Convert rows to dictionaries
#                 tenants = []
#                 for row in rows:
#                     tenant_dict = dict(zip(columns, row))
                    
#                     # Convert datetime objects to strings for JSON serialization
#                     if 'created_at' in tenant_dict and tenant_dict['created_at']:
#                         tenant_dict['created_at'] = tenant_dict['created_at'].isoformat()
#                     if 'updated_at' in tenant_dict and tenant_dict['updated_at']:
#                         tenant_dict['updated_at'] = tenant_dict['updated_at'].isoformat()
#                     if 'trial_end_date' in tenant_dict and tenant_dict['trial_end_date']:
#                         tenant_dict['trial_end_date'] = tenant_dict['trial_end_date'].isoformat()
#                     if 'paid_until' in tenant_dict and tenant_dict['paid_until']:
#                         tenant_dict['paid_until'] = tenant_dict['paid_until'].isoformat()
                    
#                     # Add subscription plan details if available
#                     if tenant_dict.get('subscription_plan_id'):
#                         cursor.execute("""
#                             SELECT id, name, description, price, max_users, storage_limit
#                             FROM subscription_plans
#                             WHERE id = %s
#                         """, [tenant_dict['subscription_plan_id']])
#                         plan_columns = [col[0] for col in cursor.description]
#                         plan_row = cursor.fetchone()
#                         if plan_row:
#                             tenant_dict['subscription_plan'] = dict(zip(plan_columns, plan_row))
                    
#                     # Add client details if available
#                     if tenant_dict.get('client_id'):
#                         cursor.execute("""
#                             SELECT id, client_name, contact_person_email
#                             FROM ecomm_superadmin_crmclients
#                             WHERE id = %s
#                         """, [tenant_dict['client_id']])
#                         client_columns = [col[0] for col in cursor.description]
#                         client_row = cursor.fetchone()
#                         if client_row:
#                             tenant_dict['client'] = dict(zip(client_columns, client_row))
                    
#                     # Add assigned applications
#                     cursor.execute("""
#                         SELECT a.app_id, a.application_name, a.is_active
#                         FROM ecomm_superadmin_tenantapplication ta
#                         JOIN application a ON ta.application_id = a.app_id
#                         WHERE ta.tenant_id = %s AND ta.is_active = true
#                     """, [tenant_dict['id']])
#                     app_columns = [col[0] for col in cursor.description]
#                     app_rows = cursor.fetchall()
#                     tenant_dict['assigned_applications'] = [
#                         dict(zip(app_columns, row)) for row in app_rows
#                     ]
                    
#                     tenants.append(tenant_dict)
                
#                 return Response(tenants)
#         except Exception as e:
#             import traceback
#             traceback.print_exc()
#             return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
#     def post(self, request, format=None):
#         """
#         Create a new tenant using the TenantSerializer.
#         """
#         serializer = TenantSerializer(data=request.data)
#         if serializer.is_valid():
#             try:
#                 tenant = serializer.save()
#                 return Response(serializer.data, status=status.HTTP_201_CREATED)
#             except Exception as e:
#                 import traceback
#                 traceback.print_exc()
#                 return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
#         return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

#     def delete(self, request, tenant_id, format=None):
#         """
#         Delete a tenant by ID.
#         This will follow the specific deletion flow:
#         1. Delete entry from ecomm_superadmin_domain
#         2. Delete entry from ecomm_superadmin_tenants
#         3. Drop the schema with CASCADE
#         """
#         try:
#             import traceback
            
#             # Use a transaction to ensure atomicity
#             with transaction.atomic():
#                 # First, check if the tenant exists using raw SQL
#                 with connection.cursor() as cursor:
#                     cursor.execute("""
#                         SELECT id, schema_name FROM tenants WHERE id = %s
#                     """, [tenant_id])
                    
#                     result = cursor.fetchone()
#                     if not result:
#                         return Response(
#                             {"error": f"Tenant with ID {tenant_id} not found"}, 
#                             status=status.HTTP_404_NOT_FOUND
#                         )
                    
#                     tenant_id, schema_name = result
                    
#                     # 1. First delete entries from ecomm_superadmin_domain
#                     try:
#                         cursor.execute("""
#                             DELETE FROM domains 
#                             WHERE tenant_id = %s
#                         """, [tenant_id])
#                         print(f"Deleted domain entries for tenant ID {tenant_id}")
#                     except Exception as domain_e:
#                         print(f"Error deleting from domain table: {str(domain_e)}")
#                         traceback.print_exc()
                    
#                     # 2. Then delete the tenant record from ecomm_superadmin_tenants
#                     cursor.execute("DELETE FROM tenants WHERE id = %s", [tenant_id])
#                     print(f"Deleted tenant with ID {tenant_id}")
                    
#                     # 3. Finally drop the schema
#                     try:
#                         cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
#                         print(f"Dropped schema {schema_name}")
#                     except Exception as schema_e:
#                         print(f"Error dropping schema: {str(schema_e)}")
#                         traceback.print_exc()
            
#             return Response(status=status.HTTP_204_NO_CONTENT)
#         except Exception as e:
#             import traceback
#             traceback.print_exc()
#             return Response(
#                 {"error": f"Error deleting tenant: {str(e)}"}, 
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )


@method_decorator(csrf_exempt, name='dispatch')
class PlatformAdminTenantView(APIView):
    """
    API endpoint that allows platform admins to manage tenants.
    Uses direct database access to avoid model field mapping issues.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    def get(self, request, format=None):
        """
        List all tenants directly from the database.
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        id, schema_name, name, url_suffix, created_at, updated_at,
                        status, environment, trial_end_date, paid_until,
                        subscription_plan_id, client_id
                    FROM ecomm_superadmin_tenants
                    ORDER BY created_at DESC
                """)
                
                # Get column names
                columns = [col[0] for col in cursor.description]
                
                # Fetch all rows
                rows = cursor.fetchall()
                
                # Convert rows to dictionaries
                tenants = []
                for row in rows:
                    tenant_dict = dict(zip(columns, row))
                    
                    # Convert datetime objects to strings for JSON serialization
                    if 'created_at' in tenant_dict and tenant_dict['created_at']:
                        tenant_dict['created_at'] = tenant_dict['created_at'].isoformat()
                    if 'updated_at' in tenant_dict and tenant_dict['updated_at']:
                        tenant_dict['updated_at'] = tenant_dict['updated_at'].isoformat()
                    if 'trial_end_date' in tenant_dict and tenant_dict['trial_end_date']:
                        tenant_dict['trial_end_date'] = tenant_dict['trial_end_date'].isoformat()
                    if 'paid_until' in tenant_dict and tenant_dict['paid_until']:
                        tenant_dict['paid_until'] = tenant_dict['paid_until'].isoformat()
                    
                    # Add subscription plan details if available
                    if tenant_dict.get('subscription_plan_id'):
                        cursor.execute("""
                            SELECT id, name, description, price, max_users, storage_limit
                            FROM subscription_plans
                            WHERE id = %s
                        """, [tenant_dict['subscription_plan_id']])
                        plan_columns = [col[0] for col in cursor.description]
                        plan_row = cursor.fetchone()
                        if plan_row:
                            tenant_dict['subscription_plan'] = dict(zip(plan_columns, plan_row))
                    
                    # Add client details if available
                    if tenant_dict.get('client_id'):
                        cursor.execute("""
                            SELECT id, client_name, contact_person_email
                            FROM ecomm_superadmin_crmclients
                            WHERE id = %s
                        """, [tenant_dict['client_id']])
                        client_columns = [col[0] for col in cursor.description]
                        client_row = cursor.fetchone()
                        if client_row:
                            tenant_dict['client'] = dict(zip(client_columns, client_row))
                    
                    # Add assigned applications
                    cursor.execute("""
                        SELECT a.app_id, a.application_name, a.is_active
                        FROM ecomm_superadmin_tenantapplication ta
                        JOIN application a ON ta.application_id = a.app_id
                        WHERE ta.tenant_id = %s AND ta.is_active = true
                    """, [tenant_dict['id']])
                    app_columns = [col[0] for col in cursor.description]
                    app_rows = cursor.fetchall()
                    tenant_dict['assigned_applications'] = [
                        dict(zip(app_columns, row)) for row in app_rows
                    ]
                    
                    tenants.append(tenant_dict)
                
                return Response(tenants)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def create_tenant_subscription(self, tenant, subscription_plan, client_id=None, company_id=None, created_by=None):
        """Create a new tenant subscription with license key"""
        subscription = TenantSubscriptionLicenses.objects.create(
            tenant=tenant,
            subscription_plan=subscription_plan,
            valid_from=timezone.now(),
            client_id=client_id,
            company_id=company_id,
            created_by=created_by
        )
        return subscription

    def post(self, request, format=None):
        """
        Create a new tenant using the TenantSerializer and assign subscription plan.
        """
        serializer = TenantSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Get subscription plan first
                subscription_plan_id = request.data.get('subscription_plan')
                if not subscription_plan_id:
                    return Response(
                        {"error": "subscription_plan_id is required"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                try:
                    subscription_plan = SubscriptionPlan.objects.get(id=subscription_plan_id)
                except SubscriptionPlan.DoesNotExist:
                    return Response(
                        {"error": f"Subscription plan with id {subscription_plan_id} not found"}, 
                        status=status.HTTP_404_NOT_FOUND
                    )

             
                tenant = serializer.save(subscription_plan=subscription_plan)
                    
                # Second transaction: Create subscription
              
                subscription = self.create_tenant_subscription(
                    tenant=tenant,
                    subscription_plan=subscription_plan,
                    client_id=request.data.get('client_id'),
                    company_id=request.data.get('company_id'),
                    created_by=request.user.username if request.user.is_authenticated else None
                )

                # Prepare response data
                response_data = {
                    'tenant': serializer.data,
                    'subscription': {
                        'id': subscription.id,
                        'license_key': subscription.license_key,
                        'status': subscription.license_status,
                        'valid_from': subscription.valid_from,
                        'subscription_plan': {
                            'id': subscription_plan.id,
                            'name': subscription_plan.name,
                            'description': subscription_plan.description
                        }
                    }
                }

                return Response(response_data, status=status.HTTP_201_CREATED)

            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    def delete(self, request, tenant_id, format=None):
        """
        Delete a tenant by ID.
        This will follow the specific deletion flow:
        1. Delete entry from ecomm_superadmin_domain
        2. Delete entry from ecomm_superadmin_tenants
        3. Drop the schema with CASCADE
        """
        try:
            import traceback
            
            # Use a transaction to ensure atomicity
            with transaction.atomic():
                # First, check if the tenant exists using raw SQL
                with connection.cursor() as cursor:
                    cursor.execute("""
                        SELECT id, schema_name FROM tenants WHERE id = %s
                    """, [tenant_id])
                    
                    result = cursor.fetchone()
                    if not result:
                        return Response(
                            {"error": f"Tenant with ID {tenant_id} not found"}, 
                            status=status.HTTP_404_NOT_FOUND
                        )
                    
                    tenant_id, schema_name = result
                    
                    # 1. First delete entries from ecomm_superadmin_domain
                    try:
                        cursor.execute("""
                            DELETE FROM domains 
                            WHERE tenant_id = %s
                        """, [tenant_id])
                        print(f"Deleted domain entries for tenant ID {tenant_id}")
                    except Exception as domain_e:
                        print(f"Error deleting from domain table: {str(domain_e)}")
                        traceback.print_exc()
                    
                    # 2. Then delete the tenant record from ecomm_superadmin_tenants
                    cursor.execute("DELETE FROM tenants WHERE id = %s", [tenant_id])
                    print(f"Deleted tenant with ID {tenant_id}")
                    
                    # 3. Finally drop the schema
                    try:
                        cursor.execute(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE')
                        print(f"Dropped schema {schema_name}")
                    except Exception as schema_e:
                        print(f"Error dropping schema: {str(schema_e)}")
                        traceback.print_exc()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"error": f"Error deleting tenant: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class PlatformAdminLoginView(APIView):
    """
    API endpoint for platform admin login.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Handle POST requests for login.
        """
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data.get('email')
            password = serializer.validated_data.get('password')
            
            # Authenticate directly with email as the USERNAME_FIELD
            user = authenticate(email=email, password=password)
            
            if user is not None and user.is_staff:
                login(request, user)
                
                # Create a simplified serializer for platform admin login
                # that doesn't rely on tenant-specific models
                user_data = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_staff': user.is_staff,
                    'is_superuser': user.is_superuser,
                    'is_active': user.is_active,
                    'date_joined': user.date_joined,
                    'profile': {
                        'is_company_admin': False,
                        'is_tenant_admin': False,
                        'is_email_verified': True,
                        'is_2fa_enabled': False,
                        'needs_2fa_setup': False
                    },
                    'roles': [{'role': {'name': 'Platform Admin'}}]
                }
                
                # Generate JWT token
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    'user': user_data,
                    'token': str(refresh.access_token),
                    'refresh': str(refresh),
                    'message': 'Login successful'
                })
            
            return Response({
                'error': 'Invalid credentials or insufficient permissions'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@method_decorator(csrf_exempt, name='dispatch')
class PlatformAdminCheckUserExistsView(APIView):
    """
    API endpoint to check if a user exists.
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Check if a user exists by username or email.
        """
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'Email is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user_exists = False
        is_staff = False
        
        user_exists = User.objects.filter(email=email).exists()
        if user_exists:
            user = User.objects.get(email=email)
            is_staff = user.is_staff
        
        return Response({
            'user_exists': user_exists,
            'exists': user_exists,
            'is_staff': is_staff
        })

@method_decorator(csrf_exempt, name='dispatch')
class PlatformAdminViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows platform admins to manage users.
    
    Provides CRUD operations for User objects with appropriate permissions
    and validation for user management.
    """
    queryset = get_user_model().objects.all().order_by('-date_joined')
    serializer_class = UserAdminSerializer
    
    def get_permissions(self):
        """
        Ensure only staff users can access this viewset.
        """
        return [IsAuthenticated(), IsAdminUser()]
    
    def list(self, request, *args, **kwargs):
        """
        List all users with additional information.
        """
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        
        return Response({
            'status': 'success',
            'count': len(serializer.data),
            'data': serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        """
        Create a new user with validation.
        """
        with transaction.atomic():
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            
            return Response({
                'status': 'success',
                'message': 'User created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED, headers=headers)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Get a single user by ID.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        return Response({
            'status': 'success',
            'data': serializer.data
        })
    
    def update(self, request, *args, **kwargs):
        """
        Update a user with validation.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'status': 'success',
            'message': 'User updated successfully',
            'data': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a user with confirmation.
        """
        instance = self.get_object()
        self.perform_destroy(instance)
        
        return Response({
            'status': 'success',
            'message': 'User deleted successfully'
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class CrmClientViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows CRM clients to be viewed or edited.
    Only platform admin users have access to this endpoint.
    """
    queryset = CrmClient.objects.all()
    serializer_class = CrmClientSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    
    @action(detail=True, methods=['get'])
    def tenants(self, request, pk=None):
        """
        Return a list of all tenants associated with this client.
        """
        client = self.get_object()
        tenants = client.tenants.all()
        serializer = TenantSerializer(tenants, many=True)
        return Response(serializer.data)

@method_decorator(csrf_exempt, name='dispatch')
class TenantApplicationsByUrlView(APIView):
    """
    API endpoint to get applications for a specific tenant using their URL suffix.
    """
    def get(self, request, url_suffix):
        """Get applications for a tenant by their URL suffix."""
        try:
            # Reset the database connection first
            connection.close()
            
            with connection.cursor() as cursor:
                # First get the tenant and their subscription plan ID
                cursor.execute("""
                    SELECT id, subscription_plan_id
                    FROM ecomm_superadmin_tenants
                    WHERE url_suffix = %s
                """, [url_suffix])
                
                tenant_row = cursor.fetchone()
                if not tenant_row:
                    return Response(
                        {"error": "Tenant not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                tenant_id, subscription_plan_id = tenant_row
                print('i am getting here', subscription_plan_id)
                if not subscription_plan_id:
                    return Response(
                        {"error": "Tenant has no subscription plan"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Get all feature IDs from plan_feature_entitlements for this plan
                # Get all feature IDs from plan_feature_entitlements for this plan
                # Debug: Print schema info
                cursor.execute("SELECT current_schema()")
                current_schema = cursor.fetchone()[0]
                logger.info(f"Current schema: {current_schema}")
                
                # Debug: Check if the table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'features'
                    )
                """)
                table_exists = cursor.fetchone()[0]
                logger.info(f"Features table exists: {table_exists}")
                
                # Debug: Check table structure
                if table_exists:
                    cursor.execute("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'features'
                    """)
                    columns = [row[0] for row in cursor.fetchall()]
                    logger.info(f"Features table columns: {columns}")
                
                # Main query with explicit schema
                cursor.execute("""
                    SELECT DISTINCT f.app_id
                    FROM public.plan_feature_entitlements pfe
                    JOIN public.features f ON pfe.feature_id = f.id
                    WHERE pfe.plan_id = %s
                """, [subscription_plan_id])
                
                app_ids = [row[0] for row in cursor.fetchall()]
                
                if not app_ids:
                    return Response([])  # Return empty list if no apps found
                
                # Get the applications based on the app_ids
                placeholders = ','.join(['%s'] * len(app_ids))
                cursor.execute(f"""
                    SELECT DISTINCT a.app_id, a.application_name, a.app_default_url, 
                           a.description, a.is_active, a.created_at
                    FROM application a
                    WHERE a.app_id IN ({placeholders})
                    AND a.is_active = true
                """, app_ids)
                
                # Get column names
                columns = [col[0] for col in cursor.description]
                
                # Fetch all rows
                rows = cursor.fetchall()
                
                # Convert rows to list of dictionaries
                applications = [dict(zip(columns, row)) for row in rows]
                
                return Response(applications)
                
        except Exception as e:
            # Log more detailed error information
            logger.error(f"Error in TenantApplicationsByUrlView: {str(e)}", exc_info=True)
            
            # Try to close the connection if it's still open
            try:
                connection.close()
            except:
                pass
            
            return Response(
                {"error": str(e),
                 "detail": "An unexpected error occurred. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class TenantSubscriptionDetailsView(APIView):
    """
    API endpoint to get subscription details for a specific tenant.
    """
    def get(self, request, tenant_slug):
        """
        Get subscription details for a tenant by their URL suffix.
        
        Returns:
            - Tenant's subscription plan details including:
              - Plan name and ID
              - Plan features and their settings
              - Usage statistics (if available)
              - Subscription status and dates
        """
        try:
            with connection.cursor() as cursor:
                # Get tenant and subscription plan details
                cursor.execute("""
                    SELECT 
                        t.id as tenant_id,
                        t.name as tenant_name,
                        t.subscription_plan_id,
                        t.status as tenant_status,
                        t.trial_end_date,
                        t.paid_until,
                        sp.id as plan_id,
                        sp.name as plan_name,
                        sp.description,
                        sp.status as plan_status,
                        sp.price,
                        sp.max_users,
                        sp.transaction_limit,
                        sp.api_call_limit,
                        sp.storage_limit,
                        sp.session_type,
                        sp.support_level,
                        sp.valid_from,
                        sp.valid_until,
                        sp.granular_settings
                    FROM public.ecomm_superadmin_tenants t
                    LEFT JOIN public.subscription_plans sp ON t.subscription_plan_id = sp.id
                    WHERE t.url_suffix = %s
                """, [tenant_slug])
                
                tenant_data = cursor.fetchone()
                if not tenant_data:
                    return Response(
                        {"error": "Tenant not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                columns = [col[0] for col in cursor.description]
                tenant_dict = dict(zip(columns, tenant_data))
                
                # Get plan features and their settings
                if tenant_dict['subscription_plan_id']:
                    cursor.execute("""
                        SELECT 
                            f.id as feature_id,
                            f.name as feature_name,
                            f.description as feature_description,
                            f.granual_settings as feature_settings
                        FROM public.plan_feature_entitlements pfe
                        JOIN public.features f ON pfe.feature_id = f.id
                        WHERE pfe.plan_id = %s
                    """, [tenant_dict['subscription_plan_id']])
                    
                    features = []
                    for row in cursor.fetchall():
                        feature_columns = [col[0] for col in cursor.description]
                        feature_dict = dict(zip(feature_columns, row))
                        features.append(feature_dict)
                    
                    tenant_dict['features'] = features
                
                return Response(tenant_dict)
                
        except Exception as e:
            logger.error(f"Error in TenantSubscriptionDetailsView: {str(e)}", exc_info=True)
            return Response(
                {"error": str(e),
                 "detail": "An unexpected error occurred while fetching subscription details."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class ApplicationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and managing applications.
    """
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]
    queryset = Application.objects.all()

    def get_queryset(self):
        """
        Get the list of applications.
        Optionally filter by client_id and company_id if provided in query params.
        """
        queryset = Application.objects.all()
        
        # Filter by client_id if provided
        client_id = self.request.query_params.get('client_id', None)
        if client_id is not None:
            queryset = queryset.filter(client_id=client_id)
        
        # Filter by company_id if provided
        company_id = self.request.query_params.get('company_id', None)
        if company_id is not None:
            queryset = queryset.filter(company_id=company_id)
        
        return queryset.order_by('application_name')

    def create(self, request, *args, **kwargs):
        """
        Create a new application with all fields.
        """
        data = request.data.copy()
        data.setdefault('is_active', True)
        data.setdefault('client_id', 1)
        data.setdefault('company_id', 1)
        data['created_by'] = request.user.email
        data['updated_by'] = request.user.email

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

    def update(self, request, *args, **kwargs):
        """
        Update an application.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.copy()
        data['updated_by'] = request.user.email

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response(serializer.data)
