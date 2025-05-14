# role_management/role_controles/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'roles', views.RoleViewSet)
router.register(r'module-permissions', views.ModulePermissionSetViewSet)
router.register(r'user-role-assignments', views.UserRoleAssignmentViewSet)
router.register(r'tenant-users', views.TenantUserViewSet, basename='tenantuser')


# The API URLs are now determined automatically by the router.
# Example URLs:
# /api/management/roles/
# /api/management/module-permissions/
# /api/management/user-role-assignments/
# etc.

app_name = 'role_management' # Namespace for URLs

urlpatterns = [
    path('', include(router.urls)),
]

# --- How to include in your main project's urls.py ---
# from django.contrib import admin
# from django.urls import path, include
#
# urlpatterns = [
#     path('admin/', admin.site.urls),
#     path('api/role-management/', include('role_management.role_controles.urls', namespace='role_management_api')),
#     # ... other urls
# ]
