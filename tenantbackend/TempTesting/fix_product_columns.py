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

def fix_product_columns():
    """Fix the product table columns to match what the code expects."""
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
        print(f"Fixing product table columns in tenant schema: {tenant.schema_name}")
        
        # Check if product table exists and its structure
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_schema = %s
                AND table_name = 'ecomm_product_product'
                ORDER BY ordinal_position;
            """, [tenant.schema_name])
            
            columns = [row[0] for row in cursor.fetchall()]
            print("Current columns in ecomm_product_product:")
            print(", ".join(columns))
            
            # Add missing columns
            missing_columns = {
                'slug': "CONCAT(sku, '-', id)",  # Generate slug from sku and id
                'product_type': "'simple'",  # Default product type
                'manage_stock': 'TRUE',  # Default to manage stock
                'is_in_stock': 'TRUE',  # Default to in stock
                'is_featured': 'FALSE',  # Default to not featured
                'short_description': "''",  # Empty short description
                'price': 'unit_price',  # Map to existing unit_price column if it exists
                'sale_price': 'NULL',  # Default to NULL
                'cost_price': 'NULL',  # Default to NULL
                'category_id': 'category',  # Map to existing category column if it exists
                'brand_id': 'NULL',  # Default to NULL
                'stock_quantity': '0',  # Default stock quantity
                'low_stock_threshold': 'minimum_stock_level',  # Map to existing minimum_stock_level column if it exists
                'length': 'NULL',  # Default to NULL
                'width': 'NULL',  # Default to NULL
                'height': 'NULL',  # Default to NULL
                'meta_title': "''",  # Empty meta title
                'meta_description': "''",  # Empty meta description
                'meta_keywords': "''",  # Empty meta keywords
                'created_by': 'created_by_id',  # Map to existing created_by_id column
                'updated_by': 'updated_by_id'  # Map to existing updated_by_id column
            }
            
            for col_name, default_value in missing_columns.items():
                if col_name not in columns:
                    print(f"Adding {col_name} column...")
                    try:
                        if default_value.startswith('CONCAT') or (default_value in columns):
                            # Create a generated column based on expression or another column
                            cursor.execute(f"""
                                ALTER TABLE ecomm_product_product 
                                ADD COLUMN {col_name} VARCHAR(255) GENERATED ALWAYS AS ({default_value}) STORED;
                            """)
                            print(f"Added {col_name} as a generated column based on {default_value}.")
                        else:
                            # Create a regular column with a default value
                            cursor.execute(f"""
                                ALTER TABLE ecomm_product_product 
                                ADD COLUMN {col_name} VARCHAR(255) DEFAULT {default_value};
                            """)
                            print(f"Added {col_name} column with default value {default_value}.")
                    except Exception as e:
                        print(f"Error adding {col_name} column: {str(e)}")
                        
                        # Try alternative approach if the first one fails
                        try:
                            if col_name == 'slug':
                                # Try adding slug without using GENERATED ALWAYS
                                cursor.execute("""
                                    ALTER TABLE ecomm_product_product 
                                    ADD COLUMN slug VARCHAR(255);
                                """)
                                
                                # Update the slug values based on sku and id
                                cursor.execute("""
                                    UPDATE ecomm_product_product 
                                    SET slug = CONCAT(sku, '-', id);
                                """)
                                print(f"Added {col_name} column and populated it with values.")
                            else:
                                # For other columns, try a simpler approach
                                data_type = "VARCHAR(255)"
                                if col_name in ['manage_stock', 'is_in_stock', 'is_featured']:
                                    data_type = "BOOLEAN"
                                elif col_name in ['price', 'sale_price', 'cost_price']:
                                    data_type = "NUMERIC(10, 2)"
                                
                                cursor.execute(f"""
                                    ALTER TABLE ecomm_product_product 
                                    ADD COLUMN {col_name} {data_type};
                                """)
                                print(f"Added {col_name} column with type {data_type}.")
                        except Exception as e2:
                            print(f"Alternative approach failed for {col_name}: {str(e2)}")
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
    fix_product_columns()
