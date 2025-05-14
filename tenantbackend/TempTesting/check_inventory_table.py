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

# Check inventory table structure
with schema_context(tenant.schema_name):
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'ecomm_inventory_inventory'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        
        print("Columns in ecomm_inventory_inventory table:")
        print('-' * 50)
        for col in columns:
            print(col[0])
