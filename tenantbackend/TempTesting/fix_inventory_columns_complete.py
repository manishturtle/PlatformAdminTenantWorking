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

def fix_inventory_columns():
    """Fix the inventory table columns to match what the code expects."""
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
        print(f"Fixing inventory table columns in tenant schema: {tenant.schema_name}")
        
        # Check if inventory table exists and its structure
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = %s
                AND table_name = 'ecomm_inventory_inventory'
                ORDER BY ordinal_position;
            """, [tenant.schema_name])
            
            columns = [row[0] for row in cursor.fetchall()]
            print("Current columns in ecomm_inventory_inventory:")
            print(", ".join(columns))
            
            # Add missing columns
            missing_columns = {
                'stock_quantity': 'quantity',
                'non_saleable_quantity': '0',
                'on_hold_quantity': '0',
                'hold_quantity': 'on_hold_quantity',  # This is likely an alias for on_hold_quantity
                'on_order_quantity': '0',
                'in_transit_quantity': '0',
                'returned_quantity': '0',
                'backorder_quantity': '0',
                'low_stock_threshold': '5'
            }
            
            for col_name, default_value in missing_columns.items():
                if col_name not in columns:
                    print(f"Adding {col_name} column...")
                    try:
                        if default_value in columns:
                            # Create a generated column based on another column
                            cursor.execute(f"""
                                ALTER TABLE ecomm_inventory_inventory 
                                ADD COLUMN {col_name} INTEGER GENERATED ALWAYS AS ({default_value}) STORED;
                            """)
                            print(f"Added {col_name} as a generated column based on {default_value}.")
                        else:
                            # Create a regular column with a default value
                            cursor.execute(f"""
                                ALTER TABLE ecomm_inventory_inventory 
                                ADD COLUMN {col_name} INTEGER NOT NULL DEFAULT {default_value};
                            """)
                            print(f"Added {col_name} column with default value {default_value}.")
                    except Exception as e:
                        print(f"Error adding {col_name} column: {str(e)}")
                else:
                    print(f"{col_name} column already exists.")
                
        print("\nAPI Endpoints to use:")
        print("\n1. Add Inventory API:")
        print("POST http://localhost:8000/api/man/inventory/inventory/add_inventory/")
        print("Headers:")
        print("  Content-Type: application/json")
        print("  Authorization: Bearer YOUR_JWT_TOKEN")
        print("Body:")
        print("""{
  "product_id": 1,
  "location_id": 1,
  "quantity": 100,
  "adjustment_reason_id": 1,
  "notes": "Initial inventory setup"
}""")

if __name__ == "__main__":
    fix_inventory_columns()
