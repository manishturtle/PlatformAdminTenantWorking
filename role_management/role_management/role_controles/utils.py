# your_role_package/utils.py

from .models import ModulePermissionSet

def get_user_permissions_for_resource(user, resource_identifier):
    """
    Aggregates permissions for a given user and resource identifier
    across all their active roles.

    Returns a dictionary like:
    {
        'create': bool,
        'read': bool,
        'update': bool,
        'delete': bool,
        'fields': {
            'read': set{'field1', 'field2', ...},
            'write': set{'field1', 'field3', ...}
        }
    }
    'fields' sets contain names of fields the user has explicit permission for.
    If a set is empty, it implies access is governed by the main CRUD flag
    (e.g., if 'read' is True and 'fields.read' is empty, all fields are readable).
    """
    permissions = {
        'create': False,
        'read': False,
        'update': False,
        'delete': False,
        'fields': {
            'read': set(),
            'write': set()
        }
    }

    if not user or not user.is_authenticated:
        return permissions

    # Optimization: Fetch relevant permission sets in one go if possible
    # Get all permission sets linked to the user's active roles for the specific resource
    relevant_perm_sets = ModulePermissionSet.objects.filter(
        assigned_to_roles__users=user,
        assigned_to_roles__is_active=True,
        resource__identifier=resource_identifier
    ).distinct() # Ensure we don't process the same set multiple times if assigned via multiple roles

    for perm_set in relevant_perm_sets:
        # Aggregate CRUD permissions (if any role grants it, it's True)
        permissions['create'] = permissions['create'] or perm_set.can_create
        permissions['read'] = permissions['read'] or perm_set.can_read
        permissions['update'] = permissions['update'] or perm_set.can_update
        permissions['delete'] = permissions['delete'] or perm_set.can_delete

        # Aggregate field permissions
        if isinstance(perm_set.field_permissions, dict):
            for field_name, field_perms in perm_set.field_permissions.items():
                if isinstance(field_perms, dict):
                    if field_perms.get('read', False):
                        permissions['fields']['read'].add(field_name)
                    if field_perms.get('write', False):
                        permissions['fields']['write'].add(field_name)

    return permissions

# --- Example Usage (e.g., in a serializer or view) ---
# user = request.user
# resource_id = 'catalog.product'
# user_perms = get_user_permissions_for_resource(user, resource_id)
#
# if user_perms['read']:
#     print("User can read the resource.")
#     readable_fields = user_perms['fields']['read']
#     if readable_fields:
#         print(f"Specifically allowed to read fields: {readable_fields}")
#     else:
#         print("Allowed to read all fields (no specific field restrictions).")
#
# if user_perms['update']:
#     print("User can update the resource.")
#     writable_fields = user_perms['fields']['write']
#     if writable_fields:
#          print(f"Specifically allowed to write fields: {writable_fields}")
#     else:
#          print("Allowed to write all fields (no specific field restrictions).")

