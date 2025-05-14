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

def create_missing_tables():
    """Create missing tables in the specified tenant schema."""
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
        print(f"Creating missing tables in tenant schema: {tenant.schema_name}")
        
        # Create inventory table if it doesn't exist
        with connection.cursor() as cursor:
            # Check if inventory table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_inventory_inventory'
                );
            """, [tenant.schema_name])
            
            inventory_exists = cursor.fetchone()[0]
            
            if not inventory_exists:
                print("Creating ecomm_inventory_inventory table...")
                cursor.execute("""
                    CREATE TABLE ecomm_inventory_inventory (
                        id SERIAL PRIMARY KEY,
                        quantity INTEGER NOT NULL,
                        available_quantity INTEGER NOT NULL DEFAULT 0,
                        reserved_quantity INTEGER NOT NULL DEFAULT 0,
                        product_id INTEGER NOT NULL,
                        location_id INTEGER NOT NULL,
                        client_id INTEGER,
                        company_id INTEGER DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by VARCHAR(255),
                        updated_by VARCHAR(255),
                        CONSTRAINT unique_product_location UNIQUE (product_id, location_id)
                    );
                """)
                print("Inventory table created successfully.")
            else:
                print("Inventory table already exists.")
                
        # Create category table if it doesn't exist
        with connection.cursor() as cursor:
            # Check if category table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_product_category'
                );
            """, [tenant.schema_name])
            
            category_exists = cursor.fetchone()[0]
            
            if not category_exists:
                print("Creating ecomm_product_category table...")
                cursor.execute("""
                    CREATE TABLE ecomm_product_category (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        slug VARCHAR(100) UNIQUE NOT NULL,
                        description TEXT,
                        parent_id INTEGER,
                        image VARCHAR(100),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        client_id INTEGER,
                        company_id INTEGER DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by VARCHAR(255),
                        updated_by VARCHAR(255)
                    );
                """)
                print("Category table created successfully.")
            else:
                print("Category table already exists.")
                
        # Create brand table if it doesn't exist
        with connection.cursor() as cursor:
            # Check if brand table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_product_brand'
                );
            """, [tenant.schema_name])
            
            brand_exists = cursor.fetchone()[0]
            
            if not brand_exists:
                print("Creating ecomm_product_brand table...")
                cursor.execute("""
                    CREATE TABLE ecomm_product_brand (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        slug VARCHAR(100) UNIQUE NOT NULL,
                        description TEXT,
                        logo VARCHAR(100),
                        website VARCHAR(200),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        client_id INTEGER,
                        company_id INTEGER DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by VARCHAR(255),
                        updated_by VARCHAR(255)
                    );
                """)
                print("Brand table created successfully.")
            else:
                print("Brand table already exists.")
                
        # Insert sample data
        print("Inserting sample data...")
        
        # Insert category if it doesn't exist
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO ecomm_product_category (name, slug, description, is_active, client_id, company_id)
                VALUES ('General', 'general', 'General product category', TRUE, 1, 1)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id;
            """)
            category_id = cursor.fetchone()
            if category_id:
                print(f"Category created with ID: {category_id[0]}")
            else:
                cursor.execute("SELECT id FROM ecomm_product_category WHERE slug = 'general';")
                category_id = cursor.fetchone()
                print(f"Category already exists with ID: {category_id[0]}")
                
        # Insert brand if it doesn't exist
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO ecomm_product_brand (name, slug, description, is_active, client_id, company_id)
                VALUES ('Test Brand', 'test-brand', 'Test brand for products', TRUE, 1, 1)
                ON CONFLICT (slug) DO NOTHING
                RETURNING id;
            """)
            brand_id = cursor.fetchone()
            if brand_id:
                print(f"Brand created with ID: {brand_id[0]}")
            else:
                cursor.execute("SELECT id FROM ecomm_product_brand WHERE slug = 'test-brand';")
                brand_id = cursor.fetchone()
                print(f"Brand already exists with ID: {brand_id[0]}")
                
        # Get product IDs
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM ecomm_product_product LIMIT 3;")
            products = cursor.fetchall()
            print(f"Found {len(products)} products:")
            for product in products:
                print(f"  - Product ID: {product[0]}, Name: {product[1]}")
                
        # Get location ID
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM ecomm_inventory_fulfillmentlocation LIMIT 1;")
            location = cursor.fetchone()
            if location:
                print(f"Found location: ID: {location[0]}, Name: {location[1]}")
            else:
                cursor.execute("""
                    INSERT INTO ecomm_inventory_fulfillmentlocation (name, address, is_active, client_id, company_id)
                    VALUES ('Main Warehouse', '123 Warehouse Street, Mumbai', TRUE, 1, 1)
                    RETURNING id;
                """)
                location = cursor.fetchone()
                print(f"Created location with ID: {location[0]}")
                
        # Get adjustment reason ID
        with connection.cursor() as cursor:
            cursor.execute("SELECT id, name FROM ecomm_inventory_adjustmentreason LIMIT 1;")
            reason = cursor.fetchone()
            if reason:
                print(f"Found adjustment reason: ID: {reason[0]}, Name: {reason[1]}")
            else:
                cursor.execute("""
                    INSERT INTO ecomm_inventory_adjustmentreason (name, description, adjustment_type, is_active, client_id, company_id)
                    VALUES ('Initial Stock', 'Initial inventory receipt', 'ADD', TRUE, 1, 1)
                    RETURNING id;
                """)
                reason = cursor.fetchone()
                print(f"Created adjustment reason with ID: {reason[0]}")
                
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
    create_missing_tables()
