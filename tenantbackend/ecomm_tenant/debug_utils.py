from django.db import connection
import logging
import json
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from ecomm_superadmin.models import Tenant, Domain

logger = logging.getLogger(__name__)

def debug_tenant_tables(tenant_slug):
    """
    Debug utility to check if all required tables exist for a tenant
    
    Args:
        tenant_slug: The tenant slug to check
        
    Returns:
        dict: Dictionary with table status information
    """
    from ecomm_inventory.models import (
        FulfillmentLocation, Inventory, InventoryAdjustment,
        SerializedInventory, Lot
    )
    from ecomm_product.models import Product, Category
    
    models = [
        FulfillmentLocation, Inventory, InventoryAdjustment,
        SerializedInventory, Lot, Product, Category
    ]
    
    # Get tenant
    try:
        try:
            domain = Domain.objects.get(folder=tenant_slug)
            tenant = domain.tenant
        except Domain.DoesNotExist:
            tenant = Tenant.objects.get(url_suffix=tenant_slug)
        
        # Set tenant schema
        connection.set_tenant(tenant)
        
        # Check each table
        results = {}
        for model in models:
            table_name = model._meta.db_table
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = %s
                        AND table_name = %s
                    );
                """, [connection.schema_name, table_name])
                table_exists = cursor.fetchone()[0]
                
                results[table_name] = {
                    'exists': table_exists,
                    'model': model.__name__,
                    'app': model._meta.app_label
                }
                
                if not table_exists:
                    # Try to create the table
                    try:
                        model.create_table_if_not_exists()
                        # Check again
                        cursor.execute("""
                            SELECT EXISTS (
                                SELECT FROM information_schema.tables 
                                WHERE table_schema = %s
                                AND table_name = %s
                            );
                        """, [connection.schema_name, table_name])
                        table_exists = cursor.fetchone()[0]
                        results[table_name]['created'] = table_exists
                    except Exception as e:
                        results[table_name]['error'] = str(e)
        
        # Reset schema
        connection.set_schema_to_public()
        
        return {
            'tenant': tenant.schema_name,
            'tenant_id': tenant.id,
            'tables': results
        }
    
    except Exception as e:
        logger.error(f"Error debugging tenant tables: {str(e)}")
        return {
            'error': str(e),
            'tenant_slug': tenant_slug
        }

@api_view(['GET'])
@permission_classes([IsAdminUser])
def debug_tenant_api(request, tenant_slug):
    """
    API endpoint to debug tenant tables
    """
    results = debug_tenant_tables(tenant_slug)
    return JsonResponse(results)

def fix_missing_tables(tenant_slug):
    """
    Utility to fix missing tables for a tenant
    
    Args:
        tenant_slug: The tenant slug to fix
        
    Returns:
        dict: Dictionary with fix status information
    """
    from ecomm_inventory.models import (
        FulfillmentLocation, Inventory, InventoryAdjustment,
        SerializedInventory, Lot
    )
    from ecomm_product.models import Product, Category
    
    models = [
        FulfillmentLocation, Inventory, InventoryAdjustment,
        SerializedInventory, Lot, Product, Category
    ]
    
    # Get tenant
    try:
        try:
            domain = Domain.objects.get(folder=tenant_slug)
            tenant = domain.tenant
        except Domain.DoesNotExist:
            tenant = Tenant.objects.get(url_suffix=tenant_slug)
        
        # Set tenant schema
        connection.set_tenant(tenant)
        
        # Create each missing table
        results = {}
        for model in models:
            table_name = model._meta.db_table
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = %s
                        AND table_name = %s
                    );
                """, [connection.schema_name, table_name])
                table_exists = cursor.fetchone()[0]
                
                if not table_exists:
                    # Try to create the table
                    try:
                        model.create_table_if_not_exists()
                        results[table_name] = {
                            'status': 'created',
                            'model': model.__name__,
                            'app': model._meta.app_label
                        }
                    except Exception as e:
                        results[table_name] = {
                            'status': 'error',
                            'error': str(e),
                            'model': model.__name__,
                            'app': model._meta.app_label
                        }
                else:
                    results[table_name] = {
                        'status': 'already_exists',
                        'model': model.__name__,
                        'app': model._meta.app_label
                    }
        
        # Reset schema
        connection.set_schema_to_public()
        
        return {
            'tenant': tenant.schema_name,
            'tenant_id': tenant.id,
            'tables': results
        }
    
    except Exception as e:
        logger.error(f"Error fixing tenant tables: {str(e)}")
        return {
            'error': str(e),
            'tenant_slug': tenant_slug
        }

@api_view(['POST'])
@permission_classes([IsAdminUser])
def fix_tenant_tables_api(request, tenant_slug):
    """
    API endpoint to fix missing tenant tables
    """
    results = fix_missing_tables(tenant_slug)
    return JsonResponse(results)

def check_tenant_connection(tenant_slug):
    """
    Utility to check tenant database connection
    
    Args:
        tenant_slug: The tenant slug to check
        
    Returns:
        dict: Connection status information
    """
    try:
        # Get tenant
        try:
            domain = Domain.objects.get(folder=tenant_slug)
            tenant = domain.tenant
        except Domain.DoesNotExist:
            tenant = Tenant.objects.get(url_suffix=tenant_slug)
        
        # Set tenant schema
        connection.set_tenant(tenant)
        
        # Test connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_schema()")
            current_schema = cursor.fetchone()[0]
            
            cursor.execute("SELECT current_database()")
            current_db = cursor.fetchone()[0]
            
            cursor.execute("SHOW search_path")
            search_path = cursor.fetchone()[0]
        
        # Reset schema
        connection.set_schema_to_public()
        
        return {
            'status': 'success',
            'tenant': tenant.schema_name,
            'tenant_id': tenant.id,
            'current_schema': current_schema,
            'database': current_db,
            'search_path': search_path
        }
    
    except Exception as e:
        logger.error(f"Error checking tenant connection: {str(e)}")
        return {
            'status': 'error',
            'error': str(e),
            'tenant_slug': tenant_slug
        }

@api_view(['GET'])
@permission_classes([IsAdminUser])
def check_tenant_connection_api(request, tenant_slug):
    """
    API endpoint to check tenant database connection
    """
    results = check_tenant_connection(tenant_slug)
    return JsonResponse(results)
