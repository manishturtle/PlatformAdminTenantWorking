from django.core.cache import cache
from .models import UserRoleAssignment, ModulePermissionSet

class ModulePermissionChecker:
    """
    A class to check module-level and field-level permissions for users.
    Includes caching for better performance.
    """
    CACHE_KEY_PREFIX = 'user_module_perms_'
    CACHE_TIMEOUT = 300  # 5 minutes

    @classmethod
    def get_cache_key(cls, user_id, module_identifier):
        return f"{cls.CACHE_KEY_PREFIX}{user_id}_{module_identifier}"

    @classmethod
    def clear_cache(cls, user_id):
        """Clear all cached permissions for a user"""
        # Note: In production, you might want to use cache tags or patterns
        cache.delete_pattern(f"{cls.CACHE_KEY_PREFIX}{user_id}_*")

    @classmethod
    def get_user_permissions(cls, user, module_identifier, use_cache=True):
        """
        Get a user's permissions for a specific module.
        Returns a dict with both module-level and field-level permissions.
        """
        if not user or not user.is_authenticated:
            return cls.get_default_permissions()

        if user.is_superuser:
            return cls.get_superuser_permissions()

        cache_key = cls.get_cache_key(user.id, module_identifier)
        
        if use_cache:
            cached_perms = cache.get(cache_key)
            if cached_perms is not None:
                return cached_perms

        # Get all active roles for the user
        user_roles = UserRoleAssignment.objects.filter(
            user=user,
            role__is_active=True
        ).select_related('role').prefetch_related('role__assigned_permissions')

        permissions = cls.get_default_permissions()

        for assignment in user_roles:
            role = assignment.role
            # Get permissions for this module from the role
            module_perms = role.assigned_permissions.filter(
                resource__identifier=module_identifier
            ).first()

            if module_perms:
                # Update module-level permissions (OR operation)
                permissions['module_permissions'].update({
                    'view': permissions['module_permissions']['view'] or module_perms.can_read,
                    'create': permissions['module_permissions']['create'] or module_perms.can_create,
                    'edit': permissions['module_permissions']['edit'] or module_perms.can_update,
                    'delete': permissions['module_permissions']['delete'] or module_perms.can_delete
                })

                # Update field-level permissions
                if module_perms.field_permissions:
                    for field, perms in module_perms.field_permissions.items():
                        if field not in permissions['field_permissions']:
                            permissions['field_permissions'][field] = {'view': False, 'edit': False}
                        
                        permissions['field_permissions'][field].update({
                            'view': permissions['field_permissions'][field]['view'] or perms.get('read', False),
                            'edit': permissions['field_permissions'][field]['edit'] or perms.get('write', False)
                        })

        # Cache the computed permissions
        if use_cache:
            cache.set(cache_key, permissions, cls.CACHE_TIMEOUT)

        return permissions

    @staticmethod
    def get_default_permissions():
        """Get the default (no permission) state"""
        return {
            'module_permissions': {
                'view': False,
                'create': False,
                'edit': False,
                'delete': False
            },
            'field_permissions': {}
        }

    @staticmethod
    def get_superuser_permissions():
        """Get superuser (all permission) state"""
        return {
            'module_permissions': {
                'view': True,
                'create': True,
                'edit': True,
                'delete': True
            },
            'field_permissions': {}  # Will be populated as needed with all permissions
        }

    @classmethod
    def has_module_permission(cls, user, module_identifier, permission_type, use_cache=True):
        """
        Check if a user has a specific module-level permission.
        permission_type should be one of: 'view', 'create', 'edit', 'delete'
        """
        perms = cls.get_user_permissions(user, module_identifier, use_cache)
        return perms['module_permissions'].get(permission_type, False)

    @classmethod
    def has_field_permission(cls, user, module_identifier, field_name, permission_type, use_cache=True):
        """
        Check if a user has a specific field-level permission.
        permission_type should be one of: 'view', 'edit'
        """
        perms = cls.get_user_permissions(user, module_identifier, use_cache)
        field_perms = perms['field_permissions'].get(field_name, {})
        return field_perms.get(permission_type, False)

# Convenience functions for use in views and templates
def has_module_permission(user, module_identifier, permission_type):
    """
    Convenience function to check module permissions.
    Example usage:
    @permission_required('module_identifier', 'view')
    def my_view(request):
        pass
    """
    return ModulePermissionChecker.has_module_permission(user, module_identifier, permission_type)

def has_field_permission(user, module_identifier, field_name, permission_type):
    """
    Convenience function to check field permissions.
    Example usage in template:
    {% if has_field_permission user "products.product" "price" "edit" %}
        Show edit form
    {% endif %}
    """
    return ModulePermissionChecker.has_field_permission(
        user, module_identifier, field_name, permission_type
    )
