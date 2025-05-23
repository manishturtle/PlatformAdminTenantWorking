import logging
import requests
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import connection
from django.conf import settings
from .models import Order, Application
from .services import EcommerceOrderProcessingService

logger = logging.getLogger(__name__)

@receiver(post_save, sender=Order)
def process_app_migrations_for_order(sender, instance, created, **kwargs):
    """
    Signal handler to run app migrations for all apps associated with the order's subscription plan
    after the order is processed successfully.
    """
    if not created or not instance.is_processed:
        return

    logger.info(f"Processing app migrations for order: {instance.order_id}")
    
    try:
        # Get the tenant from the order
        tenant = instance.tenant
        if not tenant:
            logger.error(f"No tenant found for order {instance.order_id}")
            return

        # Store current schema
        current_schema = connection.schema_name

        try:
            # Get subscription plan ID from the order
            subscription_plan_id = instance.subscription_plan_id
            if not subscription_plan_id:
                logger.warning(f"No subscription plan ID found for order {instance.order_id}")
                return

            logger.info(f"Found subscription plan ID: {subscription_plan_id} for order {instance.order_id}")

            # Get applications through subscription plan features
            try:
                # Get feature IDs from plan_feature_entitlements table
                cursor = connection.cursor()
                try:
                    cursor.execute("""
                        SELECT feature_id 
                        FROM public.plan_feature_entitlements 
                        WHERE plan_id = %s
                    """, [subscription_plan_id])
                    feature_ids = [row[0] for row in cursor.fetchall()]
                finally:
                    cursor.close()

                logger.info(f"Found feature IDs from plan_feature_entitlements: {feature_ids}")

                if not feature_ids:
                    logger.warning(f"No features found for subscription plan ID {subscription_plan_id}")
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

                # Get applications
                applications = Application.objects.filter(app_id__in=app_ids)
                logger.info(f"Found {applications.count()} applications for the features")

                if not applications.exists():
                    logger.warning(f"No applications found for order {instance.order_id}")
                    return

                # Process migrations for each application
                for app in applications:
                    logger.info(f"Processing migrations for app: {app.application_name} (ID: {app.app_id})")

                    # Validate backend URL and endpoint
                    if not app.app_backend_url or not app.migrate_schema_endpoint:
                        logger.error(f"Missing backend URL or schema endpoint for app {app.application_name}")
                        continue

                    try:
                        # Clean and validate URLs
                        base_url = app.app_backend_url.strip().rstrip('/')
                        endpoint = app.migrate_schema_endpoint.strip().strip('/')

                        if not base_url.startswith(('http://', 'https://')):
                            base_url = f'http://{base_url}'

                        # Construct the full URL
                        url = f"{base_url}/{endpoint}/"

                        logger.info(f"Calling schema migration for app '{app.application_name}' at URL: {url}")

                        # Make the API call with timeout
                        response = requests.post(
                            url=url,
                            json={
                                "tenant_schema": tenant.schema_name,
                                "tenant_id": tenant.id,
                                "app_id": app.app_id,
                                "order_id": instance.order_id
                            },
                            headers={
                                "Content-Type": "application/json",
                                "Accept": "application/json"
                            },
                            timeout=30
                        )

                        response.raise_for_status()
                        logger.info(f"Successfully migrated schema for app '{app.application_name}'")

                    except requests.Timeout:
                        logger.error(f"Timeout while calling schema migration for app '{app.application_name}' at {url}")
                    except requests.ConnectionError:
                        logger.error(f"Connection error while calling schema migration for app '{app.application_name}' at {url}")
                    except requests.RequestException as e:
                        logger.error(f"Failed to call schema migration for app '{app.application_name}': {str(e)}")

            except Exception as e:
                logger.error(f"Error getting subscription data: {str(e)}")
                return

        finally:
            # Restore the original schema
            if current_schema == 'public':
                connection.set_schema_to_public()
            else:
                try:
                    connection.set_schema(current_schema)
                except Exception:
                    connection.set_schema_to_public()

    except Exception as e:
        logger.error(f"Error processing app migrations for order {instance.order_id}: {str(e)}")
