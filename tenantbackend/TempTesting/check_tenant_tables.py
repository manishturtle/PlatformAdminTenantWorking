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
from django.db import connection

# Tenant slug to use
TENANT_SLUG = 'yash'

def check_tenant_tables():
    """Check if tables exist in the specified tenant schema."""
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
        print(f"Checking tables in tenant schema: {tenant.schema_name}")
        
        # Tables to check
        tables_to_check = [
            'ecomm_product_category',
            'ecomm_product_brand',
            'ecomm_product_product',
            'ecomm_inventory_fulfillmentlocation',
            'ecomm_inventory_adjustmentreason',
            'ecomm_inventory_inventory'
        ]
        
        # Check if tables exist
        with connection.cursor() as cursor:
            for table in tables_to_check:
                cursor.execute(f"""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = %s
                        AND table_name = %s
                    );
                """, [tenant.schema_name, table])
                
                exists = cursor.fetchone()[0]
                print(f"Table {table}: {'EXISTS' if exists else 'DOES NOT EXIST'}")

if __name__ == "__main__":
    check_tenant_tables()
