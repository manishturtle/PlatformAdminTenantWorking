# your_role_package/permissions.py

from rest_framework.permissions import BasePermission
from django.core.exceptions import ObjectDoesNotExist
from .models import Role, ModulePermissionSet, UserRoleAssignment

# Mapping of HTTP methods to CRUD operations
METHOD_TO_ACTION = {
    'GET': 'read',
    'OPTIONS': 'read',
    'HEAD': 'read',
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete',
}

class RoleBasedPermission(BasePermission):
    """
    Custom permission class that checks if a user has the required permissions
    based on their assigned roles and the module permissions within those roles.
    """

    def has_module_permission(self, user, module_id, required_action):
        """
        Check if the user has permission for a specific module and action.
        
        Args:
            user: The user to check permissions for
            module_id: The ID of the module to check access for
            required_action: The action being attempted (read, create, update, delete)
            
        Returns:
            bool: True if the user has permission, False otherwise
        """
        try:
            # Get all active roles assigned to the user
            user_roles = UserRoleAssignment.objects.filter(
                user=user,
                role__is_active=True
            ).select_related('role').prefetch_related('role__module_permissions')

            # Check each role's permissions
            for assignment in user_roles:
                role = assignment.role
                # Check if any of the role's module permissions match the required module and action
                for module_permission in role.module_permissions.all():
                    if (module_permission.module_id == module_id and
                        getattr(module_permission, f'can_{required_action}', False)):
                        return True
            
            return False
        except ObjectDoesNotExist:
            return False

    def has_permission(self, request, view):
        """
        Check if the user has permission to access the view.
        
        This method is called for every request to check permissions.
        """
        # Always allow authenticated users to access their own user info
        if getattr(view, 'basename', None) == 'user-profile' and request.user.is_authenticated:
            return True

        # Get the module ID from the view
        module_id = getattr(view, 'module_id', None)
        if not module_id:
            # If no module_id is specified, deny access
            return False

        # Get the required action based on the HTTP method
        required_action = METHOD_TO_ACTION.get(request.method)
        if not required_action:
            return False

        # Check if user has permission for this module and action
        return self.has_module_permission(request.user, module_id, required_action)

    def has_object_permission(self, request, view, obj):
        """
        Check if the user has permission to access a specific object.
        
        This is called after has_permission() if the view is accessing a specific object.
        """
        # Get the module ID from the view
        module_id = getattr(view, 'module_id', None)
        if not module_id:
            return False

        # Get the required action based on the HTTP method
        required_action = METHOD_TO_ACTION.get(request.method)
        if not required_action:
            return False

        # For object-level permissions, we might want to add additional checks
        # For example, checking if the user owns the object or is in the same organization
        
        # First check module-level permissions
        has_module_access = self.has_module_permission(request.user, module_id, required_action)
        if not has_module_access:
            return False

        # Add any object-specific checks here
        # For example:
        # if hasattr(obj, 'organization'):
        #     return obj.organization == request.user.organization
        
        return True

# Decorator for views to specify which module they belong to
def module_permission_required(module_id):
    """
    Decorator to specify which module a view belongs to.
    
    Usage:
        @module_permission_required('customer_management')
        class CustomerViewSet(viewsets.ModelViewSet):
            ...
    """
    def decorator(view_class):
        view_class.module_id = module_id
        return view_class
    return decorator
