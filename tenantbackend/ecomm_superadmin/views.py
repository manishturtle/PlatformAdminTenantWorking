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
import datetime
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging
import uuid
from subscription_plan.models import SubscriptionPlan
from ecomm_tenant.ecomm_tenant_admins.serializers import LoginConfigSerializer
from .models import TenantSubscriptionLicenses, LineOfBusiness
from django.utils import timezone
from datetime import timedelta
from rest_framework.generics import RetrieveAPIView
from rest_framework.exceptions import NotFound
logger = logging.getLogger(__name__)
from services.email_service import send_email
from KeyProductSettings.settings import APPLICATION_MIGRATION_BACKEND_ENDPOINT
from ecomm_superadmin.platform_admin_jwt import PlatformAdminJWTAuthentication
from ecomm_tenant.ecomm_tenant_admins.tenant_jwt import TenantAdminJWTAuthentication

from .models import Tenant, User, CrmClient, Application, TenantAppPortals
from .serializers import TenantSerializer, LoginSerializer, UserSerializer, UserAdminSerializer, CrmClientSerializer, ApplicationSerializer, LineOfBusinessSerializer
from .rabbitMQ import setup_tenant_rabbitmq_queue
import json


@method_decorator(csrf_exempt, name='dispatch')
class PlatformAdminTenantView(APIView):
    """
    API endpoint that allows platform admins to manage tenants.
    Uses direct database access to avoid model field mapping issues.
    """
    authentication_classes = [PlatformAdminJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminUser]

    def create_tenant_portals(self, tenant_id: int, applications: list) -> None:
        """
        Create portal entries for a tenant based on application configurations.
        
        Args:
            tenant_id (int): The ID of the tenant
            applications (list): List of application details from public schema
        """
        try:
            # Get tenant using model
            try:
                tenant = Tenant.objects.get(id=tenant_id)
                tenant_schema = tenant.schema_name
            except Tenant.DoesNotExist:
                raise ValueError(f"No tenant found with id {tenant_id}")

            for app in applications:
                if not app.get('portals_config'):
                    continue
                    
                portals_config = json.loads(app['portals_config']) if isinstance(app['portals_config'], str) else app['portals_config']
                app_default_url = app.get('app_default_url', '')
                
                for portal in portals_config:
                    endpoint_path = portal.get('endpoint_path', '')
                    # Construct redirect_url by combining app_default_url, tenant schema and endpoint_path
                    # Remove any trailing slashes from app_default_url and leading slashes from endpoint_path
                    base_url = app_default_url.rstrip('/')
                    path = endpoint_path.lstrip('/')
                    redirect_url = f"{base_url}/{tenant_schema}/{path}/" if path else f"{base_url}/{tenant_schema}"
                    
                    TenantAppPortals.objects.create(
                        tenant_id=tenant_id,
                        app_id=app['app_id'],
                        portal_name=portal.get('portal_name', ''),
                        default_url=app_default_url,
                        endpoint_path=endpoint_path,
                        redirect_url=redirect_url,
                        custom_redirect_url=portal.get('custom_redirect_url', None),
                        created_by=self.request.user.id if hasattr(self, 'request') and self.request.user else None,
                        updated_by=self.request.user.id if hasattr(self, 'request') and self.request.user else None
                    )
                    
            logger.info(f"Successfully created portal entries for tenant {tenant_id}")
            
        except Exception as e:
            logger.error(f"Error creating portal entries for tenant {tenant_id}: {str(e)}", exc_info=True)
            raise

    def get(self, request, tenant_id=None, format=None):
        """
        List all tenants or get a specific tenant by ID.
        """
        # If tenant_id is provided, return a single tenant with detailed information
        if tenant_id is not None:
            try:
                with connection.cursor() as cursor:
                    # Get basic tenant info
                    cursor.execute("""
                        SELECT 
                            t.id, t.schema_name, t.name, t.url_suffix, t.status, 
                            t.environment,
                            t.created_at, t.updated_at, t.client_id,
                            c.client_name, c.contact_person_email
                        FROM ecomm_superadmin_tenants t
                        LEFT JOIN ecomm_superadmin_crmclients c ON t.client_id = c.id
                        WHERE t.id = %s
                    """, [tenant_id])
                    
                    tenant_data = cursor.fetchone()
                    if not tenant_data:
                        return Response(
                            {"error": f"Tenant with id {tenant_id} does not exist"}, 
                            status=status.HTTP_404_NOT_FOUND
                        )
                    
                    # Get column names
                    columns = [col[0] for col in cursor.description]
                    tenant_dict = dict(zip(columns, tenant_data))
                    
                    # Get admin user details from ecomm_tenant_admins_tenantuser table (TenantUser model)
                    try:
                        # First check if the table exists
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT 1 
                                FROM information_schema.tables 
                                WHERE table_schema = %s 
                                AND table_name = 'ecomm_tenant_admins_tenantuser'
                            )
                        """, [tenant_dict['schema_name']])
                        tenant_user_table_exists = cursor.fetchone()[0]
                        print("kk:")
                        if tenant_user_table_exists:
                            # First, let's check what users exist in the tenant's schema
                            cursor.execute(f"""
                                SELECT EXISTS (
                                    SELECT 1 
                                    FROM information_schema.tables 
                                    WHERE table_schema = %s 
                                    AND table_name = 'ecomm_tenant_admins_tenantuser'
                                )
                            """, [tenant_dict['schema_name']])
                            table_exists = cursor.fetchone()[0]
                            
                            if not table_exists:
                                logger.warning(f"Table ecomm_tenant_admins_tenantuser does not exist in schema {tenant_dict['schema_name']}")
                                tenant_dict['admin_user'] = None
                                return Response(tenant_dict)
                            
                            # Log all users in the tenant's schema for debugging
                            cursor.execute(f"""
                                SELECT 
                                    id, email, first_name, last_name, is_staff, is_active, is_superuser, date_joined
                                FROM "{tenant_dict['schema_name']}".ecomm_tenant_admins_tenantuser
                                WHERE is_superuser = true
                                ORDER BY date_joined ASC
                            """)
                            admin_data = cursor.fetchone()
                            print("admin_data:", admin_data)
                            if admin_data:
                                # Get column names
                                admin_columns = [col[0] for col in cursor.description] if cursor.description else []
                                # Convert the row to a dictionary
                                admin_dict = dict(zip(admin_columns, admin_data))
                                
                                # Try to get user roles if role tables exist
                                try:
                                    cursor.execute(f"""
                                        SELECT EXISTS (
                                            SELECT 1 
                                            FROM information_schema.tables 
                                            WHERE table_schema = %s 
                                            AND table_name = 'role_controles_userrole'
                                        )
                                    """, [tenant_dict['schema_name']])
                                    roles_table_exists = cursor.fetchone()[0]
                                    
                                    if roles_table_exists:
                                        cursor.execute(f"""
                                            SELECT r.name 
                                            FROM "{tenant_dict['schema_name']}".role_controles_role r
                                            JOIN "{tenant_dict['schema_name']}".role_controles_userrole ur ON r.id = ur.role_id
                                            WHERE ur.user_id = %s
                                        """, [admin_dict['id']])
                                        admin_dict['roles'] = [row[0] for row in cursor.fetchall()]
                                    else:
                                        admin_dict['roles'] = []
                                        logger.info(f"Role tables not found in schema {tenant_dict['schema_name']}")
                                except Exception as e:
                                    logger.warning(f"Error fetching roles for user {admin_dict.get('id')}: {str(e)}")
                                    admin_dict['roles'] = []
                                
                                tenant_dict['admin_user'] = admin_dict
                            else:
                                tenant_dict['admin_user'] = None
                                logger.warning(f"No staff user found for tenant {tenant_dict['id']}")
                        else:
                            tenant_dict['admin_user'] = None
                            logger.warning(f"Table ecomm_tenant_admins_tenantuser not found in schema {tenant_dict['schema_name']}")
                                
                    except Exception as e:
                        import traceback
                        logger.error(f"Error fetching admin user for tenant {tenant_dict.get('id', 'unknown')}: {str(e)}\n{traceback.format_exc()}")
                        tenant_dict['admin_user'] = None
                    
                    # Get all subscription details for the tenant
                    cursor.execute("""
                        SELECT 
                            tsl.id as license_id,
                            tsl.subscription_plan_id,
                            tsl.license_key,
                            tsl.valid_from,
                            tsl.valid_until,
                            tsl.license_status,
                            tsl.subscription_plan_snapshot::TEXT as plan_snapshot,
                            tsl.features_snapshot::TEXT as features_snapshot,
                            sp.name as plan_name,
                            sp.description as plan_description,
                            tsl.created_at,
                            tsl.updated_at
                        FROM ecomm_superadmin_tenant_subscriptions_licenses tsl
                        LEFT JOIN subscription_plans sp ON tsl.subscription_plan_id = sp.id
                        WHERE tsl.tenant_id = %s
                        ORDER BY 
                            CASE 
                                WHEN tsl.valid_until > CURRENT_TIMESTAMP THEN 0  -- Active subscriptions first
                                ELSE 1  -- Expired subscriptions last
                            END,
                            tsl.valid_until DESC,  -- Most recent first within each group
                            tsl.created_at DESC  -- Fallback to creation date
                    """, [tenant_id])
                    
                    subscription_columns = [col[0] for col in cursor.description]
                    subscription_rows = cursor.fetchall()
                    
                    # Process all subscriptions
                    subscriptions = []
                    for row in subscription_rows:
                        subscription_dict = dict(zip(subscription_columns, row))
                        # Parse JSON snapshots
                        if subscription_dict.get('plan_snapshot'):
                            subscription_dict['plan_snapshot'] = json.loads(subscription_dict['plan_snapshot'])
                        if subscription_dict.get('features_snapshot'):
                            subscription_dict['features_snapshot'] = json.loads(subscription_dict['features_snapshot'])
                        # Convert datetime objects to strings for JSON serialization
                        for date_field in ['valid_from', 'valid_until', 'created_at', 'updated_at']:
                            if subscription_dict.get(date_field) and isinstance(subscription_dict[date_field], (datetime.date, datetime.datetime)):
                                subscription_dict[date_field] = subscription_dict[date_field].isoformat()
                        subscriptions.append(subscription_dict)
                    
                    # Add all subscriptions to the response
                    tenant_dict['subscriptions'] = subscriptions
                    # For backward compatibility, include the first subscription as 'subscription'
                    if subscriptions:
                        tenant_dict['subscription'] = subscriptions[0]
                    
                    # Get assigned applications
                    cursor.execute("""
                        SELECT 
                            a.app_id, a.application_name, a.description, 
                            a.app_default_url, a.is_active
                        FROM ecomm_superadmin_tenantapplication ta
                        JOIN application a ON ta.application_id = a.app_id
                        WHERE ta.tenant_id = %s AND ta.is_active = true
                    """, [tenant_id])
                    
                    app_columns = [col[0] for col in cursor.description]
                    app_rows = cursor.fetchall()
                    tenant_dict['assigned_applications'] = [
                        dict(zip(app_columns, row)) for row in app_rows
                    ]
                    
                    # Convert datetime objects to ISO format
                    for field in ['created_at', 'updated_at', 'last_login', 'date_joined', 'valid_from', 'valid_until']:
                        if field in tenant_dict and tenant_dict[field]:
                            tenant_dict[field] = tenant_dict[field].isoformat()
                    
                    return Response(tenant_dict)
                    
            except Exception as e:
                import traceback
                traceback.print_exc()
                return Response(
                    {"error": f"Error retrieving tenant: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Otherwise, return all tenants
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT 
                        t.id, t.schema_name, t.name, t.url_suffix, t.schema_name, t.created_at, t.updated_at,
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

    def get_applications_from_subscription(self, subscription_plan):
        """
        Get applications associated with the subscription plan from the public schema.
        
        Args:
            subscription_plan: The SubscriptionPlan object containing feature entitlements
            
        Returns:
            list: List of application details from the public schema
        """
        try:
            with connection.cursor() as cursor:
                # Get unique app_ids from feature entitlements
                app_ids = list(subscription_plan.feature_entitlements \
                             .select_related('feature') \
                             .values_list('feature__app_id', flat=True) \
                             .distinct())
                
                logger.info(f"Found {len(app_ids)} unique app IDs in subscription features")
                
                if not app_ids:
                    logger.warning("No application IDs found in subscription features")
                    return []
                
                # Convert app_ids to a tuple for the SQL IN clause
                app_ids_tuple = tuple(app_ids)
                
                # Query to get application details
                query = """
                    SELECT app_id, application_name, app_default_url, portals_config
                    FROM application
                    WHERE app_id IN %s
                """
                
                cursor.execute(query, (app_ids_tuple,))
                
                # Get column names from cursor description
                columns = [col[0] for col in cursor.description]
                
                # Convert results to list of dictionaries
                applications = [
                    dict(zip(columns, row))
                    for row in cursor.fetchall()
                ]
                
                logger.info(f"Found {len(applications)} applications for subscription plan {subscription_plan.id}")
                return applications
                
        except Exception as e:
            logger.error(f"Error fetching applications from subscription plan: {str(e)}", exc_info=True)
            raise

    def post(self, request, format=None):
        """Create a new tenant and optionally assign subscription plan."""
        from django.db import transaction
        import logging
        import traceback
        
        logger = logging.getLogger(__name__)
        
        serializer = TenantSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Start transaction for tenant creation
            # Create tenant first
            tenant = serializer.save(
                created_by=request.user.username if request.user.is_authenticated else None
            )
            
            # Create RabbitMQ queue for the new tenant
            try:
                logger.info(f"Setting up RabbitMQ queue for tenant: {tenant.name} (id: {tenant.id})")
                setup_tenant_rabbitmq_queue(tenant)
                logger.info(f"Successfully set up RabbitMQ queue for tenant: {tenant.name}")
            except Exception as e:
                logger.error(f"Error setting up RabbitMQ queue for tenant {tenant.name}: {str(e)}", exc_info=True)
                # Don't fail the entire request if queue creation fails

            # Initialize response data
            response_data = {'tenant': serializer.data}

            # Get client details from the database based on client_id
            client_id = request.data.get('client_id')
            client = None
            try:
                if client_id:
                    client = CrmClient.objects.get(id=client_id)
                    logger.info(f"Found client: {client.client_name} with email: {client.contact_person_email}")
            except CrmClient.DoesNotExist:
                logger.warning(f"Client with id {client_id} not found in database")
                # Continue execution, we'll use defaults if client not found
            except Exception as e:
                logger.error(f"Error retrieving client details: {str(e)}", exc_info=True)
                # Continue execution, we'll use defaults if there's an error

            # Handle subscription plans if provided
            subscription_plan_ids = request.data.get('subscription_plan', [])
            if not isinstance(subscription_plan_ids, list):
                subscription_plan_ids = [subscription_plan_ids]
            
            subscriptions = []
            subscription_data = []
            all_applications = []
            
            if subscription_plan_ids:
                for plan_id in subscription_plan_ids:
                    try:
                        subscription_plan = SubscriptionPlan.objects.get(id=plan_id)
                        
                        # Create subscription with license
                        subscription = self.create_tenant_subscription(
                            tenant=tenant,
                            subscription_plan=subscription_plan,
                            client_id=client_id,
                            company_id=request.data.get('company_id'),
                            created_by=request.user.username if request.user.is_authenticated else None
                        )
                        
                        subscriptions.append(subscription)
                        
                        # Create default roles based on subscription features
                        self.create_default_roles_from_subscription(tenant, subscription)
                        
                        # Get applications for this subscription plan
                        applications = self.get_applications_from_subscription(subscription_plan)
                        all_applications.extend(applications)
                        
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

                # Create portal entries for all applications
                if all_applications:
                    try:
                        self.create_tenant_portals(tenant.id, all_applications)
                    except Exception as e:
                        logger.error(f"Error creating portal entries: {str(e)}", exc_info=True)
                        # Don't fail the entire request if portal creation fails

            # Prepare email context with enhanced application data including all portal URLs
            email_subscriptions = []
            
            for subscription in subscriptions:
                # Get applications for this subscription
                subscription_apps = []
                subscription_plan = SubscriptionPlan.objects.get(id=subscription.subscription_plan_id)
                applications = self.get_applications_from_subscription(subscription_plan)
                
                for app in applications:
                    app_data = {
                        "name": app.get('application_name', 'Unknown Application'),
                        "app_id": app.get('app_id'),
                        "url": app.get('app_default_url', ''),  # For backward compatibility
                        "portals": []
                    }
                    
                    # Get all portal entries for this application
                    try:
                        portals = TenantAppPortals.objects.filter(
                            tenant_id=tenant.id,
                            app_id=app.get('app_id')
                        )
                        
                        for portal in portals:
                            # Use custom_redirect_url if available, otherwise use redirect_url
                            portal_url = portal.custom_redirect_url if portal.custom_redirect_url else portal.redirect_url
                            
                            app_data["portals"].append({
                                "portal_name": portal.portal_name,
                                "portal_url": portal_url
                            })
                    except Exception as e:
                        logger.error(f"Error fetching portal entries for app {app.get('app_id')}: {str(e)}", exc_info=True)
                    
                    # If no portals found, include a default entry
                    if not app_data["portals"] and app_data["url"]:
                        app_data["portals"] = [{
                            "portal_name": "Default",
                            "portal_url": app_data["url"]
                        }]
                    
                    subscription_apps.append(app_data)
                
                # Create the subscription data structure for the email
                email_subscriptions.append({
                    "license_key": subscription.license_key,
                    "license_status": subscription.license_status,
                    "valid_from": subscription.valid_from.strftime("%Y-%m-%d"),
                    "valid_until": subscription.valid_until.strftime("%Y-%m-%d") if subscription.valid_until else None,
                    "applications": subscription_apps
                })
            
            # Use client info if available, otherwise use defaults
            user_name = client.contact_person_name if client and hasattr(client, 'contact_person_name') else "User"
            user_email = client.contact_person_email if client and hasattr(client, 'contact_person_email') else "admin@example.com"
            
            # Default password (should ideally be generated and stored securely)
            default_password = "India@123"
            
            # Send the welcome email with enhanced application data
            if email_subscriptions:  # Only send email if we have subscriptions
                send_email(
                    to_emails="manish@turtlesoftware.co",
                    # to_emails=user_email,
                    subject=f"Welcome to Our Platform, {user_name}!",
                    template_name="subscription_welcome",
                    template_context={
                        "user_name": user_name,
                        "user_email": user_email,
                        "default_password": default_password,
                        "subscriptions": email_subscriptions,
                        "tenant_name": tenant.name
                    }
                )

            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            # Log the full error for debugging
            logger.error(f"Error in PlatformAdminTenantView.post: {str(e)}", exc_info=True)
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            connection.set_schema_to_public()

    def put(self, request, tenant_id=None, format=None):
        """
        Update a tenant's information.
        """
        if not tenant_id:
            return Response(
                {"error": "Tenant ID is required for update"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            tenant = Tenant.objects.get(id=tenant_id)
            serializer = TenantSerializer(tenant, data=request.data, partial=True)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
            serializer.save()
            return Response(serializer.data)
            
        except Tenant.DoesNotExist:
            return Response(
                {"error": f"Tenant with id {tenant_id} does not exist"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error updating tenant: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to update tenant"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, tenant_id=None, format=None):
        """Delete a tenant by ID.

        This will follow the specific deletion flow:
        1. Delete entry from ecomm_superadmin_domain
        2. Delete entry from ecomm_superadmin_tenants
        3. Drop the schema with CASCADE
        """
        if not tenant_id:
            return Response(
                {"error": "Tenant ID is required for deletion"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        try:
            import traceback
            from django.db import connection

            # Use a transaction to ensure atomicity
            with transaction.atomic():
                # First, check if the tenant exists using raw SQL
                with connection.cursor() as cursor:
                    cursor.execute(
                        """SELECT id, schema_name FROM ecomm_superadmin_tenants WHERE id = %s""",
                        [tenant_id]
                    )
                    result = cursor.fetchone()
                    if not result:
                        return Response(
                            {"error": f"Tenant with ID {tenant_id} not found"},
                            status=status.HTTP_404_NOT_FOUND
                        )

                    tenant_id, schema_name = result
                    # Use separate connections for each step to avoid transaction issues
                    # Delete operations are executed within their own transactions
                    
                    # 1. Delete app portals for this tenant (added as per new requirement)
                    try:
                        with transaction.atomic():
                            with connection.cursor() as cursor0:
                                cursor0.execute("""
                                    DELETE FROM ecomm_superadmin_tenant_app_portals 
                                    WHERE tenant_id = %s
                                """, [tenant_id])
                                rows_deleted = cursor0.rowcount
                                logger.info(f"Deleted {rows_deleted} app portal entries for tenant ID {tenant_id}")
                    except Exception as app_e:
                        logger.error(f"Error deleting tenant app portals: {str(app_e)}")
                        # Continue with deletion even if this step fails
                    
                    # 2. Delete subscription licenses for this tenant
                    try:
                        with transaction.atomic():
                            with connection.cursor() as cursor1:
                                cursor1.execute("""
                                    DELETE FROM ecomm_superadmin_tenant_subscriptions_licenses 
                                    WHERE tenant_id = %s
                                """, [tenant_id])
                                rows_deleted = cursor1.rowcount
                                logger.info(f"Deleted {rows_deleted} subscription licenses for tenant ID {tenant_id}")
                    except Exception as sub_e:
                        logger.error(f"Error deleting subscription licenses: {str(sub_e)}")
                        # Continue with deletion even if this step fails

                    # 3. Delete entries from ecomm_superadmin_domain
                    try:
                        with transaction.atomic():
                            with connection.cursor() as cursor2:
                                cursor2.execute("""
                                    DELETE FROM ecomm_superadmin_domain 
                                    WHERE tenant_id = %s
                                """, [tenant_id])
                                rows_deleted = cursor2.rowcount
                                logger.info(f"Deleted {rows_deleted} domain entries for tenant ID {tenant_id}")
                    except Exception as domain_e:
                        logger.error(f"Error deleting domain entries: {str(domain_e)}")
                        # Continue with deletion even if this step fails
                    
                    # 4. Check for any other foreign key references and delete them
                    try:
                        with transaction.atomic():
                            with connection.cursor() as cursor3:
                                cursor3.execute("""
                                    DELETE FROM ecomm_superadmin_tenant_settings
                                    WHERE tenant_id = %s
                                """, [tenant_id])
                                rows_deleted = cursor3.rowcount
                                logger.info(f"Deleted {rows_deleted} tenant settings for tenant ID {tenant_id}")
                    except Exception as settings_e:
                        # This might fail if the table doesn't exist, which is fine
                        logger.info(f"No tenant settings to delete or table doesn't exist: {str(settings_e)}")
                        # If this failed, it won't affect the other transactions

                    # 5. Then delete the tenant record from ecomm_superadmin_tenants
                    with transaction.atomic():
                        with connection.cursor() as cursor4:
                            cursor4.execute("DELETE FROM ecomm_superadmin_tenants WHERE id = %s", [tenant_id])
                            rows_deleted = cursor4.rowcount
                            logger.info(f"Deleted tenant with ID {tenant_id} ({rows_deleted} record)")

                    # 6. Finally drop the schema
                    try:
                        with transaction.atomic():
                            with connection.cursor() as cursor5:
                                cursor5.execute(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE")
                                logger.info(f"Dropped schema {schema_name}")
                    except Exception as schema_e:
                        logger.error(f"Error dropping schema: {str(schema_e)}")
                        traceback.print_exc()
                        # Even if schema drop fails, we don't want to raise an exception here
                        # as the tenant record is already deleted

                    return Response(status=status.HTTP_204_NO_CONTENT)

        except Exception as e:
            logger.error(f"Error deleting tenant: {str(e)}")
            traceback.print_exc()
            
            # Make sure any open transaction is rolled back
            try:
                connection.rollback()
                logger.info("Rolled back transaction after error")
            except Exception as rollback_e:
                logger.error(f"Error rolling back transaction: {str(rollback_e)}")
                
            return Response(
                {"error": "An error occurred while deleting the tenant"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@method_decorator(csrf_exempt, name='dispatch')
class PlatformAdminLoginView(APIView):
    """
    API endpoint for platform admin login.
    """
    permission_classes = [AllowAny]
    # authentication_classes = [PlatformAdminJWTAuthentication]
    
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
    authentication_classes = [PlatformAdminJWTAuthentication]
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
    authentication_classes = [PlatformAdminJWTAuthentication]
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
    # permission_classes = [AllowAny]
    authentication_classes = [TenantAdminJWTAuthentication]
    def get(self, request, url_suffix):
        try:
            connection.close()
            with connection.cursor() as cursor:
                # Step 1: Get the tenant
                cursor.execute("""
                    SELECT id AS tenant_id, name AS tenant_name, status AS tenant_status 
                    FROM public.ecomm_superadmin_tenants
                    WHERE url_suffix = %s or schema_name = %s
                """, [url_suffix, url_suffix])

                tenant_row = cursor.fetchone()
                if not tenant_row:
                    return Response({"error": "Tenant not found"}, status=status.HTTP_404_NOT_FOUND)

                tenant_id = tenant_row[0]

                # Step 2: Get all licenses for the tenant
                cursor.execute("""
                    SELECT id, subscription_plan_id, features_snapshot
                    FROM public.ecomm_superadmin_tenant_subscriptions_licenses
                    WHERE tenant_id = %s
                    ORDER BY valid_from DESC
                """, [tenant_id])

                license_rows = cursor.fetchall()
                if not license_rows:
                    return Response({"error": "No active licenses found for tenant."}, status=status.HTTP_404_NOT_FOUND)

                # Step 3: Extract app_ids from all features_snapshots
                app_ids = set()
                for row in license_rows:
                    license_id, plan_id, features_snapshot = row
                    if features_snapshot:
                        if isinstance(features_snapshot, str):
                            features_snapshot = json.loads(features_snapshot)
                        for feature in features_snapshot.values():
                            app_id = feature.get("app_id")
                            if app_id:
                                app_ids.add(app_id)

                if not app_ids:
                    return Response([], status=status.HTTP_200_OK)
                # Step 4: Fetch application and portal details
                placeholders = ','.join(['%s'] * len(app_ids))
                cursor.execute(f"""
                    SELECT DISTINCT 
                        a.app_id, 
                        a.application_name, 
                        a.app_default_url, 
                        a.description, 
                        a.is_active, 
                        a.created_at,
                        p.default_url AS portal_default_url,
                        p.redirect_url AS portal_redirect_url,
                        p.custom_redirect_url AS portal_custom_redirect_url
                    FROM public.application a
                    JOIN public.ecomm_superadmin_tenant_app_portals p
                        ON a.app_id = p.app_id
                    WHERE a.app_id IN ({placeholders})
                        AND a.is_active = TRUE
                        AND p.tenant_id = %s
                """, list(app_ids) + [tenant_id])

                columns = [col[0] for col in cursor.description]
                rows = cursor.fetchall()

                # Step 5: Build response
                apps_by_id = {}
                for row in rows:
                    app = dict(zip(columns, row))
                    app_id = app["app_id"]
                    redirect_url = app["portal_custom_redirect_url"] or app["portal_redirect_url"]
                    if app_id not in apps_by_id:
                        apps_by_id[app_id] = {
                            "app_id": app_id,
                            "application_name": app["application_name"],
                            "app_default_url": redirect_url,
                            "description": app["description"],
                            "is_active": app["is_active"],
                            "created_at": app["created_at"]
                        }

                applications = list(apps_by_id.values())
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




@method_decorator(csrf_exempt, name='dispatch')
class TenantSubscriptionDetailsView(APIView):
    """
    API endpoint to get all subscription licenses and applications for a specific tenant.
    """
    authentication_classes = [TenantAdminJWTAuthentication]
    
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
                        tsl.id as license_id,
                        tsl.subscription_plan_id, 
                        tsl.valid_from, 
                        tsl.valid_until, 
                        tsl.license_status, 
                        tsl.subscription_plan_snapshot::TEXT, 
                        tsl.features_snapshot::TEXT,
                        tsp.name as plan_name,
                        tsp.description as plan_description
                    FROM ecomm_superadmin_tenant_subscriptions_licenses tsl
                    LEFT JOIN subscription_plans tsp ON tsl.subscription_plan_id = tsp.id
                    WHERE tsl.tenant_id = %s
                    ORDER BY tsl.valid_from DESC
                """, [tenant_id])

                license_rows = cursor.fetchall()
                licenses = []
                all_applications = set()
                applications_map = {}

                for row in license_rows:
                    try:
                        (license_id, plan_id, valid_from, valid_until, license_status, 
                         plan_snapshot_json, features_snapshot_json, plan_name, plan_description) = row
                        
                        subscription_plan = json.loads(plan_snapshot_json) if plan_snapshot_json else {}
                        features_snapshot = json.loads(features_snapshot_json) if features_snapshot_json else {}

                        # Get applications from features snapshot
                        if features_snapshot:
                            for feature_id, feature_data in features_snapshot.items():
                                if 'app_id' in feature_data and feature_data['app_id']:
                                    all_applications.add(feature_data['app_id'])
                                    applications_map[feature_data['app_id']] = {
                                        'app_id': feature_data['app_id'],
                                        'name': feature_data.get('application_name', feature_data['app_id']),
                                        'description': feature_data.get('description', '')
                                    }

                        license_data = {
                            "license_id": license_id,
                            "subscription_plan_id": plan_id,
                            "plan_name": plan_name,
                            "plan_description": plan_description,
                            "valid_from": valid_from,
                            "valid_until": valid_until,
                            "license_status": license_status,
                            "subscription_plan": subscription_plan,
                            "features_snapshot": features_snapshot
                        }
                        licenses.append(license_data)
                    except json.JSONDecodeError as decode_err:
                        logger.warning(f"Skipping license due to JSON decode error: {decode_err}")
                        continue

                # Get additional application details from public.application if available
                if all_applications:
                    app_ids = list(all_applications)
                    placeholders = ','.join(['%s'] * len(app_ids))
                    # Get tenant schema name from tenant_slug
                    cursor.execute("""
                        SELECT schema_name FROM public.ecomm_superadmin_tenants 
                        WHERE url_suffix = %s
                    """, [tenant_slug])
                    
                    schema_result = cursor.fetchone()
                    if not schema_result:
                        return Response({"error": "Tenant schema not found"}, status=status.HTTP_404_NOT_FOUND)
                    
                    tenant_schema = schema_result[0]
                    
                    # Query to get application details with user count from UserApplication model
                    cursor.execute(f"""
                        WITH app_user_counts AS (
                            SELECT 
                                application_id,
                                COUNT(DISTINCT user_id) as user_count
                            FROM {tenant_schema}.ecomm_tenant_admins_userapplication
                            GROUP BY application_id
                        )
                        SELECT 
                            a.app_id, 
                            a.application_name, 
                            a.app_default_url,
                            a.description, 
                            a.is_active,
                            a.created_at,
                            p.default_url AS portal_default_url,
                            p.redirect_url AS portal_redirect_url,
                            p.custom_redirect_url AS portal_custom_redirect_url,
                            COALESCE(auc.user_count, 0) as user_count
                        FROM public.application a
                        LEFT JOIN public.ecomm_superadmin_tenant_app_portals p
                            ON a.app_id = p.app_id AND p.tenant_id = %s
                        LEFT JOIN app_user_counts auc ON a.app_id = auc.application_id
                        WHERE a.app_id IN ({placeholders})
                    """, [tenant_id] + app_ids)
                    
                    columns = [col[0] for col in cursor.description]
                    app_rows = cursor.fetchall()
                    
                    for app_row in app_rows:
                        app_data = dict(zip(columns, app_row))
                        app_id = app_data['app_id']
                        if app_id in applications_map:
                            redirect_url = app_data.get('portal_custom_redirect_url') or app_data.get('portal_redirect_url')
                            applications_map[app_id].update({
                                'name': app_data.get('application_name') or applications_map[app_id]['name'],
                                'description': app_data.get('description') or applications_map[app_id]['description'],
                                'is_active': app_data.get('is_active', False),
                                'app_default_url': redirect_url or app_data.get('app_default_url', ''),
                                'created_at': app_data.get('created_at'),
                                'user_count': app_data.get('user_count', 0)
                            })

                # Build a better structured response with applications as main entities
                applications = []
                app_features_map = {}
                
                # Map each application to its features from all licenses
                for license_data in licenses:
                    features_snapshot = license_data.get('features_snapshot', {})
                    if isinstance(features_snapshot, dict):
                        for feature_id, feature_data in features_snapshot.items():
                            if 'app_id' in feature_data:
                                app_id = feature_data['app_id']
                                if app_id not in app_features_map:
                                    app_features_map[app_id] = []
                                
                                # Add feature data with license information
                                feature_with_license = {
                                    **feature_data,
                                    'license_id': license_data['license_id'],
                                    'plan_name': license_data['plan_name'],
                                    'license_status': license_data['license_status']
                                }
                                app_features_map[app_id].append(feature_with_license)
                
                # Build the final applications list with features and subscription data
                for app_id, app_data in applications_map.items():
                    app_with_features = {
                        **app_data,
                        'features': app_features_map.get(app_id, []),
                        'subscription': next(
                            ({
                                'license_id': license['license_id'],
                                'plan_id': license['subscription_plan_id'],
                                'plan_name': license['plan_name'],
                                'plan_description': license['plan_description'],
                                'valid_from': license['valid_from'],
                                'valid_until': license['valid_until'],
                                'license_status': license['license_status'],
                                'subscription_plan': license['subscription_plan']
                            } for license in licenses if any(
                                feature.get('app_id') == app_id 
                                for feature in license.get('features_snapshot', {}).values() 
                                if isinstance(license.get('features_snapshot'), dict)
                            )
                            ), None)
                    }
                    applications.append(app_with_features)
                
                # Keep backward compatibility
                response_data = {
                    **tenant_dict,
                    'applications': applications,
                    # 'licenses': licenses
                }
                
                return Response(response_data)

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
    authentication_classes = [PlatformAdminJWTAuthentication]
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
        Create a new application with all fields including hardcoded backend values.
        """
        data = request.data.copy()
        # Set default values
        data.setdefault('is_active', True)
        data.setdefault('client_id', 1)
        data.setdefault('company_id', 1)
        # Set hardcoded backend values
        data['migrate_schema_endpoint'] = APPLICATION_MIGRATION_BACKEND_ENDPOINT
        # Set audit fields
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


from django.db.models import Q
from ecomm_tenant.ecomm_tenant_admins.models import LoginConfig

@method_decorator(csrf_exempt, name='dispatch')
class TenantByDefaultUrlView(APIView):
    """
    API endpoint to get tenant schema by a configured URL.
    It first finds the URL in the TenantAppPortals table, then uses the
    tenant_id from that record to retrieve the tenant schema.
    """
    permission_classes = [AllowAny]
    
    def get(self, request, format=None):
        # The incoming URL parameter from the query
        lookup_url = request.query_params.get('default_url')
        
        if not lookup_url:
            return Response(
                {'error': 'default_url parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
          
            # Step 1: Find a portal record where the incoming URL matches any of the URL fields.
            # Using .first() is safer than .get() as it returns None instead of raising an error
            # if no record is found.
            portal = TenantAppPortals.objects.filter(
                Q(redirect_url=lookup_url) |
                Q(custom_redirect_url=lookup_url)
            ).first() 

            if not portal:
                # If no matching portal is found, we can't find a tenant.
                return Response(
                    {'error': 'This URL or tenant is not configured'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
           

            if portal.redirect_url == lookup_url:
                matched_column = "redirect_url"
            elif portal.custom_redirect_url == lookup_url:
                matched_column = "custom_redirect_url"
            else:
                matched_column = None  # just in case, for safety

            # Step 2: Use the tenant_id from the found portal to get the tenant object.
            tenant = Tenant.objects.get(id=portal.tenant_id)
            
            if not tenant:
                return Response(
                    {'error': 'Tenant not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
               
            
            
            # Step 3: Prepare and return the response with the tenant's schema.
            response_data = {
                'tenant_id': tenant.id,
                'tenant_schema': tenant.schema_name,
                # "redirect_url_column":matched_column,
                # "redirect_url": lookup_url or portal.default_url,
                
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Tenant.DoesNotExist:
            # This is a data integrity error: a portal record exists but points to a non-existent tenant.
            return Response(
                {'error': f'Data integrity error: Tenant with id {portal.tenant_id} linked in portal does not exist.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            # A general catch-all for other unexpected errors.
            return Response(
                {'error': f'An unexpected error occurred: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class LineOfBusinessViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows Lines of Business to be viewed or edited.
    Provides CRUD operations for LineOfBusiness objects with appropriate permissions.
    """
    authentication_classes = [PlatformAdminJWTAuthentication]
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


