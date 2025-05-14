import os
import django
import sys

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')
django.setup()

# Import necessary models
from django_tenants.utils import schema_context
from ecomm_superadmin.models import Tenant, Domain
from ecomm_product.models import Category, Brand, Product
from ecomm_inventory.models import FulfillmentLocation, AdjustmentReason, Inventory, AdjustmentType
from ecomm_tenant.tenant_utils import get_tenant_by_slug

# Tenant slug to use
TENANT_SLUG = 'yash'

def create_tenant_product_data():
    """Create product and inventory data in the specified tenant schema."""
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
        print(f"Creating data in tenant schema: {tenant.schema_name}")
        
        # Create categories if they don't exist
        category, created = Category.objects.get_or_create(
            name="General",
            defaults={
                'slug': 'general',
                'description': 'General product category',
                'is_active': True,
                'client_id': tenant.id,
                'company_id': 1
            }
        )
        print(f"Category {'created' if created else 'already exists'}: {category.name}")
        
        # Create brands if they don't exist
        brand, created = Brand.objects.get_or_create(
            name="Test Brand",
            defaults={
                'slug': 'test-brand',
                'description': 'Test brand for products',
                'is_active': True,
                'client_id': tenant.id,
                'company_id': 1
            }
        )
        print(f"Brand {'created' if created else 'already exists'}: {brand.name}")
        
        # Create products for inventory
        products = []
        for i in range(1, 4):
            product, created = Product.objects.get_or_create(
                sku=f"TP00{i}",
                defaults={
                    'name': f"Test Product {i}",
                    'description': f"Test product {i} for inventory management",
                    'short_description': f"Test product {i}",
                    'price': 100.00 * i,
                    'category': category,
                    'brand': brand,
                    'is_active': True,
                    'is_featured': i == 1,  # First product is featured
                    'client_id': tenant.id,
                    'company_id': 1
                }
            )
            products.append(product)
            print(f"Product {'created' if created else 'already exists'}: {product.name} (ID: {product.id})")
        
        # Create fulfillment locations
        warehouse, created = FulfillmentLocation.objects.get_or_create(
            name="Main Warehouse",
            defaults={
                'address': '123 Warehouse Street, Mumbai',
                'is_active': True,
                'client_id': tenant.id,
                'company_id': 1
            }
        )
        print(f"Location {'created' if created else 'already exists'}: {warehouse.name} (ID: {warehouse.id})")
        
        # Create adjustment reasons
        initial_stock, created = AdjustmentReason.objects.get_or_create(
            name="Initial Stock",
            defaults={
                'description': 'Initial inventory receipt',
                'adjustment_type': AdjustmentType.ADD,
                'is_active': True,
                'client_id': tenant.id,
                'company_id': 1
            }
        )
        print(f"Reason {'created' if created else 'already exists'}: {initial_stock.name} (ID: {initial_stock.id})")
        
        sale, created = AdjustmentReason.objects.get_or_create(
            name="Sale",
            defaults={
                'description': 'Inventory sold to customer',
                'adjustment_type': AdjustmentType.SUB,
                'is_active': True,
                'client_id': tenant.id,
                'company_id': 1
            }
        )
        print(f"Reason {'created' if created else 'already exists'}: {sale.name} (ID: {sale.id})")
        
        # Create inventory records
        for product in products:
            inventory, created = Inventory.objects.get_or_create(
                product=product,
                location=warehouse,
                defaults={
                    'quantity': 0,
                    'client_id': tenant.id,
                    'company_id': 1
                }
            )
            print(f"Inventory {'created' if created else 'already exists'} for {product.name} (ID: {inventory.id})")
        
        print("\nSummary of data in tenant schema:")
        print(f"Categories: {Category.objects.count()}")
        print(f"Brands: {Brand.objects.count()}")
        print(f"Products: {Product.objects.count()}")
        print(f"Fulfillment Locations: {FulfillmentLocation.objects.count()}")
        print(f"Adjustment Reasons: {AdjustmentReason.objects.count()}")
        print(f"Inventory Records: {Inventory.objects.count()}")
        
        print("\nAPI Endpoints to use:")
        print("\n1. Add Inventory API:")
        print("POST http://localhost:8000/api/yash/inventory/inventory/add_inventory/")
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
        
        print("\n2. Get Inventory API:")
        print("GET http://localhost:8000/api/yash/inventory/inventory/")
        print("Headers:")
        print("  Authorization: Bearer YOUR_JWT_TOKEN")
        
        print("\nMake sure to replace the IDs with the actual IDs shown above.")

if __name__ == "__main__":
    create_tenant_product_data()
