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

def create_products():
    """Create products in the specified tenant schema."""
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
        print(f"Creating products in tenant schema: {tenant.schema_name}")
        
        # Get category and brand IDs
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM ecomm_product_category WHERE slug = 'general';")
            category_id = cursor.fetchone()[0]
            
            cursor.execute("SELECT id FROM ecomm_product_brand WHERE slug = 'test-brand';")
            brand_id = cursor.fetchone()[0]
            
            print(f"Using category ID: {category_id}, brand ID: {brand_id}")
            
            # Create products
            for i in range(1, 4):
                sku = f"TP00{i}"
                name = f"Test Product {i}"
                
                # Check if product already exists
                cursor.execute("SELECT id FROM ecomm_product_product WHERE sku = %s;", [sku])
                product = cursor.fetchone()
                
                if not product:
                    # Create a slug from the name (lowercase with hyphens)
                    slug = name.lower().replace(' ', '-')
                    
                    cursor.execute("""
                        INSERT INTO ecomm_product_product (
                            name, sku, slug, description, short_description, price, 
                            category_id, brand_id, is_active, is_featured, 
                            client_id, company_id, created_at, updated_at, product_type
                        )
                        VALUES (
                            %s, %s, %s, %s, %s, %s, 
                            %s, %s, %s, %s, 
                            %s, %s, NOW(), NOW(), %s
                        )
                        RETURNING id;
                    """, [
                        name, sku, slug, f"Test product {i} for inventory management", 
                        f"Test product {i}", 100.00 * i, 
                        category_id, brand_id, True, i == 1, 
                        1, 1, 'simple'  # Using 'simple' as the product type
                    ])
                    product_id = cursor.fetchone()[0]
                    print(f"Created product: {name} (ID: {product_id})")
                else:
                    print(f"Product {name} already exists with ID: {product[0]}")
        
        # Get product IDs
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM ecomm_product_product;")
            products = cursor.fetchall()
            print(f"\nFound {len(products)} products:")
            for product in products:
                print(f"  - Product ID: {product[0]}, Name: {product[1]}")
                
        # Get location ID
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM ecomm_inventory_fulfillmentlocation LIMIT 1;")
            location = cursor.fetchone()
            print(f"Using location: ID: {location[0]}, Name: {location[1]}")
                
        # Get adjustment reason ID
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM ecomm_inventory_adjustmentreason LIMIT 1;")
            reason = cursor.fetchone()
            print(f"Using adjustment reason: ID: {reason[0]}, Name: {reason[1]}")
                
        # Create inventory records for each product
        if products and location:
            for product in products:
                with connection.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO ecomm_inventory_inventory (quantity, available_quantity, product_id, location_id, client_id, company_id)
                        VALUES (0, 0, %s, %s, 1, 1)
                        ON CONFLICT (product_id, location_id) DO NOTHING
                        RETURNING id;
                    """, [product[0], location[0]])
                    inventory = cursor.fetchone()
                    if inventory:
                        print(f"Created inventory record with ID: {inventory[0]} for product ID: {product[0]}")
                    else:
                        print(f"Inventory record already exists for product ID: {product[0]}")
                        
        print("\nAPI Endpoints to use:")
        print("\n1. Add Inventory API:")
        print("POST http://localhost:8000/api/yash/inventory/inventory/add_inventory/")
        print("Headers:")
        print("  Content-Type: application/json")
        print("  Authorization: Bearer YOUR_JWT_TOKEN")
        print("Body:")
        if products and location and reason:
            print(f"""{{
  "product_id": {products[0][0]},
  "location_id": {location[0]},
  "quantity": 100,
  "adjustment_reason_id": {reason[0]},
  "notes": "Initial inventory setup"
}}""")
        else:
            print("""{{
  "product_id": 1,
  "location_id": 1,
  "quantity": 100,
  "adjustment_reason_id": 1,
  "notes": "Initial inventory setup"
}}""")

if __name__ == "__main__":
    create_products()
