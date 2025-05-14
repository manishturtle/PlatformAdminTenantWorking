# your_role_package/serializers.py

from rest_framework import serializers
from django.db import models
from .models import Role, ModulePermissionSet, UserRoleAssignment, TenantUser

# -------------------------------------
# Basic Serializers (Read/Write)
# -------------------------------------

class ModulePermissionSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModulePermissionSet
        fields = [
            'id',
            'module_id',
            'can_create',
            'can_read',
            'can_update',
            'can_delete',
            'field_permissions',
            'app_id',
            'created_at',
            'updated_at',
            'client_id',
            'company_id'
        ]


class RoleSerializer(serializers.ModelSerializer):
    module_permissions = ModulePermissionSetSerializer(
        source='assigned_permissions',
        many=True,
        read_only=False
    )

    class Meta:
        model = Role
        fields = [
            'id',
            'name',
            'description',
            'is_active',
            'module_permissions',
            'created_at',
            'updated_at',
            'app_id',
            'client_id',
            'company_id'
        ]

    def create(self, validated_data):
        module_permissions_data = validated_data.pop('assigned_permissions', [])
        role = Role.objects.create(**validated_data)

        for module_perm_data in module_permissions_data:
            module_id = module_perm_data.get('module_id')
            app_id = validated_data.get('app_id')
            # Try to find existing permission set for this module and app
            try:
                # Use filter and first() instead of get_or_create
                perm_set = ModulePermissionSet.objects.filter(
                    module_id=module_id,
                    app_id=app_id
                ).first()
                if perm_set:
                    # Update existing permission set
                    for attr, value in module_perm_data.items():
                        setattr(perm_set, attr, value)
                    perm_set.save()
                else:
                    # Create new permission set
                    perm_set = ModulePermissionSet.objects.create(**module_perm_data)
                role.assigned_permissions.add(perm_set)
            except Exception as e:
                # Handle any other unexpected errors
                raise serializers.ValidationError(f"Error creating module permission: {str(e)}")

        return role

    def update(self, instance, validated_data):
        module_permissions_data = validated_data.pop('assigned_permissions', [])
        
        # Update role fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Keep track of new permission sets
        new_permission_sets = []
        
        # Create new permission sets for each module
        for module_perm_data in module_permissions_data:
            module_id = module_perm_data.get('module_id')
            
            # Always create a new permission set to avoid affecting other roles
            try:
                new_perm_set = ModulePermissionSet.objects.create(**module_perm_data)
                new_permission_sets.append(new_perm_set)
            except Exception as e:
                # Clean up any created permission sets if there's an error
                for perm_set in new_permission_sets:
                    perm_set.delete()
                raise serializers.ValidationError(f"Error updating module permission: {str(e)}")

        # Remove all existing permission assignments
        instance.assigned_permissions.clear()  # This removes the relationships but doesn't delete the permission sets

        # Assign the new permission sets
        for perm_set in new_permission_sets:
            instance.assigned_permissions.add(perm_set)

        return instance


class UserRoleAssignmentSerializer(serializers.ModelSerializer):
    def validate_user(self, value):
        try:
            TenantUser.objects.get(pk=value)
            return value
        except TenantUser.DoesNotExist:
            raise serializers.ValidationError('Invalid user ID - user does not exist in TenantUser table')

    class Meta:
        model = UserRoleAssignment
        fields = ['id', 'user', 'role', 'assigned_on', 'app_id', 'client_id', 'company_id']



class TenantUserSerializer(serializers.Serializer):
    """
    Serializer for tenant users.
    """
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()