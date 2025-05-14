import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')
django.setup()

# Import necessary models
from django_tenants.utils import schema_context
from ecomm_tenant.tenant_utils import get_tenant_by_slug
from django.db import connection

# Tenant slug to use
TENANT_SLUG = 'man'

# Get tenant
tenant = get_tenant_by_slug(TENANT_SLUG)
if not tenant:
    print(f"Tenant '{TENANT_SLUG}' not found.")
    exit(1)

# Fix inventory table structure
with schema_context(tenant.schema_name):
    with connection.cursor() as cursor:
        # First, check for duplicate columns
        cursor.execute("""
            SELECT column_name, COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'ecomm_inventory_inventory'
            GROUP BY column_name
            HAVING COUNT(*) > 1
        """)
        duplicates = cursor.fetchall()
        
        if duplicates:
            print("Found duplicate columns:")
            for col in duplicates:
                print(f"Column '{col[0]}' appears {col[1]} times")
            
            # Fix the duplicates by renaming them
            for col_name, count in duplicates:
                # We'll rename all but one of the duplicates
                for i in range(1, count):
                    try:
                        cursor.execute(f"""
                            ALTER TABLE ecomm_inventory_inventory 
                            DROP COLUMN IF EXISTS {col_name}_{i}
                        """)
                        print(f"Dropped duplicate column {col_name}_{i}")
                    except Exception as e:
                        print(f"Error dropping column {col_name}_{i}: {e}")
        else:
            print("No duplicate columns found.")
        
        # Now check the structure again
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ecomm_inventory_inventory'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        
        print("\nCurrent columns in ecomm_inventory_inventory table:")
        print('-' * 50)
        for col in columns:
            print(col[0])
