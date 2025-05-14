from functools import wraps
from django.core.exceptions import PermissionDenied
from .rules import ModulePermissionChecker

def module_permission_required(module_identifier, permission_type):
    """
    Decorator for views that checks whether a user has the specified module permission.
    
    Usage:
    @module_permission_required('products.product', 'view')
    def my_view(request):
        ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not ModulePermissionChecker.has_module_permission(
                request.user, module_identifier, permission_type
            ):
                raise PermissionDenied(
                    f"You don't have {permission_type} permission for {module_identifier}"
                )
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator

def field_permission_required(module_identifier, field_name, permission_type):
    """
    Decorator for views that checks whether a user has the specified field permission.
    
    Usage:
    @field_permission_required('products.product', 'price', 'edit')
    def update_price(request):
        ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped_view(request, *args, **kwargs):
            if not ModulePermissionChecker.has_field_permission(
                request.user, module_identifier, field_name, permission_type
            ):
                raise PermissionDenied(
                    f"You don't have {permission_type} permission for field {field_name}"
                )
            return view_func(request, *args, **kwargs)
        return _wrapped_view
    return decorator
