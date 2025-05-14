from django.shortcuts import render
from rest_framework import viewsets, permissions
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _

from .models import Role, ModulePermissionSet, UserRoleAssignment, TenantUser   
from .serializers import (
    RoleSerializer, ModulePermissionSetSerializer, TenantUserSerializer, UserRoleAssignmentSerializer
)
from .permissions import RoleBasedPermission

User = get_user_model()

# -------------------------------------
# Base ViewSet for common settings
# -------------------------------------
class RoleManagementBaseViewSet(viewsets.ModelViewSet):
    """ Base ViewSet for Role Management models. """
    # Default permission: Require authentication and RoleBasedPermission. Specific views can override.
    # permission_classes = [permissions.AllowAny]  # Temporarily allow all access for testing
    filterset_fields = ['id', 'app_id']
    search_fields = ['name']
    ordering_fields = ['id', 'name']

    def get_queryset(self):
        """Override get_queryset to filter by app_id"""
        queryset = super().get_queryset()
        app_id = self.request.query_params.get('app_id', None)
        if app_id is not None:
            queryset = queryset.filter(app_id=app_id)
        return queryset

    def get_resource_identifier(self):
        """Define resource identifier for each view"""
        return f"role_management.{self.queryset.model._meta.model_name}"

# -------------------------------------
# ViewSets for each model
# -------------------------------------

class ModulePermissionSetViewSet(RoleManagementBaseViewSet):
    """
    API endpoint for managing Module Permission Sets.
    """
    queryset = ModulePermissionSet.objects.all()
    serializer_class = ModulePermissionSetSerializer
    resource_identifier = 'role_management.modulepermissionset'
    filterset_fields = ['module_id', 'app_id']

    def perform_create(self, serializer):
        """Ensure app_id is saved during permission set creation"""
        app_id = self.request.query_params.get('app_id')
        if app_id:
            serializer.save(app_id=app_id)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """Ensure app_id is maintained during updates"""
        app_id = self.request.query_params.get('app_id')
        if app_id:
            serializer.save(app_id=app_id)
        else:
            serializer.save()

class RoleViewSet(RoleManagementBaseViewSet):
    """
    API endpoint for managing Roles.
    Allows creating roles and assigning ModulePermissionSets.
    User assignment is better handled via UserRoleAssignmentViewSet or custom actions.
    Typically requires admin privileges.
    """
    queryset = Role.objects.all().prefetch_related('assigned_permissions', 'user_assignments')
    serializer_class = RoleSerializer
    resource_identifier = 'role_management.role'
    filterset_fields = ['name', 'is_active', 'app_id']
    search_fields = ['name', 'description']

    def perform_create(self, serializer):
        """Ensure app_id is saved during role creation"""
        app_id = self.request.query_params.get('app_id')
        if app_id:
            serializer.save(app_id=app_id)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """Ensure app_id is maintained during updates"""
        app_id = self.request.query_params.get('app_id')
        if app_id:
            serializer.save(app_id=app_id)
        else:
            serializer.save()

class UserRoleAssignmentViewSet(RoleManagementBaseViewSet):
    """
    API endpoint specifically for managing the assignment of Roles to Users.
    This is the recommended way to handle the User <-> Role link via the API.
    Typically requires admin privileges.
    """
    queryset = UserRoleAssignment.objects.all().select_related('role')
    serializer_class = UserRoleAssignmentSerializer
    resource_identifier = 'role_management.userroleassignment'
    filterset_fields = ['user', 'role', 'app_id']

    def perform_create(self, serializer):
        """Ensure app_id is saved during role assignment creation"""
        app_id = self.request.query_params.get('app_id')
        if app_id:
            serializer.save(app_id=app_id)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """Ensure app_id is maintained during updates"""
        app_id = self.request.query_params.get('app_id')
        if app_id:
            serializer.save(app_id=app_id)
        else:
            serializer.save()


class TenantUserViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint to get all tenant users.
    Only provides GET method to list users.
    Filters users based on their role assignments and app_id.
    """
    serializer_class = TenantUserSerializer
    filterset_fields = ['id', 'username', 'email', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['id', 'username', 'email', 'date_joined']

    def get_queryset(self):
        """
        Filter users based on role assignments and app_id.
        If app_id is provided, only return users who have roles assigned for that app.
        """
        queryset = TenantUser.objects.all()
        app_id = self.request.query_params.get('app_id')
        
        if app_id:
            # Get user IDs who have roles assigned for this app_id
            user_ids = UserRoleAssignment.objects.filter(app_id=app_id).values_list('user', flat=True).distinct()
            queryset = queryset.filter(id__in=user_ids)
            
        return queryset
    
