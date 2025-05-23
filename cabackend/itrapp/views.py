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
@api_view(['POST'])
@permission_classes([AllowAny])
def migrate_tenant_schema(request):
    """
    API endpoint to migrate all tables to a specific tenant schema
    Expects: {
        "tenant_schema": "schema_name"
    }
    """
    try:
        tenant_schema = request.data.get('tenant_schema')
        if not tenant_schema:
            return Response({
                'error': 'tenant_schema is required'
            }, status=400)

        # Create schema if it doesn't exist
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE SCHEMA IF NOT EXISTS {tenant_schema}")
            
        # Get shared and tenant apps from settings
        from django.conf import settings
        
        # Get all apps that need to be migrated
        tenant_apps = settings.TENANT_APPS
        shared_apps = settings.SHARED_APPS
        
        # Get project apps (only those in TENANT_APPS since we're migrating a tenant schema)
        project_apps = [app_config for app_config in apps.get_app_configs() 
                       if app_config.name in tenant_apps]
        
        try:
            # Create tables for each app in the tenant schema
            with connection.cursor() as cursor:
                # Set search path to the tenant schema
                cursor.execute(f"SET search_path TO {tenant_schema}, public")
                
                # First create essential tables
                tables = [
                    # django_migrations table
                    """
                    CREATE TABLE IF NOT EXISTS django_migrations (
                        id serial PRIMARY KEY,
                        app VARCHAR(255) NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        applied TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    """,
                    # django_content_type table
                    """
                    CREATE TABLE IF NOT EXISTS django_content_type (
                        id serial PRIMARY KEY,
                        app_label VARCHAR(100) NOT NULL,
                        model VARCHAR(100) NOT NULL,
                        CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)
                    );
                    """,
                    # auth_permission table
                    """
                    CREATE TABLE IF NOT EXISTS auth_permission (
                        id serial PRIMARY KEY,
                        name VARCHAR(255) NOT NULL,
                        content_type_id INTEGER NOT NULL,
                        codename VARCHAR(100) NOT NULL,
                        CONSTRAINT auth_permission_content_type_id_codename_key UNIQUE (content_type_id, codename),
                        CONSTRAINT auth_permission_content_type_id_fkey FOREIGN KEY (content_type_id)
                            REFERENCES django_content_type (id) DEFERRABLE INITIALLY DEFERRED
                    );
                    """,
                    # auth_user table
                    """
                    CREATE TABLE IF NOT EXISTS auth_user (
                        id serial PRIMARY KEY,
                        password VARCHAR(128) NOT NULL,
                        last_login TIMESTAMP WITH TIME ZONE NULL,
                        is_superuser BOOLEAN NOT NULL,
                        username VARCHAR(150) NOT NULL UNIQUE,
                        first_name VARCHAR(150) NOT NULL,
                        last_name VARCHAR(150) NOT NULL,
                        email VARCHAR(254) NOT NULL,
                        is_staff BOOLEAN NOT NULL,
                        is_active BOOLEAN NOT NULL,
                        date_joined TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                    """,
                    # auth_group table
                    """
                    CREATE TABLE IF NOT EXISTS auth_group (
                        id serial PRIMARY KEY,
                        name VARCHAR(150) NOT NULL UNIQUE
                    );
                    """,
                    # auth_group_permissions table
                    """
                    CREATE TABLE IF NOT EXISTS auth_group_permissions (
                        id serial PRIMARY KEY,
                        group_id INTEGER NOT NULL,
                        permission_id INTEGER NOT NULL,
                        CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id),
                        CONSTRAINT auth_group_permissions_group_id_fkey FOREIGN KEY (group_id)
                            REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED,
                        CONSTRAINT auth_group_permissions_permission_id_fkey FOREIGN KEY (permission_id)
                            REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
                    );
                    """,
                    # auth_user_groups table
                    """
                    CREATE TABLE IF NOT EXISTS auth_user_groups (
                        id serial PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        group_id INTEGER NOT NULL,
                        CONSTRAINT auth_user_groups_user_id_group_id_key UNIQUE (user_id, group_id),
                        CONSTRAINT auth_user_groups_user_id_fkey FOREIGN KEY (user_id)
                            REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,
                        CONSTRAINT auth_user_groups_group_id_fkey FOREIGN KEY (group_id)
                            REFERENCES auth_group (id) DEFERRABLE INITIALLY DEFERRED
                    );
                    """,
                    # auth_user_user_permissions table
                    """
                    CREATE TABLE IF NOT EXISTS auth_user_user_permissions (
                        id serial PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        permission_id INTEGER NOT NULL,
                        CONSTRAINT auth_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id),
                        CONSTRAINT auth_user_user_permissions_user_id_fkey FOREIGN KEY (user_id)
                            REFERENCES auth_user (id) DEFERRABLE INITIALLY DEFERRED,
                        CONSTRAINT auth_user_user_permissions_permission_id_fkey FOREIGN KEY (permission_id)
                            REFERENCES auth_permission (id) DEFERRABLE INITIALLY DEFERRED
                    );
                    """
                ]
                
                # Create all tables
                for sql in tables:
                    try:
                        cursor.execute(sql)
                    except Exception as e:
                        if 'already exists' not in str(e):
                            raise e
                
                # First migrate auth since it's in TENANT_APPS
                try:
                    call_command('migrate', 'auth', interactive=False)
                except Exception as e:
                    print(f"Warning migrating auth: {str(e)}")
                
                # Then migrate other apps
                for app_config in project_apps:
                    try:
                        # Get the app label (last part of the app name)
                        app_label = app_config.label
                        
                        # Skip already migrated apps
                        if app_label in ['contenttypes', 'auth']:
                            continue
                        
                        # Check if app has migrations
                        migrations_module = f"{app_config.name}.migrations"
                        try:
                            __import__(migrations_module)
                            # Run migrate for this app
                            call_command('migrate', app_label, interactive=False)
                        except ImportError:
                            # Skip apps without migrations
                            print(f"Skipping {app_config.name}: No migrations found")
                            continue
                    except Exception as migration_error:
                        print(f"Error migrating {app_config.name}: {str(migration_error)}")
                        raise migration_error
                
                # Reset search path to public
                cursor.execute("SET search_path TO public")
            
            return Response({
                'message': f'Successfully migrated tables to schema {tenant_schema}',
                'schema': tenant_schema
            })
        
        finally:
            # Always reset search path to public
            with connection.cursor() as cursor:
                cursor.execute("SET search_path TO public")
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=500)





from django.db import connection
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import json
from rest_framework.permissions import IsAuthenticated
from itrapp.middleware import CustomJWTAuthentication

@csrf_exempt
@api_view(['POST'])
@authentication_classes([CustomJWTAuthentication])
@permission_classes([IsAuthenticated]) 
def get_subscription_plan_by_tenant(request):
    """
    API endpoint to get subscription plan data based on tenant_id using raw SQL.
    """
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    try:
        data = request.data
        tenant_id = request.user._tenant_id if hasattr(request.user, '_tenant_id') else None

        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        with connection.cursor() as cursor:
            # Get tenant details
            cursor.execute("""
                SELECT id, name, schema_name, subscription_plan_id
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
                'subscription_plan_id': tenant_row[3]
            }

            if not tenant['subscription_plan_id']:
                return Response({'error': 'No subscription plan associated with this tenant'}, status=status.HTTP_404_NOT_FOUND)

            # Get subscription plan
            cursor.execute("""
                SELECT id, name, description, price, status, valid_from, valid_until, max_users, storage_limit, support_level
                FROM subscription_plans
                WHERE id = %s
            """, [tenant['subscription_plan_id']])
            plan_row = cursor.fetchone()

            if not plan_row:
                return Response({'error': 'Subscription plan not found'}, status=status.HTTP_404_NOT_FOUND)
            
            subscription_plan = {
                "id": plan_row[0],
                "name": plan_row[1],
                "description": plan_row[2],
                "price": str(plan_row[3]),
                "status": plan_row[4],
                "valid_from": plan_row[5].isoformat(),
                "valid_until": plan_row[6].isoformat() if plan_row[6] else None,
                "max_users": plan_row[7],
                "storage_limit": plan_row[8],
                "support_level": plan_row[9],
                "modules": []
            }

            # Get feature entitlements
            cursor.execute("""
                SELECT f.id, f.name, f.key, f.description, f.granual_settings
                FROM plan_feature_entitlements pfe
                JOIN features f ON f.id = pfe.feature_id
                WHERE pfe.plan_id = %s
            """, [tenant['subscription_plan_id']])

            features = cursor.fetchall()
            for row in features:
                granual_settings = row[4]
                subfeatures = []
                if granual_settings:
                    try:
                        settings_json = json.loads(granual_settings)
                        subfeatures = settings_json.get("subfeatures", [])
                    except Exception:
                        pass
                
                subscription_plan["modules"].append({
                    "id": row[0],
                    "name": row[1],
                    "key": row[2],
                    "description": row[3],
                    "features": subfeatures
                })

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
