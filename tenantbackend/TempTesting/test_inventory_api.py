import requests
import json
import os
import django

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

# API endpoint
url = f'http://localhost:8000/api/{TENANT_SLUG}/inventory/inventory/add_inventory/'

# Headers
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQzODQ5ODc3LCJpYXQiOjE3NDM3NjM0NzcsImp0aSI6IjZhZmM2MThjZDQ1NjRmYTliM2ZjZWUxOTU5ODUwZmUyIiwidXNlcl9pZCI6MX0.DOBSa6DwCPkfyu1ClNbExPi-XB3V0a6zvoiqAkSCKyQ',
    'Cookie': 'csrftoken=5pEi5isVebxfyXH3y4J8nLZQ11WikG0l; sessionid=8i2lq7b7n5hvyf90tlsye89gnbzp1bzn'
}

# Get tenant
tenant = get_tenant_by_slug(TENANT_SLUG)
if not tenant:
    print(f"Tenant '{TENANT_SLUG}' not found.")
    exit(1)

# Use a non-serialized product (Office Chair, ID 3)
product_id = 3
product_is_serialized = False
with schema_context(tenant.schema_name):
    with connection.cursor() as cursor:
        cursor.execute("SELECT is_serialized FROM ecomm_product_product WHERE id = %s", [product_id])
        result = cursor.fetchone()
        if result:
            product_is_serialized = result[0]
            print(f"Product {product_id} is_serialized: {product_is_serialized}")
        else:
            print(f"Product {product_id} not found.")
            exit(1)

# Request data
data = {
    "product_id": product_id,
    "location_id": 1,
    "stock_quantity": 1 if product_is_serialized else 50,  # Using stock_quantity instead of quantity
    "adjustment_reason_id": 1,  # Using a valid adjustment reason ID
    "notes": "Initial stock for new product"
}

# Add serial number if product is serialized
if product_is_serialized:
    # For serialized products, we need to provide a serial number
    data["serial_number"] = f"SN-{product_id}-{TENANT_SLUG}-001"  # Generate a unique serial number
    print(f"Adding serial number: {data['serial_number']}")

# Make the request
try:
    response = requests.post(url, headers=headers, json=data)
    
    # Print response status and content
    print(f"Status Code: {response.status_code}")
    print("Response Headers:")
    print(json.dumps(dict(response.headers), indent=2))
    print("\nResponse Body:")
    
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
        
except Exception as e:
    print(f"Error: {str(e)}")
