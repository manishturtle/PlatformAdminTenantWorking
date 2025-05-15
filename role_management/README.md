# Django Role Management

A flexible role-based access control (RBAC) system for Django applications. This package provides a comprehensive solution for managing user roles and permissions at both resource and field levels.

## Features

- **Hierarchical Permission Structure**: Resources → Permission Sets → Roles → Users
- **Flexible Permission Definition**: Both CRUD and field-level permissions
- **REST API Integration**: Ready to use with Django REST Framework
- **Permission Checking**: Helper methods to easily check permissions in views or serializers
- **Field Filtering**: Example implementation for filtering serializer fields based on permissions
- **Complete REST API**: Full set of endpoints for managing roles and permissions

## Installation

This package is hosted on a private PyPI repository. To install it:

1. Configure pip to use the private repository:
```bash
pip config set global.index-url https://your-private-pypi-url/simple/
pip config set global.extra-index-url https://pypi.org/simple/
```

2. Install the package:
```bash
pip install django-tenant-role-management
```

Or add to your requirements.txt:
```
django-tenant-role-management==0.1.0
```

## Quick Start

1. Add "role_management.role_controles" to your INSTALLED_APPS setting:

```python
INSTALLED_APPS = [
    ...
    'role_management.role_controles',
    ...
]
```

2. Include the role management URLs in your project's urls.py:

```python
from django.urls import path, include

urlpatterns = [
    ...
    path('api/management/', include('role_management.role_controles.urls', namespace='role_management_api')),
    ...
]
```

3. Run migrations to create the role management models:

```bash
python manage.py migrate
```

## Available API Endpoints

The package provides the following REST API endpoints:

### 1. Roles API
- `GET /api/management/roles/` - List all roles
- `POST /api/management/roles/` - Create a new role
- `GET /api/management/roles/{id}/` - Get role details
- `PUT /api/management/roles/{id}/` - Update a role
- `DELETE /api/management/roles/{id}/` - Delete a role

Example role creation:
```json
POST /api/management/roles/
{
    "name": "Editor",
    "description": "Can edit content",
    "is_active": true
}
```

### 2. Module Permissions API
- `GET /api/management/module-permissions/` - List all module permissions
- `POST /api/management/module-permissions/` - Create a new module permission
- `GET /api/management/module-permissions/{id}/` - Get permission details
- `PUT /api/management/module-permissions/{id}/` - Update a permission
- `DELETE /api/management/module-permissions/{id}/` - Delete a permission

Example permission creation:
```json
POST /api/management/module-permissions/
{
    "name": "Content Management",
    "module_id": "content",
    "can_create": true,
    "can_read": true,
    "can_update": true,
    "can_delete": false
}
```

### 3. User Role Assignments API
- `GET /api/management/user-role-assignments/` - List all user role assignments
- `POST /api/management/user-role-assignments/` - Assign a role to a user
- `GET /api/management/user-role-assignments/{id}/` - Get assignment details
- `DELETE /api/management/user-role-assignments/{id}/` - Remove a role from a user

Example role assignment:
```json
POST /api/management/user-role-assignments/
{
    "user": 1,
    "role": 2
}
```

### 4. Tenant Users API
- `GET /api/management/tenant-users/` - List all tenant users

## Using Permissions in Views

You can use the permission decorators directly in your consuming application in several ways:

1. Class-based views with module-level permissions:
```python
from role_management.role_controles.permissions import module_permission_required, RoleBasedPermission

@module_permission_required('customer_management')
class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [RoleBasedPermission]
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
```

2. Function-based views with specific action permissions:
```python
from role_management.role_controles.decorators import module_permission_required
from rest_framework.decorators import api_view

@api_view(['POST'])
@module_permission_required('inventory')
def create_product(request):
    # Your view logic here
    pass
```

3. Combined with DRF decorators:
```python
from rest_framework.decorators import action
from role_management.role_controles.permissions import module_permission_required

@module_permission_required('orders')
class OrderViewSet(viewsets.ModelViewSet):
    permission_classes = [RoleBasedPermission]
    queryset = Order.objects.all()
    
    @action(detail=True, methods=['post'])
    @module_permission_required('orders.approve')
    def approve(self, request, pk=None):
        # Approve order logic here
        pass
```

The permission system will automatically map HTTP methods to CRUD operations:
- GET → read
- POST → create
- PUT/PATCH → update
- DELETE → delete

## Checking Permissions in Code

You can check permissions programmatically:

```python
from role_management.role_controles.utils import has_module_permission

if has_module_permission(request.user, 'your_module_id', 'read'):
    # User has read permission
    pass
```

## Models Reference

The package provides these main models:

- `ModulePermissionSet`: Define permissions for specific modules
- `Role`: Create roles that can be assigned to users
- `UserRoleAssignment`: Link users to roles

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
