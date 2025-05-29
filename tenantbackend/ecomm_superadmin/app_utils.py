import requests
import logging
from django.conf import settings
from django.db import connection
from .models import (
    Tenant, 
    Application, 
    TenantApplication, 
    TenantSubscriptionLicenses
)

logger = logging.getLogger(__name__)

def get_subscription_apps(tenant_id):
    """
    Get all applications associated with a tenant's subscription plans.
    """
    try:
        tenant = Tenant.objects.get(id=tenant_id)
        
        # Get active subscription licenses for the tenant
        subscriptions = TenantSubscriptionLicenses.objects.filter(
            tenant=tenant,
            license_status='active'
        ).select_related('subscription_plan')
        
        if not subscriptions.exists():
            logger.error(f"No active subscription plans found for tenant {tenant.name}")
            return []

        # Get feature IDs from all subscription plans
        cursor = connection.cursor()
        try:
            plan_ids = [sub.subscription_plan_id for sub in subscriptions]
            placeholders = ','.join(['%s'] * len(plan_ids))
            cursor.execute(f"""
                SELECT DISTINCT feature_id 
                FROM public.plan_feature_entitlements 
                WHERE plan_id IN ({placeholders})
            """, plan_ids)
            feature_ids = [row[0] for row in cursor.fetchall()]
        finally:
            cursor.close()

        if not feature_ids:
            logger.warning(f"No features found in subscription plans for tenant {tenant.name}")
            return []

        # Get all applications associated with the features from all subscription plans
        applications = Application.objects.filter(
            tenant_applications__tenant=tenant,
            tenant_applications__is_active=True,
            app_features__feature_id__in=feature_ids
        ).distinct()
        
        return applications
    except Tenant.DoesNotExist:
        logger.error(f"Tenant with ID {tenant_id} not found")
        return []
    except Exception as e:
        logger.error(f"Error getting subscription apps: {str(e)}")
        return []

def call_app_schema_endpoints(tenant_id):
    """
    Call the schema migration endpoint for each application associated with the tenant.
    """
    applications = get_subscription_apps(tenant_id)
    results = []

    for app in applications:
        if not app.app_backend_url or not app.migrate_schema_endpoint:
            logger.warning(f"Missing backend URL or schema endpoint for app {app.application_name}")
            continue

        try:
            # Construct the full URL
            url = f"{app.app_backend_url.rstrip('/')}/{app.migrate_schema_endpoint.lstrip('/')}"
            
            # Make the API call
            response = requests.post(
                url,
                json={"tenant_id": tenant_id},
                headers={"Content-Type": "application/json"}
            )
            
            result = {
                "app_name": app.application_name,
                "url": url,
                "status": response.status_code,
                "success": response.status_code in (200, 201, 202),
                "response": response.json() if response.status_code in (200, 201, 202) else str(response.content)
            }
            
            results.append(result)
            
            if not result["success"]:
                logger.error(f"Failed to call schema endpoint for app {app.application_name}: {result['response']}")
                
        except Exception as e:
            logger.error(f"Error calling schema endpoint for app {app.application_name}: {str(e)}")
            results.append({
                "app_name": app.application_name,
                "url": url,
                "status": 500,
                "success": False,
                "response": str(e)
            })

    return results
