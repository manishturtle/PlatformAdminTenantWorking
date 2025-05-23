from django.apps import apps
import logging

logger = logging.getLogger(__name__)

class TenantAppRegistry:
    """
    Registry for tenant-aware applications.
    This class maintains a registry of all tenant-aware applications and their models,
    allowing for automatic table creation and schema management.
    """
    
    _registry = {}
    
    @classmethod
    def register_app(cls, app_label, models=None):
        """
        Register an application as tenant-aware.
        
        Args:
            app_label (str): The Django app label (e.g., 'ecomm_inventory')
            models (list, optional): List of model names to include. If None, all models are included.
        """
        if app_label in cls._registry:
            logger.warning(f"App {app_label} is already registered as tenant-aware")
            return
            
        # Get all models for this app
        app_models = []
        app_config = apps.get_app_config(app_label)
        
        for model in app_config.get_models():
            # Skip abstract models
            if model._meta.abstract:
                continue
                
            # If models list is provided, only include specified models
            if models is not None and model.__name__ not in models:
                continue
                
            # Check if model inherits from a base model with create_table_if_not_exists method
            if hasattr(model, 'create_table_if_not_exists'):
                app_models.append(model)
            else:
                logger.warning(f"Model {model.__name__} in app {app_label} does not have create_table_if_not_exists method")
        
        cls._registry[app_label] = app_models
        logger.info(f"Registered app {app_label} with {len(app_models)} models: {[m.__name__ for m in app_models]}")
    
    @classmethod
    def get_all_models(cls):
        """
        Get all registered tenant-aware models.
        
        Returns:
            list: List of all registered models
        """
        all_models = []
        for app_models in cls._registry.values():
            all_models.extend(app_models)
        return all_models
    
    @classmethod
    def get_app_models(cls, app_label):
        """
        Get all registered models for a specific app.
        
        Args:
            app_label (str): The Django app label
            
        Returns:
            list: List of registered models for the app
        """
        return cls._registry.get(app_label, [])
    
    @classmethod
    def is_app_registered(cls, app_label):
        """
        Check if an app is registered as tenant-aware.
        
        Args:
            app_label (str): The Django app label
            
        Returns:
            bool: True if app is registered, False otherwise
        """
        return app_label in cls._registry

# Register core tenant-aware applications
def register_default_apps():
    """Register default tenant-aware applications from settings.TENANT_APPS"""
    try:
        from django.conf import settings
        
        # Register all tenant apps from settings
        tenant_apps = getattr(settings, 'TENANT_APPS', [])
        for app_label in tenant_apps:
            # Skip commented out apps and django built-in apps
            if app_label.startswith('#') or app_label.startswith('django.'):
                continue
                
            # Skip apps that are already registered
            if TenantAppRegistry.is_app_registered(app_label):
                continue
                
            try:
                # Remove any comments after the app name
                app_label = app_label.split('#')[0].strip()
                if app_label:  # Only register if app_label is not empty
                    TenantAppRegistry.register_app(app_label)
                    logger.info(f"Registered tenant app: {app_label}")
            except Exception as app_error:
                logger.error(f"Error registering tenant app {app_label}: {str(app_error)}")
                continue
        
        logger.info("Completed registering tenant-aware applications")
    except Exception as e:
        logger.error(f"Error registering default apps: {str(e)}")

# Register default apps when this module is imported
register_default_apps()
