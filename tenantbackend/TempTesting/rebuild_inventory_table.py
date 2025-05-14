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

# Rebuild inventory table structure
with schema_context(tenant.schema_name):
    with connection.cursor() as cursor:
        print(f"Rebuilding inventory table in tenant schema: {tenant.schema_name}")
        
        # Create a backup of the current table
        try:
            cursor.execute("DROP TABLE IF EXISTS ecomm_inventory_inventory_backup")
            cursor.execute("CREATE TABLE ecomm_inventory_inventory_backup AS SELECT * FROM ecomm_inventory_inventory")
            print("Created backup of inventory table")
        except Exception as e:
            print(f"Error creating backup: {e}")
            exit(1)
        
        # Drop the current table
        try:
            cursor.execute("DROP TABLE IF EXISTS ecomm_inventory_inventory")
            print("Dropped original inventory table")
        except Exception as e:
            print(f"Error dropping table: {e}")
            exit(1)
        
        # Create a new table with the correct structure
        try:
            cursor.execute("""
                CREATE TABLE ecomm_inventory_inventory (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL,
                    location_id INTEGER NOT NULL,
                    quantity INTEGER DEFAULT 0,
                    available_quantity INTEGER DEFAULT 0,
                    reserved_quantity INTEGER DEFAULT 0,
                    stock_quantity INTEGER DEFAULT 0,
                    non_saleable_quantity INTEGER DEFAULT 0,
                    on_hold_quantity INTEGER DEFAULT 0,
                    on_order_quantity INTEGER DEFAULT 0,
                    in_transit_quantity INTEGER DEFAULT 0,
                    returned_quantity INTEGER DEFAULT 0,
                    hold_quantity INTEGER DEFAULT 0,
                    backorder_quantity INTEGER DEFAULT 0,
                    low_stock_threshold INTEGER DEFAULT 0,
                    client_id INTEGER DEFAULT 1,
                    company_id INTEGER DEFAULT 1,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    created_by_id INTEGER NULL,
                    updated_by_id INTEGER NULL,
                    CONSTRAINT unique_product_location UNIQUE (product_id, location_id)
                )
            """)
            print("Created new inventory table with correct structure")
            
            # Add generated columns for compatibility
            cursor.execute("ALTER TABLE ecomm_inventory_inventory ADD COLUMN created_by INTEGER GENERATED ALWAYS AS (created_by_id) STORED")
            cursor.execute("ALTER TABLE ecomm_inventory_inventory ADD COLUMN updated_by INTEGER GENERATED ALWAYS AS (updated_by_id) STORED")
            print("Added generated columns for compatibility")
            
            # Copy data from backup
            cursor.execute("""
                INSERT INTO ecomm_inventory_inventory (
                    id, product_id, location_id, quantity, available_quantity, reserved_quantity,
                    stock_quantity, non_saleable_quantity, on_hold_quantity, on_order_quantity,
                    in_transit_quantity, returned_quantity, hold_quantity, backorder_quantity,
                    low_stock_threshold, client_id, company_id, created_at, updated_at,
                    created_by_id, updated_by_id
                )
                SELECT 
                    id, product_id, location_id, quantity, available_quantity, reserved_quantity,
                    stock_quantity, non_saleable_quantity, on_hold_quantity, on_order_quantity,
                    in_transit_quantity, returned_quantity, hold_quantity, backorder_quantity,
                    low_stock_threshold, client_id, company_id, created_at, updated_at,
                    created_by_id, updated_by_id
                FROM ecomm_inventory_inventory_backup
                ON CONFLICT (product_id, location_id) DO UPDATE
                SET quantity = EXCLUDED.quantity,
                    available_quantity = EXCLUDED.available_quantity,
                    reserved_quantity = EXCLUDED.reserved_quantity,
                    stock_quantity = EXCLUDED.stock_quantity,
                    non_saleable_quantity = EXCLUDED.non_saleable_quantity,
                    on_hold_quantity = EXCLUDED.on_hold_quantity,
                    on_order_quantity = EXCLUDED.on_order_quantity,
                    in_transit_quantity = EXCLUDED.in_transit_quantity,
                    returned_quantity = EXCLUDED.returned_quantity,
                    hold_quantity = EXCLUDED.hold_quantity,
                    backorder_quantity = EXCLUDED.backorder_quantity,
                    low_stock_threshold = EXCLUDED.low_stock_threshold
            """)
            print("Copied data from backup to new table")
        except Exception as e:
            print(f"Error creating new table: {e}")
            # Try to restore from backup if something went wrong
            try:
                cursor.execute("DROP TABLE IF EXISTS ecomm_inventory_inventory")
                cursor.execute("ALTER TABLE ecomm_inventory_inventory_backup RENAME TO ecomm_inventory_inventory")
                print("Restored from backup after error")
            except:
                print("Failed to restore from backup!")
            exit(1)
        
        # Now check the structure
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
            
        # Print sample data
        cursor.execute("SELECT COUNT(*) FROM ecomm_inventory_inventory")
        count = cursor.fetchone()[0]
        print(f"\nTotal inventory records: {count}")
        
        if count > 0:
            cursor.execute("""
                SELECT id, product_id, location_id, quantity, stock_quantity
                FROM ecomm_inventory_inventory
                LIMIT 5
            """)
            records = cursor.fetchall()
            print("\nSample inventory records:")
            print("ID | Product ID | Location ID | Quantity | Stock Quantity")
            print('-' * 60)
            for record in records:
                print(f"{record[0]} | {record[1]} | {record[2]} | {record[3]} | {record[4]}")
