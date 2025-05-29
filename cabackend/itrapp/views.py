from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db import connection
from django.apps import apps
from django.conf import settings
from django.core.management import call_command
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
import os

# this api will be called when tenant is created and assigned to this app then
# @api_view(['POST'])
# @permission_classes([AllowAny])
# def migrate_tenant_schema(request):
#     """
#     API endpoint to migrate all tables to a specific tenant schema
#     Expects: {
#         "tenant_schema": "schema_name"
#     }
#     """
#     try:
#         tenant_schema = request.data.get('tenant_schema')
#         if not tenant_schema:
#             return Response({
#                 'error': 'tenant_schema is required'
#             }, status=400)

#         # Create schema if it doesn't exist
#         with connection.cursor() as cursor:
#             cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {tenant_schema}")
            
#         # Get shared and tenant apps from settings
#         from django.conf import settings
        
#         # Get all apps that need to be migrated
#         tenant_apps = settings.TENANT_APPS
#         shared_apps = settings.SHARED_APPS
        
#         # Get project apps (only those in TENANT_APPS since we're migrating a tenant schema)
#         project_apps = [app_config for app_config in apps.get_app_configs() 
#                        if app_config.name in tenant_apps]
        
#         try:
#             # Create tables for each app in the tenant schema
#             with connection.cursor() as cursor:
#                 # Set search path to the tenant schema
#                 cursor.execute(f"SET search_path TO {tenant_schema}, public")
                
#                 # First create essential tables
#                 tables = [
#                     # django_migrations table
#                     """
#                     CREATE TABLE IF NOT EXISTS django_migrations (
#                         id serial PRIMARY KEY,
#                         app VARCHAR(255) NOT NULL,
#                         name VARCHAR(255) NOT NULL,
#                         applied TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
#                     );
#                     """,
#                     # django_content_type table
#                     """
#                     CREATE TABLE IF NOT EXISTS django_content_type (
#                         id serial PRIMARY KEY,
#                         app_label VARCHAR(100) NOT NULL,
#                         model VARCHAR(100) NOT NULL,
#                         CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)
#                     );
#                     """,
#                     # auth_permission table
#                     """
#                     CREATE TABLE IF NOT EXISTS auth_permission (
#                         id serial PRIMARY KEY,
#                         name VARCHAR(255) NOT NULL,
#                         content_type_id INTEGER NOT NULL,
#                         codename VARCHAR(100) NOT NULL,
#                         CONSTRAINT auth_permission_content_type_id_codename_key UNIQUE (content_type_id, codename),
#                         CONSTRAINT auth_permission_content_type_id_fkey FOREIGN KEY (content_type_id)
#                             REFERENCES django_content_type (id) DEFERRABLE INITIALLY DEFERRED
#                     );
#                     """,
#                     # auth_user table
#                     """
#                     CREATE TABLE IF NOT EXISTS auth_user (
#                         id serial PRIMARY KEY,
#                         password VARCHAR(128) NOT NULL,
#                         last_login TIMESTAMP WITH TIME ZONE NULL,
#                         is_superuser BOOLEAN NOT NULL,
#                         username VARCHAR(150) NOT NULL UNIQUE,
#                         first_name VARCHAR(150) NOT NULL,
#                         last_name VARCHAR(150) NOT NULL,
#                         email VARCHAR(254) NOT NULL,
#                         is_staff BOOLEAN NOT NULL,
#                         is_active BOOLEAN NOT NULL,
#                         date_joined TIMESTAMP WITH TIME ZONE NOT NULL
#                     );
#                     """,
#                     # auth_group table
#                     """
#                     CREATE TABLE IF NOT EXISTS auth_group (
#                         id serial PRIMARY KEY,
#                         name VARCHAR(150) NOT NULL UNIQUE
#                     );
#                     """,
#                     # auth_group_permissions table
#                     """
#                     CREATE TABLE IF NOT EXISTS auth_group_permissions (
#                         id serial PRIMARY KEY,
#                         group_id INTEGER NOT NULL,
#                         permission_id INTEGER NOT NULL,
#                         CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id),
#                         CONSTRAINT auth_group_permissions_group_id_fkey FOREIGN KEY (group_id)
#                             REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED,
#                         CONSTRAINT auth_group_permissions_permission_id_fkey FOREIGN KEY (permission_id)
#                             REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
#                     );
#                     """,
#                     # auth_user_groups table
#                     """
#                     CREATE TABLE IF NOT EXISTS auth_user_groups (
#                         id serial PRIMARY KEY,
#                         user_id INTEGER NOT NULL,
#                         group_id INTEGER NOT NULL,
#                         CONSTRAINT auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id),
#                         CONSTRAINT auth_user_groups_user_id_fkey FOREIGN KEY (user_id)
#                             REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,
#                         CONSTRAINT auth_user_groups_group_id_fkey FOREIGN KEY (group_id)
#                             REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED
#                     );
#                     """,
#                     # auth_user_user_permissions table
#                     """
#                     CREATE TABLE IF NOT EXISTS auth_user_user_permissions (
#                         id serial PRIMARY KEY,
#                         user_id INTEGER NOT NULL,
#                         permission_id INTEGER NOT NULL,
#                         CONSTRAINT auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id),
#                         CONSTRAINT auth_user_user_permissions_user_id_fkey FOREIGN KEY (user_id)
#                             REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,
#                         CONSTRAINT auth_user_user_permissions_permission_id_fkey FOREIGN KEY (permission_id)
#                             REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
#                     );
#                     """
#                 ]
                
#                 # Create all tables
#                 for sql in tables:
#                     try:
#                         cursor.execute(sql)
#                     except Exception as e:
#                         if 'already exists' not in str(e):
#                             raise e
                
#                 # First migrate auth since it's in TENANT_APPS
#                 try:
#                     call_command('migrate', 'auth', interactive=False)
#                 except Exception as e:
#                     print(f"Warning migrating auth: {str(e)}")
                
#                 # Then migrate other apps
#                 for app_config in project_apps:
#                     try:
#                         # Get the app label (last part of the app name)
#                         app_label = app_config.label
                        
#                         # Skip already migrated apps
#                         if app_label in ['contenttypes', 'auth']:
#                             continue
                        
#                         # Check if app has migrations
#                         migrations_module = f"{app_config.name}.migrations"
#                         try:
#                             __import__(migrations_module)
#                             # Run migrate for this app
#                             call_command('migrate', app_label, interactive=False)
#                         except ImportError:
#                             # Skip apps without migrations
#                             print(f"Skipping {app_config.name}: No migrations found")
#                             continue
#                     except Exception as migration_error:
#                         print(f"Error migrating {app_config.name}: {str(migration_error)}")
#                         raise migration_error
                
#                 # Reset search path to public
#                 cursor.execute("SET search_path TO public")
            
#             return Response({
#                 'message': f'Successfully migrated tables to schema {tenant_schema}',
#                 'schema': tenant_schema
#             })
        
#         finally:
#             # Always reset search path to public
#             with connection.cursor() as cursor:
#                 cursor.execute("SET search_path TO public")
        
#     except Exception as e:
#         return Response({
#             'error': str(e)
#         }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def migrate_tenant_schema(request):
    """
    API endpoint to migrate all tables to a specific tenant schema
    Expects: {
        "tenant_schema": "schema_name"
    }
    """
    from django.apps import apps
    from django.db import connection
    from django.conf import settings
    from django.core.management import call_command
    from rest_framework.response import Response
    from rest_framework.decorators import api_view, permission_classes
    from rest_framework.permissions import AllowAny

    try:
        tenant_schema = request.data.get('tenant_schema')
        if not tenant_schema:
            return Response({
                'error': 'tenant_schema is required'
            }, status=400)

        # Create schema if it doesn't exist
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {tenant_schema}")
            
        # Get all installed apps
        tenant_apps = settings.TENANT_APPS
        project_apps = [app_config for app_config in apps.get_app_configs() 
                       if app_config.name in tenant_apps]
        
        try:
            # Set search path to the tenant schema
            with connection.cursor() as cursor:
                cursor.execute(f"SET search_path TO {tenant_schema}, public")
                
                # First, ensure we have the django_migrations table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS django_migrations (
                        id serial PRIMARY KEY,
                        app VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        applied TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                
                # Check if migrations have already been applied
                cursor.execute("""
                    SELECT 1 FROM django_migrations 
                    WHERE app = 'contenttypes' AND name = '0001_initial'
                """)
                contenttypes_migrated = cursor.fetchone() is not None
                
                # If contenttypes is not migrated, we need to run initial migrations
                if not contenttypes_migrated:
                    # Run initial migrations for contenttypes and auth
                    call_command('migrate', 'contenttypes', '0001_initial', interactive=False)
                    call_command('migrate', 'auth', '0001_initial', interactive=False)
                
                # Now run migrations for all other apps
                for app_config in project_apps:
                    app_label = app_config.label
                    
                    # Skip contenttypes and auth as they're already handled
                    if app_label in ['contenttypes', 'auth']:
                        continue
                        
                    try:
                        # Check if this app has migrations
                        migrations_module = f"{app_config.name}.migrations"
                        __import__(migrations_module)
                        
                        # Run migrate with fake-initial to skip already applied migrations
                        call_command('migrate', app_label, '--fake-initial', interactive=False)
                        
                    except ImportError:
                        print(f"Skipping {app_config.name}: No migrations found")
                        continue
                    except Exception as e:
                        if 'already exists' in str(e):
                            # If tables already exist, fake the migration
                            call_command('migrate', app_label, '--fake', interactive=False)
                        else:
                            print(f"Error migrating {app_config.name}: {str(e)}")
                            raise
                
                # Reset search path
                cursor.execute("SET search_path TO public")
            
            return Response({
                'message': f'Successfully migrated tables to schema {tenant_schema}',
                'schema': tenant_schema
            })
            
        except Exception as e:
            return Response({
                'error': f'Error during migration: {str(e)}'
            }, status=500)
            
        finally:
            # Always reset search path
            with connection.cursor() as cursor:
                cursor.execute("SET search_path TO public")
                
    except Exception as e:
        return Response({
            'error': f'Migration failed: {str(e)}'
        }, status=500)



from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import json
from rest_framework.permissions import IsAuthenticated
from itrapp.middleware import CustomJWTAuthentication, LicenseValidationMiddleware


# THis api need to bind for roles now don't need to call subcription_plan api
@csrf_exempt
@api_view(['GET'])
@authentication_classes([CustomJWTAuthentication])
@authentication_classes([LicenseValidationMiddleware])
@permission_classes([IsAuthenticated]) 
def get_user_subscription_plan_with_roles(request):
    """
    API endpoint to get subscription plan data and role-based features for a user.
    Returns all features if user has superRole (id=1).
    """
    if request.method != 'GET':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    try:
        tenant_id = getattr(request.user, '_tenant_id', None)
        user_id = request.user.id
        
        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:

            # Check if user has superRole (role_id = 1)
            cursor.execute("""
                SELECT 1 
                FROM role_controles_userroleassignment
                WHERE "user" = %s AND role_id = 1
                LIMIT 1
            """, [user_id])
            has_super_role = cursor.fetchone() is not None


            # Get user's assigned roles with their permissions
            cursor.execute("""
                WITH user_roles AS (
                    SELECT r.id, r.name, r.is_active, r.app_id
                    FROM role_controles_role r
                    INNER JOIN role_controles_userroleassignment ura ON r.id = ura.role_id
                    WHERE ura.user = %s AND r.is_active = true
                )
                SELECT 
                    ur.id,
                    ur.name,
                    ur.is_active,
                    ur.app_id,
                    mps.module_id,
                    mps.can_create,
                    mps.can_read,
                    mps.can_update,
                    mps.can_delete,
                    mps.field_permissions
                FROM user_roles ur
                LEFT JOIN role_controles_role_assigned_permissions rap ON ur.id = rap.role_id
                LEFT JOIN role_controles_modulepermissionset mps ON rap.modulepermissionset_id = mps.id
            """, [user_id])
            
            role_rows = cursor.fetchall()

            print("role_rows;;",role_rows)
            
            # Process roles and their permissions
            user_roles = {}
            role_module_permissions = {}
            combined_module_permissions = {}
            
            for row in role_rows:
                role_id = row[0]
                if role_id not in user_roles:
                    user_roles[role_id] = {
                        "id": role_id,
                        "name": row[1],
                        "is_active": row[2],
                        "app_id": row[3],
                        "modules": {}
                    }
                
                if row[4]:  # if module_id exists
                    module_id = row[4]
                    # Store permissions per role
                    if module_id not in user_roles[role_id]["modules"]:
                        user_roles[role_id]["modules"][module_id] = {
                            "can_create": row[5],
                            "can_read": row[6],
                            "can_update": row[7],
                            "can_delete": row[8],
                            "field_permissions": json.loads(row[9]) if row[9] else {}
                        }
                    # Store combined permissions for modules view
                    if module_id not in combined_module_permissions:
                        combined_module_permissions[module_id] = {
                            "can_create": False,
                            "can_read": False,
                            "can_update": False,
                            "can_delete": False,
                            "field_permissions": {}
                        }
                    
                    # Update combined permissions (OR operation)
                    combined_module_permissions[module_id]["can_create"] |= row[5]
                    combined_module_permissions[module_id]["can_read"] |= row[6]
                    combined_module_permissions[module_id]["can_update"] |= row[7]
                    combined_module_permissions[module_id]["can_delete"] |= row[8]

                    
                    # Merge field permissions
                    print("row9", row[9])
                    if row[9]:
                        field_perms = json.loads(row[9])
                        combined_module_permissions[module_id]["field_permissions"].update(field_perms)
                    
            # Get role permissions if not superRole
            role_permissions = set()
           
            if not has_super_role and user_roles:
                # Get role IDs from the user_roles dictionary keys
                role_ids = list(user_roles.keys())
                placeholders = ','.join(['%s'] * len(role_ids))
                cursor.execute(f"""
                    SELECT DISTINCT modulepermissionset_id
                    FROM role_controles_role_assigned_permissions
                    WHERE role_id IN ({placeholders})
                """, role_ids)
                role_permissions = {row[0] for row in cursor.fetchall()}

            # Fetch tenant and subscription data
            cursor.execute("""
                SELECT id, name, schema_name
                FROM ecomm_superadmin_tenants
                WHERE id = %s
            """, [tenant_id])
            tenant_row = cursor.fetchone()

            if not tenant_row:
                return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

            tenant = {
                'id': tenant_row[0],
                'name': tenant_row[1],
                'schema_name': tenant_row[2],
            }

            # Fetch the latest active license
            cursor.execute("""
                SELECT subscription_plan_snapshot::TEXT, features_snapshot::TEXT
                FROM ecomm_superadmin_tenant_subscriptions_licenses
                WHERE tenant_id = %s
                ORDER BY valid_from DESC
                LIMIT 1
            """, [tenant_id])
            license_row = cursor.fetchone()

            if not license_row:
                return Response({'error': 'No active license found for this tenant'}, status=status.HTTP_404_NOT_FOUND)

            # Parse JSONB to dict
            subscription_plan = json.loads(license_row[0])
            feature_snapshot = json.loads(license_row[1])


            # Build modules from feature_snapshot based on permissions
            modules = []
            for feature_key, feature in feature_snapshot.items():
                module_id = feature.get("id")
                
                # If super role, include all modules with full permissions and all subfeatures
                if has_super_role:
                    module_perms = {
                        "can_create": True,
                        "can_read": True,
                        "can_update": True,
                        "can_delete": True,
                        "field_permissions": {}
                    }
                    
                    # Include all subfeatures for super user
                    subfeatures = []
                    for subfeature in feature.get("subfeatures", []):
                        subfeatures.append({
                            "id": subfeature.get("id"),
                            "key": subfeature.get("key"),
                            "name": subfeature.get("name"),
                            "description": subfeature.get("description"),
                            "settings": subfeature.get("settings", {})
                        })
                    
                    module_data = {
                        "id": module_id,
                        "name": feature.get("name"),
                        "key": feature.get("key"),
                        "description": feature.get("description"),
                        "app_id": feature.get("app_id"),
                        "is_active": feature.get("is_active", True),
                        "permissions": module_perms,
                        "subfeatures": subfeatures,
                        "role_permissions": {1: module_perms}  # Super role has all permissions
                    }
                    modules.append(module_data)
                    continue  # Skip to next module
                
                # Otherwise, check role permissions
                elif module_id in combined_module_permissions and combined_module_permissions[module_id]["can_read"]:
                    module_perms = combined_module_permissions.get(module_id, {
                        "can_create": False,
                        "can_read": False,
                        "can_update": False,
                        "can_delete": False,
                        "field_permissions": {}
                    })

                    module_data = {
                        "id": module_id,
                        "name": feature.get("name"),
                        "key": feature.get("key"),
                        "description": feature.get("description"),
                        "app_id": feature.get("app_id"),
                        "is_active": feature.get("is_active"),
                        "permissions": module_perms,
                        "subfeatures": [],
                        "role_permissions": {}
                    }
                    
                    # Process subfeatures based on permissions
                    for subfeature in feature.get("subfeatures", []):
                        if module_perms.get("field_permissions", {}).get(str(subfeature["id"]), {}).get("enabled", False):
                            module_data["subfeatures"].append(subfeature)
                    
                    # Add module permissions for each role
                    for role_id, role_data in user_roles.items():
                        if module_id in role_data["modules"]:
                            module_data["role_permissions"][role_id] = role_data["modules"][module_id]
                    
                    modules.append(module_data)

            # Include modules in the subscription_plan
            subscription_plan["modules"] = modules

            # Process roles for response
            user_role_info = []
            
            # Always include super role if user has it
            if has_super_role:
                super_role_modules = []
                # Include all modules for super role
                for module in modules:
                    super_role_modules.append({
                        "id": module["id"],
                        "name": module["name"],
                        "key": module["key"],
                        "permissions": {
                            "can_create": True,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": True,
                            "field_permissions": {}
                        },
                        "subfeatures": [
                            {
                                "id": sf["id"],
                                "key": sf["key"],
                                "name": sf["name"],
                                "permissions": {
                                    "can_create": True,
                                    "can_read": True,
                                    "can_update": True,
                                    "can_delete": True,
                                    "field_permissions": {}
                                }
                            } for sf in module.get("subfeatures", [])
                        ]
                    })
                
                user_role_info.append({
                    "id": 1,
                    "name": "Super Admin",
                    "is_active": True,
                    "app_id": 1,
                    "modules": super_role_modules
                })
                
            # Add other roles with their modules
            for role_id, role_data in user_roles.items():
                # Skip super role as we already added it
                if role_id == 1:
                    continue
                    
                # Skip roles with no modules
                if not role_data.get("modules"):
                    continue
                    
                role_info = {
                    "id": role_data["id"],
                    "name": role_data["name"],
                    "is_active": role_data["is_active"],
                    "app_id": role_data["app_id"],
                    "modules": []
                }
                
                # Add module permissions for this role
                for feature_key, feature in feature_snapshot.items():
                    module_id = feature.get("id")
                    
                    # For super role or if module is assigned to role
                    if has_super_role or module_id in role_data["modules"]:
                        module_perms = {
                            "can_create": True,
                            "can_read": True,
                            "can_update": True,
                            "can_delete": True,
                            "field_permissions": {}
                        } if has_super_role else role_data["modules"].get(module_id, {
                            "can_create": False,
                            "can_read": False,
                            "can_update": False,
                            "can_delete": False,
                            "field_permissions": {}
                        })
                        
                        module_info = {
                            "id": module_id,
                            "name": feature.get("name"),
                            "key": feature.get("key"),
                            "description": feature.get("description"),
                            "app_id": feature.get("app_id"),
                            "is_active": feature.get("is_active"),
                            "permissions": module_perms,
                            "subfeatures": feature.get("subfeatures", [])
                        }
                        role_info["modules"].append(module_info)
                
                user_role_info.append(role_info)

            # Response payload
            return Response({
                "tenant_id": tenant["id"],
                "tenant_name": tenant["name"],
                "schema_name": tenant["schema_name"],
                # "subscription_plan": subscription_plan,
                "user_roles": user_role_info,
                "has_super_role": has_super_role
            }, status=status.HTTP_200_OK)

    except Exception as e:
        print("Internal server error:", e)
        return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@authentication_classes([LicenseValidationMiddleware])
@permission_classes([IsAuthenticated]) 
def get_subscription_plan_by_tenant(request):
    """
    API endpoint to get subscription plan data based on tenant_id using raw SQL.
    """
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    try:
        tenant_id = getattr(request.user, '_tenant_id', None)

        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=status.HTTP_400_BAD_REQUEST)

        with connection.cursor() as cursor:
            # Fetch tenant info
            cursor.execute("""
                SELECT id, name, schema_name
                FROM ecomm_superadmin_tenants
                WHERE id = %s
            """, [tenant_id])
            tenant_row = cursor.fetchone()

            if not tenant_row:
                return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

            tenant = {
                'id': tenant_row[0],
                'name': tenant_row[1],
                'schema_name': tenant_row[2],
            }

            # Fetch the latest active license for the tenant
            cursor.execute("""
                SELECT subscription_plan_snapshot::TEXT, features_snapshot::TEXT
                FROM ecomm_superadmin_tenant_subscriptions_licenses
                WHERE tenant_id = %s
                ORDER BY valid_from DESC
                LIMIT 1
            """, [tenant_id])
            license_row = cursor.fetchone()

            if not license_row:
                return Response({'error': 'No active license found for this tenant'}, status=status.HTTP_404_NOT_FOUND)

            # Parse JSONB to dict
            subscription_plan = json.loads(license_row[0])
            feature_snapshot = json.loads(license_row[1])

            # Build modules from feature_snapshot
            modules = []
            for feature in feature_snapshot.values():
                modules.append({
                    "id": feature.get("id"),
                    "name": feature.get("name"),
                    "key": feature.get("key"),
                    "description": feature.get("description"),
                    "features": feature.get("subfeatures", [])
                })

            # Include modules in the subscription_plan
            subscription_plan["modules"] = modules

        # Response payload
        return Response({
            "tenant_id": tenant["id"],
            "tenant_name": tenant["name"],
            "schema_name": tenant["schema_name"],
            "subscription_plan": subscription_plan
        }, status=status.HTTP_200_OK)

    except Exception as e:
        print("Internal server error:", e)
        return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)