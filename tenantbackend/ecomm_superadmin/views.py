#view
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
from .models import TenantSubscriptionLicenses, LineOfBusiness
from django.utils import timezone
from datetime import timedelta
from rest_framework.generics import RetrieveAPIView
from rest_framework.exceptions import NotFound
logger = logging.getLogger(__name__)
from services.email_service import send_email


from .models import Tenant, User, CrmClient, Application
from .serializers import TenantSerializer, LoginSerializer, UserSerializer, UserAdminSerializer, CrmClientSerializer, ApplicationSerializer, LineOfBusinessSerializer

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

    # def post(self, request, format=None):
    #     """
    #     Create a new tenant with proper transaction handling and rollback.
    #     """
    #     from django.db import transaction
    #     from .models import Tenant, Domain
    #     from .signals import create_tenant_schema
    #     import traceback

    #     try:
    #         # Start transaction
    #         with transaction.atomic():
    #             # Validate required fields
    #             required_fields = ['name', 'schema_name']
    #             for field in required_fields:
    #                 if field not in request.data:
    #                     return Response(
    #                         {"error": f"Missing required field: {field}"},
    #                         status=status.HTTP_400_BAD_REQUEST
    #                     )

    #             # Create tenant instance
    #             tenant = Tenant(
    #                 name=request.data['name'],
    #                 schema_name=request.data['schema_name'],
    #                 created_by=request.user,
    #                 # Add other fields from request.data as needed
    #             )

    #             try:
    #                 # Save tenant - this will trigger the signal
    #                 tenant.save()
    #             except Exception as e:
    #                 # Log the specific error
    #                 logger.error(f"Error creating tenant: {str(e)}\n{traceback.format_exc()}")
    #                 raise Exception(f"Failed to create tenant: {str(e)}")

    #             # Return success response
    #             return Response(
    #                 {
    #                     "message": "Tenant created successfully",
    #                     "tenant_id": tenant.id,
    #                     "schema_name": tenant.schema_name
    #                 },
    #                 status=status.HTTP_201_CREATED
    #             )

    #     except Exception as e:
    #         # Transaction will automatically rollback
    #         error_msg = str(e)
    #         stack_trace = traceback.format_exc()
    #         logger.error(f"Error in tenant creation: {error_msg}\n{stack_trace}")

    #         # Return error response with appropriate status
    #         if "already exists" in error_msg.lower():
    #             return Response(
    #                 {"error": "A tenant with this name or schema already exists"},
    #                 status=status.HTTP_409_CONFLICT
    #             )
    #         elif "migration" in error_msg.lower():
    #             return Response(
    #                 {"error": f"Migration error: {error_msg}"},
    #                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
    #             )
    #         else:
    #             return Response(
    #                 {"error": f"Failed to create tenant: {error_msg}"},
    #                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
    #             )
    

    def get(self, request, format=None):
        """
        List all tenants directly from the database.
        """
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        t.id, t.schema_name, t.name, t.url_suffix, t.created_at, t.updated_at,
                        t.status, t.environment, t.default_url, t.paid_until, t.client_id,
                        ARRAY_AGG(DISTINCT jsonb_build_object(
                            'license_key', tsl.license_key,
                            'subscription_plan_id', tsl.subscription_plan_id,
                            'valid_from', tsl.valid_from,
                            'valid_until', tsl.valid_until,
                            'features_snapshot', tsl.features_snapshot
                        )) as subscriptions
                    FROM ecomm_superadmin_tenants t
                    LEFT JOIN ecomm_superadmin_tenant_subscriptions_licenses tsl ON t.id = tsl.tenant_id
                    GROUP BY t.id, t.schema_name, t.name, t.url_suffix, t.created_at, t.updated_at,
                             t.status, t.environment, t.default_url, t.paid_until, t.client_id
                    ORDER BY t.created_at DESC
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
                    
                    if 'paid_until' in tenant_dict and tenant_dict['paid_until']:
                        tenant_dict['paid_until'] = tenant_dict['paid_until'].isoformat()
                    
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
    
    def create_default_roles_from_subscription(self, tenant, subscription):
        """Create default roles based on subscription features"""
        try:
            with connection.cursor() as cursor:
                # Get features from subscription snapshot
                features = subscription.features_snapshot.get('features', [])
                
                # Group features by app_id
                app_features = {}
                for feature in features:
                    app_id = feature.get('app_id')
                    if app_id:
                        if app_id not in app_features:
                            app_features[app_id] = []
                        app_features[app_id].append(feature)
                
                # Create SuperRole for each app
                for app_id, features in app_features.items():
                    # Create role
                    cursor.execute(f"""
                        INSERT INTO \"{tenant.schema_name}\".role_controles_role 
                        (name, description, is_active, app_id, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, NOW(), NOW())
                        RETURNING id
                    """, [
                        'SuperRole',
                        'Default super role with all access',
                        True,
                        app_id
                    ])
                    role_id = cursor.fetchone()[0]
                    
                    # Create permission sets for each feature
                    for feature in features:
                        cursor.execute(f"""
                            INSERT INTO \"{tenant.schema_name}\".role_controles_modulepermissionset
                            (module_id, can_create, can_read, can_update, can_delete, 
                             field_permissions, app_id, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            RETURNING id
                        """, [
                            feature.get('id'),
                            True,  # can_create
                            True,  # can_read
                            True,  # can_update
                            True,  # can_delete
                            '{}',  # field_permissions
                            app_id
                        ])
                        permission_set_id = cursor.fetchone()[0]
                        
                        # Assign permission set to role
                        cursor.execute(f"""
                            INSERT INTO \"{tenant.schema_name}\".role_controles_role_assigned_permissions
                            (role_id, modulepermissionset_id)
                            VALUES (%s, %s)
                        """, [role_id, permission_set_id])
                    
                    # Assign role to tenant admin user
                    cursor.execute(f"""
                        SELECT id FROM \"{tenant.schema_name}\".ecomm_tenant_admins_tenantuser
                        WHERE is_staff = true
                        LIMIT 1
                    """)
                    admin_user = cursor.fetchone()
                    
                    if admin_user:
                        cursor.execute(f"""
                            INSERT INTO \"{tenant.schema_name}\".role_controles_userroleassignment
                            (assigned_on, role_id, \"user\", app_id, created_at, updated_at)
                            VALUES (NOW(), %s, %s, %s, NOW(), NOW())
                        """, [role_id, admin_user[0], app_id])
        
        except Exception as e:
            logger.error(f"Error creating default roles: {str(e)}")
            raise
    
    def create_tenant_subscription(self, tenant, subscription_plan, client_id=None, company_id=None, created_by=None, start_date=None):
        """Create a new tenant subscription with license key and feature snapshots"""
        import uuid
        from django.utils import timezone
        from datetime import timedelta
        import json
        from subscription_plan.models import PlanFeatureEntitlement

        if start_date is None:
            start_date = timezone.now()
        
        # Calculate end date based on billing cycle
        if subscription_plan.billing_cycle == 'monthly':
            end_date = start_date + timedelta(days=30)
        elif subscription_plan.billing_cycle == 'quarterly':
            end_date = start_date + timedelta(days=90)
        elif subscription_plan.billing_cycle == 'annually':
            end_date = start_date + timedelta(days=365)
        elif subscription_plan.billing_cycle == 'weekly':
            end_date = start_date + timedelta(weeks=1)
        elif subscription_plan.billing_cycle == 'one_time':
            end_date = start_date + timedelta(days=365*10)  # 10 years
        else:
            end_date = start_date + timedelta(days=30)  # Default to monthly

        # Generate UUID for license key
        license_key = str(uuid.uuid4())

        # Get plan features and create snapshot
        plan_features = PlanFeatureEntitlement.objects.filter(plan=subscription_plan).select_related('feature')
        
        features_snapshot = {
            'features': [
                {
                    'id': pf.feature.id,
                    'name': pf.feature.name,
                    'app_id': pf.feature.app_id,
                    'description': pf.feature.description,
                    'settings': pf.granual_settings
                } for pf in plan_features
            ]
        }

        # Create subscription plan snapshot (excluding granular settings)
        subscription_plan_snapshot = {
            'id': subscription_plan.id,
            'name': subscription_plan.name,
            'description': subscription_plan.description,
            'billing_cycle': subscription_plan.billing_cycle,
            'price': str(subscription_plan.price),
            'line_of_business': subscription_plan.line_of_business.name if subscription_plan.line_of_business else None
        }

        from .models import TenantSubscriptionLicenses
        
        from .models import TenantSubscriptionLicenses

        subscription = TenantSubscriptionLicenses.objects.create(
            tenant=tenant,
            subscription_plan=subscription_plan,
            license_key=license_key,
            valid_from=start_date,
            valid_until=end_date,
            client_id=client_id,
            company_id=company_id,
            billing_cycle=subscription_plan.billing_cycle,
            created_by=created_by,
            features_snapshot=features_snapshot,
            subscription_plan_snapshot=subscription_plan_snapshot,
            license_status='active'
        )
        return subscription

    def post(self, request, format=None):
        """Create a new tenant and optionally assign subscription plan."""
        from django.db import transaction
        
        serializer = TenantSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Start transaction for tenant creation
            # with transaction.atomic():
            # Create tenant first
            tenant = serializer.save(
                created_by=request.user.username if request.user.is_authenticated else None
            )

            # Initialize response data
            response_data = {'tenant': serializer.data}

            print("respnse_data123:", response_data)

            # Handle subscription plans if provided
            subscription_plan_ids = request.data.get('subscription_plan', [])
            if not isinstance(subscription_plan_ids, list):
                subscription_plan_ids = [subscription_plan_ids]
            
            subscriptions = []
            subscription_data = []
            
            if subscription_plan_ids:
                for plan_id in subscription_plan_ids:
                    try:
                        subscription_plan = SubscriptionPlan.objects.get(id=plan_id)
                        
                        # Create subscription with license
                        subscription = self.create_tenant_subscription(
                            tenant=tenant,
                            subscription_plan=subscription_plan,
                            client_id=request.data.get('client_id'),
                            company_id=request.data.get('company_id'),
                            created_by=request.user.username if request.user.is_authenticated else None
                        )
                        
                        subscriptions.append(subscription)
                        
                        # Create default roles based on subscription features
                        self.create_default_roles_from_subscription(tenant, subscription)
                        
                        # Add subscription data to response
                        subscription_data.append({
                            'id': subscription.id,
                            'license_key': subscription.license_key,
                            'status': subscription.license_status,
                            'valid_from': subscription.valid_from,
                            'valid_until': subscription.valid_until,
                            'subscription_plan': {
                                'id': subscription_plan.id,
                                'name': subscription_plan.name,
                                'description': subscription_plan.description
                            },
                            'features': subscription.features_snapshot
                        })
                        
                    except SubscriptionPlan.DoesNotExist:
                        # Rollback transaction if subscription plan doesn't exist
                        transaction.set_rollback(True)
                        return Response(
                            {"error": f"Subscription plan with id {plan_id} does not exist"}, 
                            status=status.HTTP_404_NOT_FOUND
                        )
                
                # Add all subscriptions to response
                response_data['subscriptions'] = subscription_data

            send_email(
                to_emails="manish@turtlesoftware.co",
                # to_emails=client.contact_person_email,
                subject="Welcome to Our Platform!",
                template_name="subscription_welcome",
                template_context={
                    "user_name": "Manish",  
                    "user_email": "manish@turtlesoftware.co",
                    "default_password":"India@123",
                    "subscriptions": [
                            {
                                "license_key": subscription.license_key,
                                "license_status": subscription.license_status,
                                "valid_from": subscription.valid_from.strftime("%Y-%m-%d"),
                                "valid_until": subscription.valid_until.strftime("%Y-%m-%d") if subscription.valid_until else None,
                                "activation_link": f"https://devstore.turtleit.in/default"
                            }
                            for subscription in subscriptions
                        ]
                }
            )

            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            # Log the full error for debugging
            import traceback
            traceback.print_exc()
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def delete(self, request, tenant_id, format=None):
    """Delete a tenant by ID.

    This will follow the specific deletion flow:
    1. Delete entry from ecomm_superadmin_domain
    2. Delete entry from ecomm_superadmin_tenants
    3. Drop the schema with CASCADE
    """
    try:
        import traceback
        from django.db import connection

        # Use a transaction to ensure atomicity
        with transaction.atomic():
            # First, check if the tenant exists using raw SQL
            with connection.cursor() as cursor:
                cursor.execute(
                    """SELECT id, schema_name FROM tenants WHERE id = %s""",
                    [tenant_id]
                )
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
                    raise

                # 2. Then delete the tenant record from ecomm_superadmin_tenants
                cursor.execute("DELETE FROM tenants WHERE id = %s", [tenant_id])
                print(f"Deleted tenant with ID {tenant_id}")

                # 3. Finally drop the schema
                try:
                    cursor.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE")
                    print(f"Dropped schema {schema_name}")
                except Exception as schema_e:
                    print(f"Error dropping schema: {str(schema_e)}")
                    traceback.print_exc()
                    raise

                return Response(status=status.HTTP_204_NO_CONTENT)

    except Exception as e:
        print(f"Error deleting tenant: {str(e)}")
        traceback.print_exc()
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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

import json
@method_decorator(csrf_exempt, name='dispatch')
class TenantApplicationsByUrlView(APIView):
    """
    API endpoint to get applications for a specific tenant using their URL suffix.
    """
    def get(self, request, url_suffix):
        try:
            # Close any stale connection
            connection.close()

            with connection.cursor() as cursor:
                # Step 1: Get the tenant
                cursor.execute("""
                    SELECT id AS tenant_id, name AS tenant_name, status AS tenant_status 
                    FROM public.ecomm_superadmin_tenants
                    WHERE url_suffix = %s
                """, [url_suffix])

                tenant_row = cursor.fetchone()
                if not tenant_row:
                    return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)

                tenant_id = tenant_row[0]

                # Step 2: Get the latest active license for the tenant
                cursor.execute("""
                    SELECT id, subscription_plan_id, features_snapshot
                    FROM public.ecomm_superadmin_tenant_subscriptions_licenses
                    WHERE tenant_id = %s
                    ORDER BY valid_from DESC
                    LIMIT 1
                """, [tenant_id])

                license_row = cursor.fetchone()
                if not license_row:
                    return Response({"error": "No active license found for tenant."}, status=status.HTTP_404_NOT_FOUND)

                feature_snapshot = license_row[2]
                if not feature_snapshot:
                    return Response({"error": "No features found in license."}, status=status.HTTP_400_BAD_REQUEST)

                # Step 3: Extract unique app_ids from feature_snapshot JSON
                import json
                if isinstance(feature_snapshot, str):
                    feature_snapshot = json.loads(feature_snapshot)

                app_ids = set()
                for feature in feature_snapshot.values():
                    app_id = feature.get("app_id")
                    if app_id:
                        app_ids.add(app_id)

                if not app_ids:
                    return Response([], status=status.HTTP_200_OK)

                # Step 4: Fetch application details
                placeholders = ','.join(['%s'] * len(app_ids))
                cursor.execute(f"""
                    SELECT DISTINCT a.app_id, a.application_name, a.app_default_url, 
                                    a.description, a.is_active, a.created_at
                    FROM public.application a
                    WHERE a.app_id IN ({placeholders})
                      AND a.is_active = TRUE
                """, list(app_ids))

                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()
                applications = [dict(zip(columns, row)) for row in rows]

                return Response(applications)

        except Exception as e:
            logger.error(f"Error in TenantApplicationsByUrlView: {str(e)}", exc_info=True)
            return Response(
                {
                    "error": str(e),
                    "detail": "An unexpected error occurred while fetching applications."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# @method_decorator(csrf_exempt, name='dispatch')
# class TenantSubscriptionDetailsView(APIView):
#     """
#     API endpoint to get subscription details for a specific tenant.
#     """
#     def get(self, request, tenant_slug):
#         """
#         Get subscription details for a tenant by their URL suffix.
        
#         Returns:
#             - Tenant's subscription plan details including:
#               - Plan name and ID
#               - Plan features and their settings
#               - Usage statistics (if available)
#               - Subscription status and dates
#         """
#         try:
#             with connection.cursor() as cursor:
#                 # Get tenant and subscription plan details
#                 cursor.execute("""
#                     SELECT 
#                         t.id as tenant_id,
#                         t.name as tenant_name,
#                         t.subscription_plan_id,
#                         t.status as tenant_status,
#                         t.default_url,
#                         t.paid_until,
#                         sp.id as plan_id,
#                         sp.name as plan_name,
#                         sp.description,
#                         sp.status as plan_status,
#                         sp.price,
#                         sp.max_users,
#                         sp.transaction_limit,
#                         sp.api_call_limit,
#                         sp.storage_limit,
#                         sp.session_type,
#                         sp.support_level,
#                         sp.valid_from,
#                         sp.valid_until,
#                         sp.granular_settings
#                     FROM public.ecomm_superadmin_tenants t
#                     LEFT JOIN public.subscription_plans sp ON t.subscription_plan_id = sp.id
#                     WHERE t.url_suffix = %s
#                 """, [tenant_slug])
                
#                 tenant_data = cursor.fetchone()
#                 if not tenant_data:
#                     return Response(
#                         {"error": "Tenant not found"},
#                         status=status.HTTP_404_NOT_FOUND
#                     )
                
#                 columns = [col[0] for col in cursor.description]
#                 tenant_dict = dict(zip(columns, tenant_data))
                
#                 # Get plan features and their settings
#                 if tenant_dict['subscription_plan_id']:
#                     cursor.execute("""
#                         SELECT 
#                             f.id as feature_id,
#                             f.name as feature_name,
#                             f.description as feature_description,
#                             f.granual_settings as feature_settings
#                         FROM public.plan_feature_entitlements pfe
#                         JOIN public.features f ON pfe.feature_id = f.id
#                         WHERE pfe.plan_id = %s
#                     """, [tenant_dict['subscription_plan_id']])
                    
#                     features = []
#                     for row in cursor.fetchall():
#                         feature_columns = [col[0] for col in cursor.description]
#                         feature_dict = dict(zip(feature_columns, row))
#                         features.append(feature_dict)
                    
#                     tenant_dict['features'] = features
                
#                 return Response(tenant_dict)
                
#         except Exception as e:
#             logger.error(f"Error in TenantSubscriptionDetailsView: {str(e)}", exc_info=True)
#             return Response(
#                 {"error": str(e),
#                  "detail": "An unexpected error occurred while fetching subscription details."},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )

@method_decorator(csrf_exempt, name='dispatch')
class TenantSubscriptionDetailsView(APIView):
    """
    API endpoint to get all subscription licenses for a specific tenant.
    """

    def get(self, request, tenant_slug):
        try:
            with connection.cursor() as cursor:
                # Step 1: Fetch tenant info
                cursor.execute("""
                    SELECT 
                        id as tenant_id,
                        name as tenant_name,
                        status as tenant_status,
                        default_url,
                        paid_until
                    FROM public.ecomm_superadmin_tenants
                    WHERE url_suffix = %s
                """, [tenant_slug])
                
                tenant_data = cursor.fetchone()
                if not tenant_data:
                    return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)

                tenant_columns = [col[0] for col in cursor.description]
                tenant_dict = dict(zip(tenant_columns, tenant_data))
                tenant_id = tenant_dict["tenant_id"]

                # Step 2: Fetch ALL licenses for the tenant
                cursor.execute("""
                    SELECT 
                        subscription_plan_id, 
                        valid_from, 
                        valid_until, 
                        license_status, 
                        subscription_plan_snapshot::TEXT, 
                        features_snapshot::TEXT
                    FROM ecomm_superadmin_tenant_subscriptions_licenses
                    WHERE tenant_id = %s
                    ORDER BY valid_from DESC
                """, [tenant_id])

                license_rows = cursor.fetchall()
                licenses = []

                for row in license_rows:
                    try:
                        plan_id, valid_from, valid_until, license_status, plan_snapshot_json, features_snapshot_json = row
                        subscription_plan = json.loads(plan_snapshot_json)
                        # features_snapshot = json.loads(features_snapshot_json)

                        licenses.append({
                            "subscription_plan_id": plan_id,
                            "valid_from": valid_from,
                            "valid_until": valid_until,
                            "license_status": license_status,
                            "subscription_plan": subscription_plan,
                            # "features_snapshot": features_snapshot
                        })
                    except json.JSONDecodeError as decode_err:
                        logger.warning(f"Skipping license due to JSON decode error: {decode_err}")
                        continue

                tenant_dict['licenses'] = licenses
                return Response(tenant_dict)

        except Exception as e:
            logger.error(f"Error in TenantSubscriptionDetailsView: {str(e)}", exc_info=True)
            return Response(
                {
                    "error": str(e),
                    "detail": "An unexpected error occurred while fetching subscription details."
                },
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

@method_decorator(csrf_exempt, name='dispatch')
class TenantByDefaultUrlView(APIView):
    """
    API endpoint to get tenant schema and URL suffix by default URL.
    Returns only the tenant_schema and url_suffix based on the default URL.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, format=None):
        default_url = request.query_params.get('default_url')
        
        if not default_url:
            return Response(
                {'error': 'default_url parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Try to find a tenant with the exact default_url
            tenant = Tenant.objects.using('default').get(default_url=default_url)
            
            response_data = {
                'tenant_id': tenant.id,
                'tenant_schema': tenant.schema_name,
                # 'url_suffix': tenant.url_suffix,
                'default_url': tenant.default_url
            }
            
            return Response(response_data)
            
        except Tenant.DoesNotExist:
            try:
                # Check if the URL exists in the tenant domains
                from django_tenants.utils import get_tenant_domain_model
                domain = get_tenant_domain_model().objects.get(domain=default_url)
                tenant = domain.tenant
                
                response_data = {
                    'tenant_id': tenant.id,
                    'tenant_schema': tenant.schema_name,
                    # 'url_suffix': tenant.url_suffix,
                    'default_url': default_url,
                    'found_via': 'domain_lookup'
                }
                return Response(response_data)
                
            except Exception:
                return Response(
                    {'error': 'No tenant found for the provided URL'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LineOfBusinessViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Lines of Business to be viewed or edited.
    Provides CRUD operations for LineOfBusiness objects with appropriate permissions.
    """
    queryset = LineOfBusiness.objects.all()
    serializer_class = LineOfBusinessSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Filter based on query parameters
        queryset = super().get_queryset()
        is_active = self.request.query_params.get('is_active')
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
            
        return queryset

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Custom endpoint to get only active lines of business"""
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        # Set created_by and updated_by to the current user's ID
        serializer.save()

    def perform_update(self, serializer):
        # Update only the updated_by field
        serializer.save()


from KeyProductSettings import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from ecomm_superadmin.models import TenantSubscriptionLicenses

@csrf_exempt
def get_license_info(request):
    secret_header = request.headers.get('x-internal-api-secret')
    print("kl:",secret_header)
    if secret_header != settings.INTERNAL_API_SECRET:
        return JsonResponse({'error': 'Unauthorized'}, status=401)

    access_key = request.GET.get('access_key')
    if not access_key:
        return JsonResponse({'error': 'Missing access key'}, status=400)

    try:
        license_obj = TenantSubscriptionLicenses.objects.get(access_key=access_key)
        return JsonResponse({
            'access_key': license_obj.access_key,
            'encryption_key': license_obj.encryption_key
        })
    except TenantSubscriptionLicenses.DoesNotExist:
        return JsonResponse({'error': 'Invalid access key'}, status=404)
