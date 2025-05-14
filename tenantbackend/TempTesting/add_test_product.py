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

def add_test_product():
    """Add a test product directly to the database."""
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
        print(f"Adding test product in tenant schema: {tenant.schema_name}")
        
        # Create a test product with all required fields
        with connection.cursor() as cursor:
            # First, let's check the table structure to understand all required fields
            cursor.execute("""
                SELECT column_name, is_nullable, data_type 
                FROM information_schema.columns 
                WHERE table_schema = %s 
                AND table_name = 'ecomm_product_product';
            """, [tenant.schema_name])
            
            columns = cursor.fetchall()
            print("\nTable structure for ecomm_product_product:")
            for column in columns:
                print(f"Column: {column[0]}, Nullable: {column[1]}, Type: {column[2]}")
            
            # Now insert a test product with all required fields
            try:
                cursor.execute("""
                    INSERT INTO ecomm_product_product (
                        name, sku, slug, description, short_description, 
                        price, product_type, manage_stock, stock_quantity, low_stock_threshold, is_in_stock,
                        is_active, is_featured, is_serialized, is_lotted,
                        client_id, company_id, created_at, updated_at
                    ) VALUES (
                        'Test Product 1', 'TP001', 'test-product-1', 
                        'Test product for inventory management', 'Test product',
                        100.00, 'simple', TRUE, 0, 5, TRUE,
                        TRUE, TRUE, FALSE, FALSE,
                        1, 1, NOW(), NOW()
                    )
                    RETURNING id;
                """)
                
                product_id = cursor.fetchone()[0]
                print(f"\nCreated product with ID: {product_id}")
                
                # Create a location if it doesn't exist
                cursor.execute("""
                    INSERT INTO ecomm_inventory_fulfillmentlocation (
                        name, address, is_active, client_id, company_id
                    ) VALUES (
                        'Main Warehouse', '123 Warehouse St, Mumbai', TRUE, 1, 1
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                """)
                
                location_result = cursor.fetchone()
                if location_result:
                    location_id = location_result[0]
                    print(f"Created location with ID: {location_id}")
                else:
                    cursor.execute("SELECT id FROM ecomm_inventory_fulfillmentlocation LIMIT 1;")
                    location_id = cursor.fetchone()[0]
                    print(f"Using existing location with ID: {location_id}")
                
                # Create an adjustment reason if it doesn't exist
                cursor.execute("""
                    INSERT INTO ecomm_inventory_adjustmentreason (
                        name, description, adjustment_type, is_active, client_id, company_id
                    ) VALUES (
                        'Initial Stock', 'Initial inventory setup', 'ADD', TRUE, 1, 1
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                """)
                
                reason_result = cursor.fetchone()
                if reason_result:
                    reason_id = reason_result[0]
                    print(f"Created adjustment reason with ID: {reason_id}")
                else:
                    cursor.execute("SELECT id FROM ecomm_inventory_adjustmentreason LIMIT 1;")
                    reason_id = cursor.fetchone()[0]
                    print(f"Using existing adjustment reason with ID: {reason_id}")
                
                # Create inventory table if it doesn't exist
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
                
                # Create inventory record
                cursor.execute("""
                    INSERT INTO ecomm_inventory_inventory (
                        quantity, available_quantity, product_id, location_id, client_id, company_id
                    ) VALUES (
                        0, 0, %s, %s, 1, 1
                    )
                    ON CONFLICT (product_id, location_id) DO NOTHING
                    RETURNING id;
                """, [product_id, location_id])
                
                inventory_result = cursor.fetchone()
                if inventory_result:
                    inventory_id = inventory_result[0]
                    print(f"Created inventory record with ID: {inventory_id}")
                else:
                    print(f"Inventory record already exists for product ID: {product_id}")
                
                print("\nAPI Endpoints to use:")
                print("\n1. Add Inventory API:")
                print("POST http://localhost:8000/api/yash/inventory/inventory/add_inventory/")
                print("Headers:")
                print("  Content-Type: application/json")
                print("  Authorization: Bearer YOUR_JWT_TOKEN")
                print("Body:")
                print(f"""{{
  "product_id": {product_id},
  "location_id": {location_id},
  "quantity": 100,
  "adjustment_reason_id": {reason_id},
  "notes": "Initial inventory setup"
}}""")
                
            except Exception as e:
                print(f"Error creating product: {str(e)}")
                # Print the SQL that would have been executed
                print("\nTrying to create product with minimal fields...")
                try:
                    cursor.execute("""
                        INSERT INTO ecomm_product_product (
                            name, sku, slug, product_type, manage_stock, stock_quantity, low_stock_threshold, is_in_stock,
                            is_active, is_featured, is_serialized, is_lotted,
                            client_id, company_id, created_at, updated_at
                        ) VALUES (
                            'Test Product 1', 'TP001', 'test-product-1', 
                            'simple', TRUE, 0, 5, TRUE,
                            TRUE, TRUE, FALSE, FALSE,
                            1, 1, NOW(), NOW()
                        )
                        RETURNING id;
                    """)
                    
                    product_id = cursor.fetchone()[0]
                    print(f"Created product with ID: {product_id} using minimal fields")
                except Exception as e:
                    print(f"Error creating product with minimal fields: {str(e)}")

if __name__ == "__main__":
    add_test_product()
