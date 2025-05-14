from django.apps import AppConfig


class RoleControlesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'role_management.role_controles'
    verbose_name = 'Role Management'
    
    def ready(self):
        # Import signals or perform other initialization here
        pass
