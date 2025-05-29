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

        # Store current schema
        current_schema = connection.schema_name

        try:
            # Create Domain entry if it doesn't exist
            domain_model = Domain()
            base_domain = getattr(settings, 'TENANT_DEFAULT_DOMAIN', 'localhost')
            
            # Create unique domain by combining base domain and schema name
            if base_domain == 'localhost':
                domain = f"{instance.schema_name}.{base_domain}"
            else:
                # For production domains, create subdomain
                domain = f"{instance.schema_name}.{base_domain}"
            
            # Check if domain already exists
            if not Domain.objects.filter(domain=domain).exists():
                domain_model.domain = domain
                domain_model.tenant = instance
                domain_model.folder = instance.schema_name
                domain_model.is_primary = True
                domain_model.save()
                logger.info(f"Created domain {domain} for tenant {instance.name}")
            else:
                logger.warning(f"Domain {domain} already exists, skipping creation")

            # ✅ STEP 1: Create schema in database
            logger.info(f"Creating schema for tenant: {instance.schema_name}")
            instance.create_schema(check_if_exists=True)

            # ✅ STEP 2: Run migrations for the tenant schema
            logger.info(f"Running migrations for tenant: {instance.name}")
            call_command('migrate', schema_name=instance.schema_name, interactive=False)
            logger.info(f"Successfully migrated schema '{instance.schema_name}'")

            # ✅ STEP 3: Skip app migrations for new tenants
            logger.info(f"Skipping app schema migrations for new tenant {instance.name} - will be handled by serializer")

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
