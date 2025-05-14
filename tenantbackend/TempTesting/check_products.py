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

# Check products
with schema_context(tenant.schema_name):
    with connection.cursor() as cursor:
        cursor.execute('SELECT id, name, sku, is_serialized FROM ecomm_product_product')
        results = cursor.fetchall()
        
        print('ID | Name | SKU | Is Serialized')
        print('-' * 50)
        for row in results:
            print(f'{row[0]} | {row[1]} | {row[2]} | {row[3]}')
