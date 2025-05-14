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

def create_inventory_table():
    """Create the inventory table in the specified tenant schema."""
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
        print(f"Creating inventory table in tenant schema: {tenant.schema_name}")
        
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
                        quantity INTEGER NOT NULL DEFAULT 0,
                        available_quantity INTEGER NOT NULL DEFAULT 0,
                        reserved_quantity INTEGER NOT NULL DEFAULT 0,
                        product_id INTEGER NOT NULL,
                        location_id INTEGER NOT NULL,
                        client_id INTEGER NOT NULL DEFAULT 1,
                        company_id INTEGER NOT NULL DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by_id INTEGER,
                        updated_by_id INTEGER,
                        CONSTRAINT unique_product_location UNIQUE (product_id, location_id)
                    );
                """)
                print("Inventory table created successfully.")
            else:
                print("Inventory table already exists.")
                
        # Create inventory adjustment table if it doesn't exist
        with connection.cursor() as cursor:
            # Check if inventory adjustment table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_inventory_inventoryadjustment'
                );
            """, [tenant.schema_name])
            
            adjustment_exists = cursor.fetchone()[0]
            
            if not adjustment_exists:
                print("Creating ecomm_inventory_inventoryadjustment table...")
                cursor.execute("""
                    CREATE TABLE ecomm_inventory_inventoryadjustment (
                        id SERIAL PRIMARY KEY,
                        inventory_id INTEGER NOT NULL,
                        adjustment_type VARCHAR(20) NOT NULL,
                        quantity_change INTEGER NOT NULL,
                        reason_id INTEGER NOT NULL,
                        notes TEXT,
                        new_stock_quantity INTEGER NOT NULL,
                        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        client_id INTEGER NOT NULL DEFAULT 1,
                        company_id INTEGER NOT NULL DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by_id INTEGER,
                        updated_by_id INTEGER
                    );
                """)
                print("Inventory adjustment table created successfully.")
            else:
                print("Inventory adjustment table already exists.")
                
        # Create adjustment reason table if it doesn't exist
        with connection.cursor() as cursor:
            # Check if adjustment reason table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_inventory_adjustmentreason'
                );
            """, [tenant.schema_name])
            
            reason_exists = cursor.fetchone()[0]
            
            if not reason_exists:
                print("Creating ecomm_inventory_adjustmentreason table...")
                cursor.execute("""
                    CREATE TABLE ecomm_inventory_adjustmentreason (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        description TEXT,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        client_id INTEGER NOT NULL DEFAULT 1,
                        company_id INTEGER NOT NULL DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by_id INTEGER,
                        updated_by_id INTEGER
                    );
                """)
                print("Adjustment reason table created successfully.")
                
                # Insert default adjustment reasons
                cursor.execute("""
                    INSERT INTO ecomm_inventory_adjustmentreason 
                    (name, description, is_active, client_id, company_id)
                    VALUES 
                    ('Initial Stock', 'Initial inventory receipt', TRUE, 1, 1),
                    ('Sale', 'Inventory sold to customer', TRUE, 1, 1),
                    ('Return', 'Customer return', TRUE, 1, 1),
                    ('Damage', 'Damaged inventory', TRUE, 1, 1),
                    ('Adjustment', 'Manual inventory adjustment', TRUE, 1, 1);
                """)
                print("Default adjustment reasons created.")
            else:
                print("Adjustment reason table already exists.")
                
        # Create fulfillment location table if it doesn't exist
        with connection.cursor() as cursor:
            # Check if fulfillment location table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = 'ecomm_inventory_fulfillmentlocation'
                );
            """, [tenant.schema_name])
            
            location_exists = cursor.fetchone()[0]
            
            if not location_exists:
                print("Creating ecomm_inventory_fulfillmentlocation table...")
                cursor.execute("""
                    CREATE TABLE ecomm_inventory_fulfillmentlocation (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        location_type VARCHAR(50) DEFAULT 'WAREHOUSE',
                        address_line_1 VARCHAR(255),
                        address_line_2 VARCHAR(255),
                        city VARCHAR(100),
                        state VARCHAR(100),
                        postal_code VARCHAR(20),
                        country VARCHAR(100),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        client_id INTEGER NOT NULL DEFAULT 1,
                        company_id INTEGER NOT NULL DEFAULT 1,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by_id INTEGER,
                        updated_by_id INTEGER
                    );
                """)
                print("Fulfillment location table created successfully.")
                
                # Insert default location
                cursor.execute("""
                    INSERT INTO ecomm_inventory_fulfillmentlocation 
                    (name, location_type, is_active, client_id, company_id)
                    VALUES 
                    ('Main Warehouse', 'WAREHOUSE', TRUE, 1, 1);
                """)
                print("Default location created.")
            else:
                print("Fulfillment location table already exists.")
                
        # Add product with all required fields
        with connection.cursor() as cursor:
            # Check if product exists
            cursor.execute("""
                SELECT id FROM ecomm_product_product WHERE sku = 'TP001';
            """)
            
            product = cursor.fetchone()
            
            # Check table structure to determine available columns
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = %s 
                AND table_name = 'ecomm_product_product';
            """, [tenant.schema_name])
            
            columns = [row[0] for row in cursor.fetchall()]
            print("Available columns in ecomm_product_product:")
            print(", ".join(columns))
            
            if not product:
                print("Creating test product...")
                
                # Build dynamic SQL based on available columns
                column_names = []
                values = []
                params = []
                
                # Required fields
                column_value_map = {
                    'name': ('Test Product 1', '%s'),
                    'sku': ('TP001', '%s'),
                    'price': (100.00, '%s'),
                    'unit_price': (100.00, '%s'),  # Added unit_price for the 'man' tenant
                    'is_active': (True, 'TRUE'),
                    'client_id': (1, '1'),
                    'company_id': (1, '1'),
                    'created_at': ('NOW()', 'NOW()'),
                    'updated_at': ('NOW()', 'NOW()'),
                }
                
                # Optional fields with defaults if they exist
                optional_fields = {
                    'slug': ('test-product-1', '%s'),
                    'description': ('Test product for inventory management', '%s'),
                    'short_description': ('Test product', '%s'),
                    'product_type': ('simple', '%s'),
                    'manage_stock': (True, 'TRUE'),
                    'stock_quantity': (0, '0'),
                    'low_stock_threshold': (5, '5'),
                    'is_in_stock': (True, 'TRUE'),
                    'is_featured': (True, 'TRUE'),
                    'is_serialized': (False, 'FALSE'),
                    'is_lotted': (False, 'FALSE'),
                }
                
                # Add required fields
                for col, (val, sql_val) in column_value_map.items():
                    if col in columns:
                        column_names.append(col)
                        values.append(sql_val)
                        if sql_val == '%s':
                            params.append(val)
                
                # Add optional fields if they exist in the table
                for col, (val, sql_val) in optional_fields.items():
                    if col in columns:
                        column_names.append(col)
                        values.append(sql_val)
                        if sql_val == '%s':
                            params.append(val)
                
                # Build and execute the SQL
                sql = f"""
                    INSERT INTO ecomm_product_product (
                        {', '.join(column_names)}
                    ) VALUES (
                        {', '.join(values)}
                    )
                    RETURNING id;
                """
                
                print("Executing SQL:")
                print(sql)
                print("With params:", params)
                
                cursor.execute(sql, params)
                product_id = cursor.fetchone()[0]
                print(f"Created product with ID: {product_id}")
            else:
                product_id = product[0]
                print(f"Using existing product with ID: {product_id}")
                
        # Get location ID
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM ecomm_inventory_fulfillmentlocation LIMIT 1;")
            location = cursor.fetchone()
            if location:
                location_id = location[0]
                print(f"Using location with ID: {location_id}")
            else:
                print("No location found. Please create a location first.")
                return
                
        # Get adjustment reason ID
        with connection.cursor() as cursor:
            cursor.execute("SELECT id FROM ecomm_inventory_adjustmentreason WHERE name = 'Initial Stock' LIMIT 1;")
            reason = cursor.fetchone()
            if reason:
                reason_id = reason[0]
                print(f"Using adjustment reason with ID: {reason_id}")
            else:
                print("No adjustment reason found. Please create an adjustment reason first.")
                return
                
        # Create inventory record
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO ecomm_inventory_inventory (
                    quantity, available_quantity, reserved_quantity, product_id, location_id, client_id, company_id
                ) VALUES (
                    0, 0, 0, %s, %s, 1, 1
                )
                ON CONFLICT (product_id, location_id) DO NOTHING
                RETURNING id;
            """, [product_id, location_id])
            
            inventory_result = cursor.fetchone()
            if inventory_result:
                inventory_id = inventory_result[0]
                print(f"Created inventory record with ID: {inventory_id}")
            else:
                cursor.execute("SELECT id FROM ecomm_inventory_inventory WHERE product_id = %s AND location_id = %s;", [product_id, location_id])
                inventory = cursor.fetchone()
                if inventory:
                    inventory_id = inventory[0]
                    print(f"Using existing inventory record with ID: {inventory_id}")
                else:
                    print("Failed to create inventory record.")
                    return
                
        print("\nAPI Endpoints to use:")
        print("\n1. Add Inventory API:")
        print("POST http://localhost:8000/api/man/inventory/inventory/add_inventory/")
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

if __name__ == "__main__":
    create_inventory_table()
