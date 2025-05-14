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
TENANT_SLUG = 'man'

def check_inventory_structure():
    """Check the structure of inventory tables in the specified tenant schema."""
    # Get the tenant
    try:
        tenant = get_tenant_by_slug(TENANT_SLUG)
        if not tenant:
            print(f"Tenant '{TENANT_SLUG}' not found. Please create the tenant first.")
            return
        print(f"Using tenant: {tenant.schema_name}")
    except Exception as e:
        print(f"Error getting tenant: {str(e)}")
        return
    
    # Use schema_context to ensure all operations happen in the tenant's schema
    with schema_context(tenant.schema_name):
        print(f"Checking inventory table structure in tenant schema: {tenant.schema_name}")
        
        # Check if inventory table exists and its structure
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_inventory_inventory'
                );
            """, [tenant.schema_name])
            
            inventory_exists = cursor.fetchone()[0]
            
            if inventory_exists:
                print("ecomm_inventory_inventory table exists. Checking columns...")
                cursor.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_inventory_inventory'
                    ORDER BY ordinal_position;
                """, [tenant.schema_name])
                
                columns = cursor.fetchall()
                print("Columns in ecomm_inventory_inventory:")
                for col in columns:
                    print(f"Column: {col[0]}, Type: {col[1]}, Nullable: {col[2]}")
            else:
                print("ecomm_inventory_inventory table does not exist.")

if __name__ == "__main__":
    check_inventory_structure()
