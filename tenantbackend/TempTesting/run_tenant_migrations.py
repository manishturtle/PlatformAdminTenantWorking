import os
import django
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')
django.setup()

# Import necessary models
from django_tenants.utils import schema_context
from ecomm_superadmin.models import Tenant, Domain
from ecomm_tenant.tenant_utils import get_tenant_by_slug
from django.core.management import call_command

# Tenant slug to use
TENANT_SLUG = 'yash'

def run_tenant_migrations():
    """Run migrations for the specified tenant schema."""
    # Get the tenant
    try:
        tenant = get_tenant_by_slug(TENANT_SLUG)
        if not tenant:
            print(f"Tenant '{TENANT_SLUG}' not found. Please create the tenant first.")
            return
        print(f"Using existing tenant: {tenant.schema_name}")
    except Exception as e:
        print(f"Error getting tenant: {str(e)}")
        return
    
    # Use schema_context to ensure all operations happen in the tenant's schema
    with schema_context(tenant.schema_name):
        print(f"Running migrations in tenant schema: {tenant.schema_name}")
        
        # Run migrations for the product and inventory apps
        try:
            print("Running migrations for ecomm_product app...")
            call_command('migrate', 'ecomm_product', verbosity=1)
            
            print("Running migrations for ecomm_inventory app...")
            call_command('migrate', 'ecomm_inventory', verbosity=1)
            
            print("Migrations completed successfully.")
        except Exception as e:
            print(f"Error running migrations: {str(e)}")

if __name__ == "__main__":
    run_tenant_migrations()
