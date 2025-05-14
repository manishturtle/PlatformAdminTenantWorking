"""
Signal handlers for the ecomm_superadmin app
"""
import logging
import requests
from django.db import connection
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.management import call_command
from .models import Tenant, Domain, Application
from django.conf import settings
from django.utils.text import slugify
from .app_utils import call_app_schema_endpoints
from django.db import connection

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Tenant)
def create_tenant_schema(sender, instance, created, **kwargs):
    """
    Signal handler to create a tenant schema and run migrations when a new Tenant is created
    """
    if created:
        logger.info(f"New tenant created: {instance.name} (schema: {instance.schema_name})")

        # Create Domain entry if it doesn't exist
        try:
            domain_model = Domain()
            domain = getattr(settings, 'TENANT_DEFAULT_DOMAIN', 'localhost')
            domain_model.domain = domain
            domain_model.tenant = instance
            domain_model.folder = instance.schema_name
            domain_model.is_primary = True
            domain_model.save()

            # Call schema endpoints for all associated applications
            try:
                results = call_app_schema_endpoints(instance.id)
                for result in results:
                    if not result['success']:
                        logger.error(f"Failed to initialize schema for app {result['app_name']}: {result['response']}")
                    else:
                        logger.info(f"Successfully initialized schema for app {result['app_name']}")
            except Exception as e:
                logger.error(f"Error calling app schema endpoints for tenant {instance.name}: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating Domain entry: {str(e)}")

        # Store current schema
        current_schema = connection.schema_name

        try:
            # ✅ STEP 1: Create schema in database
            logger.info(f"Creating schema for tenant: {instance.schema_name}")
            instance.create_schema(check_if_exists=True)

            # ✅ STEP 2: Run migrations for the tenant schema
            logger.info(f"Running migrations for tenant: {instance.name}")
            call_command('migrate', schema_name=instance.schema_name, interactive=False)
            logger.info(f"Successfully migrated schema '{instance.schema_name}'")

            # ✅ STEP 3: Call schema migration endpoints for all associated applications
            try:
                # Get applications based on tenant's subscription plan
                logger.info(f"Checking subscription plan for tenant '{instance.name}'")
                
                if not instance.subscription_plan_id:
                    logger.warning(f"No subscription plan ID found for tenant '{instance.name}'")
                    return
                    
                logger.info(f"Found subscription plan ID: {instance.subscription_plan_id} for tenant '{instance.name}'")
                
                # Get applications through subscription plan features
                try:
                    # Get feature IDs from plan_feature_entitlements table
                    cursor = connection.cursor()
                    try:
                        cursor.execute("""
                            SELECT feature_id 
                            FROM public.plan_feature_entitlements 
                            WHERE plan_id = %s
                        """, [instance.subscription_plan_id])
                        feature_ids = [row[0] for row in cursor.fetchall()]
                    finally:
                        cursor.close()
                    
                    logger.info(f"Found feature IDs from plan_feature_entitlements: {feature_ids}")
                    
                    if not feature_ids:
                        logger.warning(f"No features found for subscription plan ID {instance.subscription_plan_id}")
                        return
                    
                    # Get app IDs from features table
                    cursor = connection.cursor()
                    try:
                        cursor.execute("""
                            SELECT DISTINCT app_id 
                            FROM public.features 
                            WHERE id = ANY(%s::int[])
                        """, [feature_ids])
                        app_ids = [row[0] for row in cursor.fetchall()]
                    finally:
                        cursor.close()
                        
                    logger.info(f"Found app IDs from features: {app_ids}")
                    logger.info(f"Found app IDs: {list(app_ids)}")
                    
                    # Get applications
                    applications = Application.objects.filter(app_id__in=app_ids)
                    
                    logger.info(f"Found {applications.count()} applications for the features")
                    
                    if not applications.exists():
                        logger.warning(f"No applications found for tenant '{instance.name}' with subscription plan ID {instance.subscription_plan_id}")
                        return
                    
                    # Log each application found
                    for app in applications:
                        logger.info(f"Found application: {app.application_name} (ID: {app.app_id})")
                        
                except ImportError as e:
                    logger.error(f"Failed to import subscription models: {str(e)}")
                    return
                except SubscriptionPlan.DoesNotExist:
                    logger.error(f"Subscription plan with ID {instance.subscription_plan_id} does not exist")
                    return
                except Exception as e:
                    logger.error(f"Error getting subscription data: {str(e)}")
                    return
                for app in applications:
                    # Validate backend URL and endpoint
                    if not app.app_backend_url:
                        logger.error(f"Missing backend URL for app {app.application_name}")
                        continue
                    if not app.migrate_schema_endpoint:
                        logger.error(f"Missing schema endpoint for app {app.application_name}")
                        continue

                    try:
                        # Clean and validate URLs
                        base_url = app.app_backend_url.strip().rstrip('/')
                        endpoint = app.migrate_schema_endpoint.strip().strip('/')
                        
                        if not base_url.startswith(('http://', 'https://')):
                            base_url = f'http://{base_url}'
                        
                        # Construct the full URL
                        url = f"{base_url}/{endpoint}/"
                        
                        logger.info(f"Attempting to call schema migration for app '{app.application_name}' at URL: {url}")
                        
                        # Make the API call with timeout
                        response = requests.post(
                            url=url,
                            json={
                                "tenant_schema": instance.schema_name,
                                "tenant_id": instance.id,
                                "app_id": app.app_id
                            },
                            headers={
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            timeout=30  # 30 seconds timeout
                        )
                        
                        response.raise_for_status()  # Raise exception for 4XX/5XX status codes
                        
                        logger.info(f"Successfully migrated schema for app '{app.application_name}' at {url}")
                            
                    except requests.Timeout:
                        logger.error(f"Timeout while calling schema migration for app '{app.application_name}' at {url}")
                    except requests.ConnectionError:
                        logger.error(f"Connection error while calling schema migration for app '{app.application_name}' at {url}. Please check if the service is running.")
                    except requests.RequestException as app_error:
                        logger.error(f"Failed to call schema migration for app '{app.application_name}' at {url}: {str(app_error)}")
                        
            except Exception as e:
                logger.error(f"Error processing application schema migrations: {str(e)}")

        except Exception as e:
            logger.error(f"Error setting up tenant schema: {str(e)}")
        finally:
            # Restore the original schema
            if current_schema == 'public':
                connection.set_schema_to_public()
            else:
                try:
                    tenant = Tenant.objects.get(schema_name=current_schema)
                    connection.set_tenant(tenant)
                except Tenant.DoesNotExist:
                    connection.set_schema_to_public()
