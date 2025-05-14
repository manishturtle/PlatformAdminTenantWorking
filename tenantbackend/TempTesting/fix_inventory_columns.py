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
            
            # Check if stock_quantity column exists
            if 'stock_quantity' not in columns:
                print("Adding stock_quantity column...")
                try:
                    # Add stock_quantity column as an alias for quantity
                    cursor.execute("""
                        ALTER TABLE ecomm_inventory_inventory 
                        ADD COLUMN stock_quantity INTEGER GENERATED ALWAYS AS (quantity) STORED;
                    """)
                    print("Added stock_quantity as a generated column based on quantity.")
                except Exception as e:
                    print(f"Error adding stock_quantity column: {str(e)}")
                    
                    # Alternative approach: create a view
                    print("Trying alternative approach with a view...")
                    try:
                        # Drop view if it exists
                        cursor.execute("""
                            DROP VIEW IF EXISTS ecomm_inventory_inventory_view;
                        """)
                        
                        # Create a view that includes stock_quantity
                        cursor.execute("""
                            CREATE OR REPLACE VIEW ecomm_inventory_inventory_view AS
                            SELECT 
                                id, 
                                quantity, 
                                available_quantity, 
                                reserved_quantity, 
                                product_id, 
                                location_id, 
                                client_id, 
                                company_id, 
                                created_at, 
                                updated_at, 
                                created_by_id, 
                                updated_by_id,
                                quantity AS stock_quantity
                            FROM ecomm_inventory_inventory;
                        """)
                        print("Created view ecomm_inventory_inventory_view with stock_quantity.")
                    except Exception as e2:
                        print(f"Error creating view: {str(e2)}")
                        
                        # Final approach: modify the services.py file
                        print("Trying to modify the services.py file to use quantity instead of stock_quantity...")
                        try:
                            # Create a temporary file with modified content
                            services_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ecomm_inventory', 'services.py')
                            
                            if os.path.exists(services_path):
                                with open(services_path, 'r') as f:
                                    content = f.read()
                                
                                # Replace stock_quantity with quantity
                                modified_content = content.replace('stock_quantity', 'quantity')
                                
                                # Write back to the file
                                with open(services_path, 'w') as f:
                                    f.write(modified_content)
                                
                                print(f"Modified {services_path} to use quantity instead of stock_quantity.")
                            else:
                                print(f"Services file not found at {services_path}")
                        except Exception as e3:
                            print(f"Error modifying services.py: {str(e3)}")
            else:
                print("stock_quantity column already exists.")
                
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
