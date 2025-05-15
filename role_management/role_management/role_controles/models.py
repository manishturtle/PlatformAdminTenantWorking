# your_role_package/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

try:
    # Recommended for Django 3.1+
    from django.db.models import JSONField
except ImportError:
    # Fallback for older Django versions with psycopg2
    from django.contrib.postgres.fields import JSONField



# -----------------------------------------------------------------------------
# 2. Module Permission Set
# -----------------------------------------------------------------------------
class ModulePermissionSet(models.Model):
    """
    Defines a specific set of CRUD and field-level permissions
    for a module.
    """
    module_id = models.IntegerField(
        help_text=_("ID of the module from my_features.ts"),
        default=1  # Default to first module
    )
    can_create = models.BooleanField(default=False, verbose_name=_("Allow Create"))
    can_read = models.BooleanField(default=False, verbose_name=_("Allow Read/View"))
    can_update = models.BooleanField(default=False, verbose_name=_("Allow Update/Edit"))
    can_delete = models.BooleanField(default=False, verbose_name=_("Allow Delete"))
    field_permissions = JSONField(
        default=dict,
        blank=True,
        help_text=_("Field-level permissions for the module's features")
    )
    app_id = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("ID of the app/module from my_features.ts")
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    client_id = models.IntegerField(null=True, blank=True)
    company_id = models.IntegerField(null=True, blank=True)

    class Meta:
        verbose_name = _("Module Permission Set")
        verbose_name_plural = _("Module Permission Sets")
        ordering = ['module_id']

    def __str__(self):
        perm_summary = []
        if self.can_create: perm_summary.append("C")
        if self.can_read: perm_summary.append("R")
        if self.can_update: perm_summary.append("U")
        if self.can_delete: perm_summary.append("D")
        perms = "".join(perm_summary) if perm_summary else "None"
        return f"Module {self.module_id} [{perms}]"


# -----------------------------------------------------------------------------
# 3. User <-> Role Assignment (Explicit Intermediate Model)
# -----------------------------------------------------------------------------
class UserRoleAssignment(models.Model):
    """
    Explicit intermediate model linking Users to Roles.
    Allows adding extra data like assignment timestamp.
    """
    user = models.IntegerField(
        verbose_name=_('User ID'),
        db_index=True
    )
    
    def get_tenant_user(self):
        return TenantUser.objects.get(pk=self.user)
    role = models.ForeignKey(
        "Role", 
        on_delete=models.CASCADE,
        related_name='user_assignments', 
        verbose_name=_("Role")
    )
    assigned_on = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Assignment Date")
    )
    
    app_id = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("ID of the app/module from my_features.ts")
    )
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    client_id = models.IntegerField(null=True, blank=True)
    company_id = models.IntegerField(null=True, blank=True)

    class Meta:
        unique_together = ('user', 'role') 
        verbose_name = _("User Role Assignment")
        verbose_name_plural = _("User Role Assignments")
        ordering = ['user', 'role__name'] 

    def __str__(self):
        try:
            tenant_user = TenantUser.objects.get(pk=self.user)
            user_identifier = tenant_user.username
        except TenantUser.DoesNotExist:
            user_identifier = f'User {self.user}'
        return f"{user_identifier} assigned Role: {self.role.name}"


# -----------------------------------------------------------------------------
# 4. Role
# -----------------------------------------------------------------------------
class Role(models.Model):
    """
    Represents a user role. Roles are assigned to users via UserRoleAssignment
    and grant permissions via linked ModulePermissionSets.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    assigned_permissions = models.ManyToManyField(ModulePermissionSet, related_name='roles')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.IntegerField(null=True, blank=True)
    updated_by = models.IntegerField(null=True, blank=True)
    app_id = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("ID of the app/module from my_features.ts")
    )
    client_id = models.IntegerField(null=True, blank=True)
    company_id = models.IntegerField(null=True, blank=True)

    class Meta:
        verbose_name = _("Role")
        verbose_name_plural = _("Roles")
        ordering = ['name']

    def __str__(self):
        return self.name

    def get_module_permissions(self, module_id):
        """
        Get permissions for a specific module
        """
        if not self.is_active:
            return None

        try:
            return self.assigned_permissions.get(module_id=module_id)
        except ModulePermissionSet.DoesNotExist:
            return None

    def has_permission(self, module_id, action):
        """
        Checks if this role grants a specific CRUD permission for a module.
        'action' should be one of 'create', 'read', 'update', 'delete'.
        """
        if not self.is_active:
            return False

        action_field = f"can_{action}"
        if action_field not in ['can_create', 'can_read', 'can_update', 'can_delete']:
            return False

        return self.assigned_permissions.filter(
            module_id=module_id,
            **{action_field: True}
        ).exists()

    def get_field_permissions(self, module_id, feature_id=None):
        """
        Gets field permissions for a module and optionally a specific feature
        """
        if not self.is_active:
            return {}

        try:
            permission_set = self.assigned_permissions.get(module_id=module_id)
            if feature_id is not None:
                return permission_set.field_permissions.get(str(feature_id), {})
            return permission_set.field_permissions
        except ModulePermissionSet.DoesNotExist:
            return {}


class TenantUser(models.Model):
    """
    Proxy model for tenant users.
    This allows the role management package to access tenant users
    without directly depending on the ecomm_tenant_admins app.
    """
    id = models.IntegerField(primary_key=True)
    username = models.CharField(max_length=150)
    email = models.EmailField()
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    

    class Meta:
        managed = False
        db_table = 'ecomm_tenant_admins_tenantuser'
        verbose_name = _('Tenant User')
        verbose_name_plural = _('Tenant Users')

    def __str__(self):
        return self.username

