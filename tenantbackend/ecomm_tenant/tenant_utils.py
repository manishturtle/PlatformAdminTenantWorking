from django.db import connection
import logging
from ecomm_superadmin.models import Tenant, Domain
from ecomm_tenant.app_registry import TenantAppRegistry

logger = logging.getLogger(__name__)

def get_current_tenant():
    """
    Get current tenant from connection
    
    Returns:
        Tenant object or None if no tenant is set
    """
    if hasattr(connection, 'tenant'):
        return connection.tenant
    return None

def set_tenant_context(tenant):
    """
    Set up tenant schema context
    
    Args:
        tenant: Tenant object
        
    Returns:
        bool: True if successful, False otherwise
    """
    if not tenant:
        return False
        
    try:
        # Set tenant schema
        connection.set_tenant(tenant)
        logger.info(f"Set connection schema to: {connection.schema_name}")
        return True
    except Exception as e:
        logger.error(f"Error setting tenant context: {str(e)}")
        return False

def ensure_tenant_tables(tenant):
    """
    Ensure all required tables exist for tenant within the tenant's schema
    
    Args:
        tenant: Tenant object
    """
    # Set the tenant schema
    connection.set_tenant(tenant)
    
    # Get all registered models from the app registry
    models = TenantAppRegistry.get_all_models()
    
    for model in models:
        try:
            model.create_table_if_not_exists()
            logger.debug(f"Ensured table exists for {model.__name__}")
        except Exception as e:
            logger.error(f"Error creating table for {model.__name__}: {str(e)}")

def get_tenant_by_slug(tenant_slug):
    """
    Get tenant by slug (either domain folder or url_suffix)
    
    Args:
        tenant_slug: The tenant slug to look up
        
    Returns:
        Tenant object or None if not found
    """
    try:
        # Try domain folder first
        try:
            domain = Domain.objects.get(folder=tenant_slug)
            return domain.tenant
        except Domain.DoesNotExist:
            # Try tenant URL suffix
            return Tenant.objects.get(url_suffix=tenant_slug)
    except Exception as e:
        logger.warning(f"Tenant lookup failed for '{tenant_slug}': {str(e)}")
        return None

def set_search_path():
    """
    Set search path to tenant schema and public
    """
    if hasattr(connection, 'schema_name'):
        with connection.cursor() as cur:
            cur.execute(f'SET search_path TO "{connection.schema_name}", public')
            
def reset_search_path():
    """
    Reset search path to public schema
    """
    with connection.cursor() as cur:
        cur.execute('SET search_path TO public')
