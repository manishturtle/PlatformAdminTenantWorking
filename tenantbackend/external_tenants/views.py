import logging
import json
from django.http import JsonResponse
from django.db import connection
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import uuid
from datetime import timedelta
from django.utils import timezone
from rest_framework.permissions import AllowAny
from services.email_service import send_email
from ecomm_superadmin.models import TenantAppPortals
from ecomm_superadmin.models import Tenant
from ecomm_superadmin.rabbitMQ import setup_tenant_rabbitmq_queue


logger = logging.getLogger(__name__)



class OrderProcessedView(APIView):
    """API endpoint for processing completed ecommerce orders."""
    
    permission_classes = [AllowAny]
    
    def create_tenant_portals(self, tenant_id: int, applications: list) -> None:
        """
        Create portal entries for a tenant based on application configurations.
        
        Args:
            tenant_id (int): The ID of the tenant
            applications (list): List of application details from public schema
        """
        try:
            # Get tenant using django_tenants model
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
                print("app_default_url:", app_default_url)
                print("tenant_schema:", tenant_schema)
                print("portals_config:", portals_config)
                for portal in portals_config:
                    endpoint_path = portal.get('endpoint_path', '')
                    # Construct redirect_url by combining app_default_url, tenant schema and endpoint_path
                    # Remove any trailing slashes from app_default_url and leading slashes from endpoint_path
                    base_url = app_default_url.rstrip('/')
                    path = endpoint_path.lstrip('/')
                    redirect_url = f"{base_url}/{tenant_schema}/{path}/" if path else f"{base_url}/{tenant_schema}"
                    print("base_url:", base_url)
                    TenantAppPortals.objects.create(
                        tenant_id=tenant_id,
                        app_id=app['app_id'],
                        default_url=app_default_url,
                        portal_name=portal.get('portal_name', ''),
                        endpoint_path=endpoint_path,
                        redirect_url=redirect_url,
                        custom_redirect_url=portal.get('custom_redirect_url', None)
                    )
                    
            logger.info(f"Successfully created portal entries for tenant {tenant_id}")
            
        except Exception as e:
            logger.error(f"Error creating portal entries for tenant {tenant_id}: {str(e)}", exc_info=True)
            raise


    def create_tenant_subscription(self, tenant, subscription_plan, client_id, company_id, created_by):
        """
        Create a subscription for the tenant.
        """
        from ecomm_superadmin.models import TenantSubscriptionLicenses
        
        # Create the subscription with all required fields
        subscription = TenantSubscriptionLicenses(
            tenant=tenant,
            subscription_plan=subscription_plan,
            license_status='active',
            # access_key will be generated in the save() method
            # encryption_key will be generated in the save() method
            # subscription_plan_snapshot will be populated in the save() method
            # features_snapshot will be populated in the save() method
            valid_from=timezone.now(),
            # valid_until can be left as None for now
            billing_cycle=subscription_plan.billing_cycle,
            client_id=client_id,
            company_id=company_id,
            created_by=created_by,
            updated_by=created_by
        )
        
        # Save to trigger the save() method which populates the snapshots
        subscription.save()
        
        # Get applications and create portal entries
        applications = self.get_application_from_subcriptions(subscription_plan)
        print("applications:", applications)
        self.create_tenant_portals(tenant.id, applications)
        
        return subscription

    def get_application_from_subcriptions(self, subscription_plan):
        """
        Get applications associated with the subscription plan from the public schema.
        
        Args:
            subscription_plan: The SubscriptionPlan object containing feature entitlements
            
        Returns:
            list: List of application details from the public schema
        """
        try:
            with connection.cursor() as cursor:
                # Save the current search path
                cursor.execute('SELECT current_setting(\'search_path\')')
                original_search_path = cursor.fetchone()[0]
                
                try:
                    # Set search path to public schema to access applications table
                    cursor.execute('SET search_path TO public')
                    
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
                    
                    # Query to get application details from public schema
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
                    
                finally:
                    # Restore the original search path
                    cursor.execute(f'SET search_path = {original_search_path}')
                
        except Exception as e:
            logger.error(f"Error fetching applications from subscription plan: {str(e)}", exc_info=True)
            raise
    
    def get_custom_product_ids(self, product_ids, tenant_schema):
        """
        Get custom product IDs from the tenant schema's products_product table's custom_fields JSON.
        
        Args:
            product_ids (list): List of product IDs to look up
            tenant_schema (str): The tenant schema name to query
            
        Returns:
            dict: Mapping of product_id to custom_product_id if found, empty dict otherwise
        """
        if not product_ids or not tenant_schema:
            return {}
            
        try:
            with connection.cursor() as cursor:
                # Save the current search path
                cursor.execute('SELECT current_setting(\'search_path\')')
                original_search_path = cursor.fetchone()[0]

             
                
                try:
                    # Set search path to the tenant schema
                    cursor.execute(f'SET search_path TO "{tenant_schema}"')
                    
                    # Convert product_ids to a tuple for the SQL IN clause
                    product_ids_tuple = tuple(product_ids)
                    
                    # Query to get custom_fields from products_product table in tenant schema
                    query = """
                        SELECT custom_fields 
                        FROM products_product 
                        WHERE id IN %s
                    """
                    
                    cursor.execute(query, (product_ids_tuple,))
                    rows = cursor.fetchall()
                    
                    # Extract custom_product_id from custom_fields JSON
                    result = []
                    for row in rows:
                        custom_fields = row[0]
                        if not custom_fields:
                            continue
                            
                        try:
                            print("raw custom_fields:", custom_fields)
                            # Parse the JSON string if it's a string
                            if isinstance(custom_fields, str):
                                import json
                                try:
                                    custom_fields = json.loads(custom_fields)
                                    print("parsed custom_fields:", custom_fields)
                                except json.JSONDecodeError as je:
                                    logger.warning(f"Failed to parse custom_fields JSON: {str(je)}")
                                    continue
                            
                            # Ensure custom_fields is a list
                            if not isinstance(custom_fields, list):
                                custom_fields = [custom_fields]
                                
                            # Process each field
                            for field in custom_fields:
                                if not isinstance(field, dict):
                                    continue
                                    
                                print("processing field:", field)
                                if 'custom_product_id' in field:
                                    result.append(field['custom_product_id'])
                                    print("added to result:", field['custom_product_id'])
                                    
                        except Exception as e:
                            logger.error(f"Error processing custom_fields: {str(e)}", exc_info=True)
                            continue
                    print("result:", result)
                    logger.info(f"Found {len(result)} custom product IDs in schema {tenant_schema}")
                    return result
                finally:
                    # Restore the original search path
                    cursor.execute(f'SET search_path = {original_search_path}')
                    
        except Exception as e:
            logger.error(f"Error fetching custom product IDs from schema {tenant_schema}: {str(e)}", exc_info=True)
            return {}

    def post(self, request, format=None):
        """Process a completed order and create tenant if needed."""
        try:
            # Validate request data
            required_fields = {'order_id', 'product_ids', 'tenant_schema'}
            if not all(field in request.data for field in required_fields):
                return JsonResponse(
                    {
                        'error': 'Missing required fields',
                        'required_fields': list(required_fields)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            order_id = request.data['order_id']
            product_ids = request.data['product_ids']
            tenant_schema = request.data['tenant_schema']
            
            # Get custom product IDs mapping from tenant schema
            custom_product_ids = self.get_custom_product_ids(product_ids, tenant_schema)
            logger.info(f"Found custom product IDs mapping in schema {tenant_schema}: {custom_product_ids}")
            
            if not isinstance(custom_product_ids, list):
                return JsonResponse(
                    {'error': 'custom_product_ids must be a list'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Processing order {order_id} for tenant schema {tenant_schema}")
            
            # Get tenant schema and client data based on order_id
            try:
                from django.db import connections
                from django.db.utils import ProgrammingError
                
                # Get the tenant schema from request data
                schema_name = request.data.get('tenant_schema')
                if not schema_name:
                    return JsonResponse(
                        {'error': 'tenant_schema is required in request data'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Set the schema search path to the tenant's schema
                with connections['default'].cursor() as cursor:
                    # Save the current search path
                    cursor.execute('SELECT current_setting(\'search_path\')')
                    original_search_path = cursor.fetchone()[0]
                    
                    try:
                        # Set search path to the tenant's schema
                        cursor.execute(f'SET search_path TO {schema_name}')
                        
                        # 1. Get account_id and contact_id from order_management_order
                        cursor.execute(
                            'SELECT account_id, contact_id FROM order_management_order WHERE id = %s',
                            [order_id]
                        )
                        order_data = cursor.fetchone()
                        
                        if not order_data:
                            return JsonResponse(
                                {'error': f'Order with id {order_id} not found in schema {schema_name}'},
                                status=status.HTTP_404_NOT_FOUND
                            )
                            
                        account_id, contact_id = order_data
                        
                        # 2. Get tenant_slug (name) from customers_account
                        cursor.execute(
                            'SELECT name FROM customers_account WHERE id = %s',
                            [account_id]
                        )
                        account_data = cursor.fetchone()
                        
                        if not account_data:
                            return JsonResponse(
                                {'error': f'Account with id {account_id} not found in schema {schema_name}'},
                                status=status.HTTP_404_NOT_FOUND
                            )
                            
                        tenant_slug = account_data[0]
                        print("tennat_slig:", tenant_slug)
                        
                        # 3. Get client details from customers_contact
                        cursor.execute(
                            'SELECT first_name, last_name, email FROM customers_contact WHERE id = %s',
                            [contact_id]
                        )
                        contact_data = cursor.fetchone()
                        
                        if not contact_data:
                            return JsonResponse(
                                {'error': f'Contact with id {contact_id} not found in schema {schema_name}'},
                                status=status.HTTP_404_NOT_FOUND
                            )
                            
                        first_name, last_name, email = contact_data
                        
                        # Create or update CrmClient with the fetched data
                        from ecomm_superadmin.models import CrmClient
                        
                        # Prepare client data
                        client_name = f"{first_name} {last_name}".strip()
                        
                        # Check if client with this email already exists
                        from ecomm_superadmin.models import CrmClient
                        
                        try:
                            # Try to get existing client by email
                            client = CrmClient.objects.get(contact_person_email=email)
                            logger.info(f"Client with email {email} already exists, skipping creation")
                            client_id = client.id
                        except CrmClient.DoesNotExist:
                            # Only create new client if one doesn't exist
                            client = CrmClient.objects.create(
                                client_name=client_name,
                                contact_person_email=email or '',
                                created_by='system:order_processor'
                            )
                            logger.info(f"Created new CrmClient with id {client.id}")
                            client_id = client.id
                        
                    except ProgrammingError as e:
                        logger.error(f"Database error: {str(e)}", exc_info=True)
                        return JsonResponse(
                            {'error': 'Database error occurred while fetching order data'},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
                    finally:
                        # Restore the original search path
                        cursor.execute(f'SET search_path = {original_search_path}')
                        
            except Exception as e:
                logger.error(f"Error processing order: {str(e)}", exc_info=True)
                connection.set_schema_to_public() 
                return JsonResponse(
                    {'error': f'Error processing order: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Get the default active subscription plan
            try:
                from ecomm_superadmin.models import SubscriptionPlan
                
                # Validate custom_product_ids exist in subscription plans
                subscription_plans = SubscriptionPlan.objects.filter(id__in=custom_product_ids, status='active')

                if not subscription_plans.exists():
                    return JsonResponse(
                        {
                            'error': 'No active subscription plans found for the provided custom_product_ids',
                            'custom_product_ids': custom_product_ids
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )

            except Exception as e:
                return JsonResponse(
                    {'error': f'Error getting subscription plan: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            
            # Generate tenant name and schema name from client name
            import re
            from django.utils.text import slugify
            
            # Create slugs from client name for schema and URL
            # Schema name can use underscores, URL suffix must use hyphens
            base_slug = slugify(client.client_name)
            schema_base = base_slug.replace('-', '_')
            url_base = base_slug
            
            schema_name = schema_base
            url_suffix = url_base
            
            # Make sure both schema_name and url_suffix are unique
            from ecomm_superadmin.models import Tenant
            counter = 1
            while (Tenant.objects.filter(schema_name=schema_name).exists() or 
                   Tenant.objects.filter(url_suffix=url_suffix).exists()):
                schema_name = f"{schema_base}_{counter}"
                url_suffix = f"{url_base}-{counter}"  # Use hyphen for URL suffix
                counter += 1
                
            logger.info(f"Generated tenant details - Schema: {schema_name}, URL Suffix: {url_suffix}")
            
            # Prepare tenant data with default values
            tenant_data = {
                'name': f"{client.client_name} Tenant",
                'schema_name': schema_name,
                'url_suffix': url_suffix,
                'environment': 'production',
                'status': 'active',
                'default_url': f"https://devstore.turtleit.in/store/{schema_name}/",
                'subscription_plan': custom_product_ids,
                'client_id': client.id,
                'admin_email': client.contact_person_email,
                'admin_first_name': first_name, 
                'admin_last_name': last_name,
                'admin_password': "India@123",  # Generate a random password
                'contact_email': client.contact_person_email,
                'created_by': 'system:order_processor'
            }          
            print("tenant_data:", tenant_data)
            # Create tenant using TenantSerializer
            from ecomm_superadmin.serializers import TenantSerializer
            from django.db import transaction
            from django.db.models.signals import post_save
            from ecomm_superadmin.models import Tenant
            
            serializer = TenantSerializer(data=tenant_data)
            if not serializer.is_valid():
                return JsonResponse(
                    {'error': 'Invalid tenant data', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # with transaction.atomic():
                    # Create the tenant

                tenant = serializer.save()
                logger.info(f"Created new tenant with schema: {schema_name}")
                
                # Create RabbitMQ queue for the new tenant
                try:
                    logger.info(f"Setting up RabbitMQ queue for tenant: {tenant.name} (id: {tenant.id})")
                    setup_tenant_rabbitmq_queue(tenant)
                    logger.info(f"Successfully set up RabbitMQ queue for tenant: {tenant.name}")
                except Exception as e:
                    logger.error(f"Error setting up RabbitMQ queue for tenant {tenant.name}: {str(e)}", exc_info=True)
                    # Don't fail the entire request if queue creation fails

               
                # Get applications based on subscription features
                try:
                    # Use the first subscription plan to get applications
                    if subscription_plans:
                        subscription = subscription_plans[0]
                        applications = self.get_application_from_subcriptions(subscription)
                        logger.info(f"Found {len(applications)} applications for subscription {subscription.id}")
                        
                        # Here you can process the applications as needed
                        # For example, you might want to create tenant-specific application records
                        # or perform additional setup based on the applications
                        
                        # Example: Store application information in tenant data
                        if applications:
                            # Update tenant with application information
                            if hasattr(tenant, 'applications'):
                                tenant.applications = [app['app_id'] for app in applications]
                                tenant.save(update_fields=['applications'])
                                logger.info(f"Updated tenant with {len(applications)} applications")
                    else:
                        logger.warning("No subscription plans found to fetch applications")
                        
                except Exception as e:
                    # Log the error but don't fail the entire process
                    logger.error(f"Error processing subscription applications: {str(e)}", exc_info=True)
                
                post_save.send(
                    sender=Tenant,
                    instance=tenant,
                    created=True,
                    raw=False,
                    using='default',
                    update_fields=None
                )


                subscriptions = []
                for plan in subscription_plans:
                    subscription = self.create_tenant_subscription(
                        tenant=tenant,
                        subscription_plan=plan,
                        client_id=client_id,
                        company_id=1,
                        created_by='system:order_processor'
                    )
                    subscriptions.append(subscription)
                
              
                
                # Get applications for the subscription
                applications = []
                if subscription_plans:
                    subscription = subscription_plans[0]
                    try:
                        applications = self.get_application_from_subcriptions(subscription)
                    except Exception as e:
                        logger.error(f"Error getting applications: {str(e)}", exc_info=True)
                        # Continue without failing the request
                
                # Prepare subscription data with applications
                subscription_data = []
                for sub in subscriptions:
                    # Get applications for this specific subscription
                    try:
                        sub_applications = self.get_application_from_subcriptions(sub.subscription_plan)
                        sub_apps = [
                            {
                                'app_id': app['app_id'],
                                'name': app['application_name'],
                                'url': app['app_default_url'].replace('{tenant_slug}', url_suffix) if app['app_default_url'] else None
                            }
                            for app in sub_applications
                        ]
                    except Exception as e:
                        logger.error(f"Error getting applications for subscription {sub.id}: {str(e)}", exc_info=True)
                        sub_apps = []
                    
                    subscription_data.append({
                        'id': sub.id,
                        'license_key': sub.license_key,
                        'status': sub.license_status,
                        'valid_from': sub.valid_from,
                        'valid_until': getattr(sub, 'valid_until', None),
                        'applications': sub_apps
                    })
                
                # Get all unique applications across all subscriptions
                all_applications = []
                seen_app_ids = set()
                for sub in subscription_data:
                    for app in sub.get('applications', []):
                        if app['app_id'] not in seen_app_ids:
                            all_applications.append(app)
                            seen_app_ids.add(app['app_id'])
                
                # Prepare success response
                result = {
                    'status': 'success',
                    'message': 'Tenant and subscription created successfully',
                    'tenant': {
                        'id': tenant.id,
                        'name': tenant.name,
                        'schema_name': schema_name,
                        'url_suffix': url_suffix
                    },
                    'subscriptions': subscription_data,
                }
                
            except Exception as e:
                # Log the error for debugging
                logger.error(f"Error creating tenant and subscription: {str(e)}", exc_info=True)
                return JsonResponse(
                    {'error': 'Failed to create tenant and subscription', 'details': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            # Prepare email context with all subscriptions and their applications
            email_context = {
                "user_name": client.client_name or "User",
                "user_email": client.contact_person_email,
                "default_password": "India@123",
                "tenant_name": tenant.name,
                "subscriptions": []
            }
            
            # Add subscription data with applications to email context
            for sub in subscription_data:
                subscription_info = {
                    "license_key": sub['license_key'],
                    "license_status": sub['status'],
                    "valid_from": sub['valid_from'].strftime("%Y-%m-%d"),
                    "valid_until": sub['valid_until'].strftime("%Y-%m-%d") if sub.get('valid_until') else None,
                    "applications": []
                }
                
                # Add application details for this subscription with tenant schema in URLs
                for app in sub.get('applications', []):
                    # Ensure URL ends with a slash and add tenant schema
                    app_url = (app['url'] or '').rstrip('/')
                    if app_url:
                        app_url = f"{app_url}/{schema_name}"
                    
                    # Fetch all portal entries for this application
                    portal_entries = []
                    try:
                        portals = TenantAppPortals.objects.filter(
                            tenant_id=tenant.id,
                            app_id=app['app_id']
                        )
                        
                        for portal in portals:
                            # Use custom_redirect_url if available, otherwise use redirect_url
                            portal_url = portal.custom_redirect_url if portal.custom_redirect_url else portal.redirect_url
                            
                            portal_entries.append({
                                "portal_name": portal.portal_name,
                                "portal_url": portal_url
                            })
                    except Exception as e:
                        logger.error(f"Error fetching portal entries for app {app['app_id']}: {str(e)}", exc_info=True)
                    
                    # If no portals found, still include the app with the default URL
                    if not portal_entries:
                        portal_entries = [{
                            "portal_name": "Default",
                            "portal_url": app_url
                        }]
                    
                    subscription_info["applications"].append({
                        "name": app['name'],
                        "url": app_url, # Keep for backward compatibility
                        "app_id": app['app_id'],
                        "portals": portal_entries
                    })
                
                email_context["subscriptions"].append(subscription_info)
            
            # Send welcome email with all subscription and application details
            try:
                send_email(
                    to_emails=client.contact_person_email,
                    # to_emails="manish@turtlesoftware.co",
                    subject=f"Welcome to Our Platform, {client.client_name or 'User'}!",
                    template_name="subscription_welcome",
                    template_context=email_context
                )
                logger.info("Welcome email sent successfully")
            except Exception as e:
                logger.error(f"Failed to send welcome email: {str(e)}", exc_info=True)
                # Don't fail the request if email sending fails
            return JsonResponse(
                result,
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            logger.error(f"Error processing order: {str(e)}", exc_info=True)
            return JsonResponse(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            # This is the cleaner way to reset the context
            connection.set_schema_to_public()
