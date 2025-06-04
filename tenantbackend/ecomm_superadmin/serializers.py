#mseri
# ecomm_superadmin/serializers.py

from rest_framework import serializers
from .models import User, Tenant, Domain, Application, CrmClient, TenantApplication
from django.contrib.auth import get_user_model
from .models import (  # Import SHARED models from this app
    Tenant, Domain, User, Application,
    CrmClient, TenantApplication, TenantSubscriptionLicenses
)

from subscription_plan.models import PlanFeatureEntitlement

# Import TENANT models from their correct location
from ecomm_tenant.ecomm_tenant_admins.models import UserProfile, Role, UserRole
from subscription_plan.models import SubscriptionPlan
from django.utils import timezone
from .models import LineOfBusiness
import requests
import uuid
import json

User = get_user_model() # Get the active User model (ecomm_superadmin.User)

# --- Helper Serializers (Potentially used by UserSerializer) ---

class RoleSerializer(serializers.ModelSerializer):
    """ Serializer for the tenant-specific Role model (read-only context here) """
    class Meta:
        model = Role
        fields = ['name'] # Only show name for context

class UserRoleSerializer(serializers.ModelSerializer):
    """ Serializer for the tenant-specific UserRole model (read-only context here) """
    role = RoleSerializer(read_only=True)
    class Meta:
        model = UserRole
        fields = ['role']

class UserProfileSimpleSerializer(serializers.ModelSerializer):
    """ A simpler serializer for UserProfile when nested """
    class Meta:
        model = UserProfile
        # List only the fields you want to expose when profile is nested in User
        fields = ['is_company_admin', 'is_tenant_admin', 'is_email_verified', 'is_2fa_enabled', 'needs_2fa_setup']

# --- Main Serializers for ecomm_superadmin ---

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the SHARED User model. Safely includes profile and roles.
    """
    profile = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'is_active', 'is_staff', 'is_superuser', 'date_joined',
            #'is_tenant_admin', # Assuming this field is on your custom User model
            'profile', 'roles'
        ]
        read_only_fields = ('id', 'date_joined', 'is_staff', 'is_superuser', 'is_active')
        #, 'is_tenant_admin')

    def get_profile(self, obj):
        """
        Safely attempts to retrieve the UserProfile from the current schema.
        Returns profile data if found (for tenant users in tenant schema),
        None otherwise (e.g., for platform admins in public schema).
        """
        # This works because UserProfile.objects queries the schema
        # set by the django_tenants middleware for the current request.
        try:
            # For platform admins in public schema, return minimal profile data
            if obj.is_staff and not hasattr(obj, 'userprofile'):
                return {
                    'is_company_admin': False,
                    'is_tenant_admin': False,
                    'is_email_verified': True,
                    'is_2fa_enabled': False,
                    'needs_2fa_setup': False
                }
            
            profile = UserProfile.objects.get(user=obj)
            return UserProfileSimpleSerializer(profile).data
        except (UserProfile.DoesNotExist, Exception) as e:
            # Return default profile for platform admins
            if obj.is_staff:
                return {
                    'is_company_admin': False,
                    'is_tenant_admin': False,
                    'is_email_verified': True,
                    'is_2fa_enabled': False,
                    'needs_2fa_setup': False
                }
            return None # Expected for users without a profile in the current schema

    def get_roles(self, obj):
        """
        Safely attempts to retrieve UserRoles from the current schema.
        """
        try:
            # For platform admins in public schema, return admin role
            if obj.is_staff and not UserRole.objects.filter(user=obj).exists():
                return [{'role': {'name': 'Platform Admin'}}]
                
            user_roles = UserRole.objects.filter(user=obj)
            return UserRoleSerializer(user_roles, many=True).data
        except Exception as e:
            # For platform admins, return admin role
            if obj.is_staff:
                return [{'role': {'name': 'Platform Admin'}}]
            return []

class UserAdminSerializer(UserSerializer):
    """
    Serializer specifically for platform admins managing Users.
    Might show more or fewer fields than the standard UserSerializer.
    Inherits profile/roles methods from UserSerializer.
    """
    class Meta(UserSerializer.Meta): # Inherit Meta from UserSerializer
        # Example: Add fields only admins should see/edit, or adjust read_only
        fields = UserSerializer.Meta.fields + ['phone_number'] # Example adding phone
        read_only_fields = ('id', 'date_joined', 'last_login') # Example adjusting read_only

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """
    Serializer for the SubscriptionPlan model.
    """
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'
        
    # Add a method to expose the external_plan_id from features
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Add external_plan_id at the top level if it exists in features
        if instance.features and 'external_plan_id' in instance.features:
            representation['external_plan_id'] = instance.features['external_plan_id']
        return representation

class CrmClientSerializer(serializers.ModelSerializer):
    """Serializer for the CrmClient model."""
    tenant_count = serializers.SerializerMethodField()
    
    class Meta:
        model = CrmClient
        fields = ('id', 'client_name', 'contact_person_email', 'created_at', 'updated_at', 'tenant_count')
        read_only_fields = ('id', 'created_at', 'updated_at', 'tenant_count')
    
    def get_tenant_count(self, obj):
        """Return the number of tenants associated with this client."""
        return obj.tenants.count()

class TenantSerializer(serializers.ModelSerializer):
    """
    Serializer for the SHARED Tenant model (tenants).
    Includes write-only fields for creating the initial tenant admin.
    """
    assigned_applications = serializers.SerializerMethodField()

    client = CrmClientSerializer(read_only=True)
    client_id = serializers.PrimaryKeyRelatedField(
        queryset=CrmClient.objects.all(),
        source='client',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    # Admin fields - write only
    admin_email = serializers.EmailField(write_only=True, required=False)
    admin_first_name = serializers.CharField(write_only=True, required=False)
    admin_last_name = serializers.CharField(write_only=True, required=False)
    admin_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    # Contact email field
    contact_email = serializers.EmailField(write_only=True, required=False)
    
    # Subscription plan field
    subscription_plan = serializers.PrimaryKeyRelatedField(
        queryset=SubscriptionPlan.objects.all(),
        write_only=True,
        required=False,
        many=True
    )
    
    class Meta:
        model = Tenant
        fields = [
            'id', 'name', 'schema_name', 'url_suffix', 'status', 'environment',
            'default_url', 'created_at', 'updated_at',
            'assigned_applications', 'client', 'client_id', 
            'admin_email', 'admin_first_name', 'admin_last_name', 
            'admin_password', 'contact_email', 'subscription_plan'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'assigned_applications']
        extra_kwargs = {
            'name': {'required': True},
            'schema_name': {'required': True},
            'url_suffix': {'required': True},
            'status': {'required': False},
            'environment': {'required': True}
        }

    def validate_status(self, value):
        """
        Validate that the status is one of the allowed choices.
        If not provided, default to 'trial'.
        """
        if not value:
            return 'trial'  # Default to trial if not provided
            
        valid_choices = dict(Tenant.STATUS_CHOICES).keys()
        if value not in valid_choices:
            raise serializers.ValidationError(f"Status must be one of: {', '.join(valid_choices)}")
        return value

    def validate_environment(self, value):
        """
        Validate that the environment is one of the allowed choices.
        """
        valid_choices = dict(Tenant.ENVIRONMENT_CHOICES).keys()
        if value not in valid_choices:
            raise serializers.ValidationError(f"Environment must be one of: {', '.join(valid_choices)}")
        return value

    def create(self, validated_data):
        # Extract admin fields
        admin_email = validated_data.pop('admin_email', None)
        admin_first_name = validated_data.pop('admin_first_name', None)
        admin_last_name = validated_data.pop('admin_last_name', None)
        admin_password = validated_data.pop('admin_password', None)
        contact_email = validated_data.pop('contact_email', None)
        
        # Extract subscription_plan field (store it for later use)
        subscription_plan = validated_data.pop('subscription_plan', [])
        
        # Create the tenant without the subscription plan
        tenant = Tenant.objects.create(**validated_data)
        
        # Create schema and run migrations
        from django.db import connection
        cursor = connection.cursor()
        schema_name = tenant.schema_name
        
        # Create schema if it doesn't exist
        cursor.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"')
        
        # Create tenant tables
        cursor.execute(f"""
        -- User Management Tables
        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_tenantuser (
            id SERIAL PRIMARY KEY,
            password VARCHAR(128) NOT NULL,
            last_login TIMESTAMP WITH TIME ZONE,
            is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
            username VARCHAR(150) NOT NULL UNIQUE,
            first_name VARCHAR(150) NOT NULL,
            last_name VARCHAR(150) NOT NULL,
            email VARCHAR(254) NOT NULL UNIQUE,
            is_staff BOOLEAN NOT NULL DEFAULT FALSE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            date_joined TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            client_id INTEGER,
            company_id INTEGER,
            created_by VARCHAR(255),
            updated_by VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_userprofile (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES {schema_name}.ecomm_tenant_admins_tenantuser(id),
            is_company_admin BOOLEAN NOT NULL DEFAULT FALSE,
            is_tenant_admin BOOLEAN NOT NULL DEFAULT FALSE,
            is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
            is_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            needs_2fa_setup BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255)
        );

        -- Drop and recreate tables with CASCADE
        DROP TABLE IF EXISTS {schema_name}.ecomm_tenant_admins_rolepermission CASCADE;
        DROP TABLE IF EXISTS {schema_name}.ecomm_tenant_admins_userrole CASCADE;
        DROP TABLE IF EXISTS {schema_name}.ecomm_tenant_admins_role CASCADE;
        DROP TABLE IF EXISTS {schema_name}.ecomm_tenant_admins_permission CASCADE;
        
        -- Create permission table first
        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_permission (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            description TEXT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255)
        );

        -- Create role table
        CREATE TABLE {schema_name}.ecomm_tenant_admins_role (
            id SERIAL PRIMARY KEY,
            name VARCHAR(50) NOT NULL UNIQUE,
            description TEXT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255)
        );

        -- Create role and permission tables
        DO $$ 
        BEGIN
            -- Create base role table if not exists
            CREATE TABLE IF NOT EXISTS {schema_name}.role_controles_role (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                description TEXT NULL,
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                created_by VARCHAR(255),
                updated_by VARCHAR(255)
            );

            -- Add columns to role table if they don't exist
            BEGIN
                ALTER TABLE {schema_name}.role_controles_role 
                ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
            EXCEPTION WHEN duplicate_column THEN
                NULL;
            END;

            BEGIN
                ALTER TABLE {schema_name}.role_controles_role 
                ADD COLUMN IF NOT EXISTS app_id INTEGER;
            EXCEPTION WHEN duplicate_column THEN
                NULL;
            END;

            BEGIN
                ALTER TABLE {schema_name}.role_controles_role 
                ADD COLUMN IF NOT EXISTS client_id INTEGER;
            EXCEPTION WHEN duplicate_column THEN
                NULL;
            END;

            BEGIN
                ALTER TABLE {schema_name}.role_controles_role 
                ADD COLUMN IF NOT EXISTS company_id INTEGER;
            EXCEPTION WHEN duplicate_column THEN
                NULL;
            END;

            -- Create module permission set table
            CREATE TABLE IF NOT EXISTS {schema_name}.role_controles_modulepermissionset (
                id SERIAL PRIMARY KEY,
                module_id INTEGER NOT NULL,
                can_create BOOLEAN NOT NULL DEFAULT FALSE,
                can_read BOOLEAN NOT NULL DEFAULT FALSE,
                can_update BOOLEAN NOT NULL DEFAULT FALSE,
                can_delete BOOLEAN NOT NULL DEFAULT FALSE,
                field_permissions JSONB DEFAULT '{{}}'::jsonb,
                app_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                created_by INTEGER,
                updated_by INTEGER,
                client_id INTEGER,
                company_id INTEGER
            );

            -- Create role assigned permissions table
            CREATE TABLE IF NOT EXISTS {schema_name}.role_controles_role_assigned_permissions (
                id SERIAL PRIMARY KEY,
                role_id INTEGER REFERENCES {schema_name}.role_controles_role(id) ON DELETE CASCADE,
                modulepermissionset_id INTEGER REFERENCES {schema_name}.role_controles_modulepermissionset(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                created_by INTEGER,
                updated_by INTEGER,
                client_id INTEGER,
                company_id INTEGER
            );

            -- Create user role assignment table
            CREATE TABLE IF NOT EXISTS {schema_name}.role_controles_userroleassignment (
                id SERIAL PRIMARY KEY,
                assigned_on TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                role_id INTEGER REFERENCES {schema_name}.role_controles_role(id) ON DELETE CASCADE,
                "user" INTEGER NOT NULL,
                app_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                created_by INTEGER,
                updated_by INTEGER,
                client_id INTEGER,
                company_id INTEGER
            );

            -- Add unique constraint if it doesn't exist
            BEGIN
                ALTER TABLE {schema_name}.role_controles_role 
                ADD CONSTRAINT role_controles_role_name_app_id_key UNIQUE (name, app_id);
            EXCEPTION WHEN duplicate_table THEN
                NULL;
            END;
        END $$;

        -- Create role permission table
        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_rolepermission (
            id SERIAL PRIMARY KEY,
            role_id INTEGER REFERENCES {schema_name}.ecomm_tenant_admins_role(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES {schema_name}.ecomm_tenant_admins_permission(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255),
            UNIQUE(role_id, permission_id)
        );

        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_userrole (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES {schema_name}.ecomm_tenant_admins_tenantuser(id),
            role_id INTEGER REFERENCES {schema_name}.ecomm_tenant_admins_role(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255),
            UNIQUE(user_id, role_id)
        );

        -- Client Management Tables
        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_crmclients (
            id SERIAL PRIMARY KEY,
            client_name VARCHAR(255) NOT NULL,
            contact_person_email VARCHAR(254) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255)
        );

        -- Feature Management Tables
        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_features (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255)
        );

        -- Settings Tables
        CREATE TABLE IF NOT EXISTS {schema_name}.ecomm_tenant_admins_settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) NOT NULL UNIQUE,
            value TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            created_by VARCHAR(255),
            updated_by VARCHAR(255)
        );
        """)
        
        # Create or update admin user if provided
        if admin_email:
            try:
                # Try to get existing user
                user = User.objects.get(email=admin_email)
                # Update existing user's details if needed
                if admin_first_name:
                    user.first_name = admin_first_name
                if admin_last_name:
                    user.last_name = admin_last_name
                if admin_password:
                    user.set_password(admin_password)
                user.is_staff = True
                user.is_superuser = False
                user.save()
            except User.DoesNotExist:
                # Use email as username
                user = User.objects.create_user(
                    username=admin_email,
                    email=admin_email,
                    first_name=admin_first_name,
                    last_name=admin_last_name,
                    password=admin_password,
                    is_staff=True,
                    is_superuser=False
                )
            
            # Set the tenant relationship after user creation/update
            tenant.tenant_admin_email = admin_email
            tenant.save()

            # Create tenant admin user in tenant schema
            from django.db import connection
            cursor = connection.cursor()
            schema_name = tenant.schema_name

            # Create tenant admin user first
            cursor.execute(f"""
            INSERT INTO {schema_name}.ecomm_tenant_admins_tenantuser 
            (password, is_superuser, username, email, first_name, last_name, is_active, is_staff, date_joined, created_at, updated_at)
            VALUES (%s, TRUE, %s, %s, %s, %s, TRUE, TRUE, NOW(), NOW(), NOW())
            RETURNING id
            """, [user.password, admin_email, admin_email, admin_first_name or 'Admin', admin_last_name or 'User'])
            tenant_user_id = cursor.fetchone()[0]

            # Create user profile
            cursor.execute(f"""
            INSERT INTO {schema_name}.ecomm_tenant_admins_userprofile
            (user_id, is_company_admin, is_tenant_admin, is_email_verified, is_2fa_enabled, needs_2fa_setup, created_at, updated_at)
            VALUES (%s, TRUE, TRUE, TRUE, FALSE, FALSE, NOW(), NOW())
            """, [tenant_user_id])

            # Initialize app_ids and features
            app_ids = set([])  # Default app_id 1
            features = []
            subscriptions = []
            
            # Get subscription plans if provided
            # Extract IDs from subscription_plan objects
            subscription_plan_ids = []
            if subscription_plan:
                # Handle both list and single object cases
                if isinstance(subscription_plan, list):
                    subscription_plan_ids = [plan.id if hasattr(plan, 'id') else plan for plan in subscription_plan]
                else:
                    subscription_plan_ids = [subscription_plan.id if hasattr(subscription_plan, 'id') else subscription_plan]
            
            if subscription_plan_ids:
                for plan_id in subscription_plan_ids:
                    try:
                        subscription_plan = SubscriptionPlan.objects.get(id=plan_id)
                        print("subscription_pan123:", subscription_plan)
                        # Create subscription plan snapshot
                        subscription_plan_snapshot = {
                            'id': subscription_plan.id,
                            'name': subscription_plan.name,
                            'description': subscription_plan.description,
                            'price': str(subscription_plan.price),
                            'max_users': subscription_plan.max_users,
                            'transaction_limit': subscription_plan.transaction_limit,
                            'api_call_limit': subscription_plan.api_call_limit,
                            'storage_limit': subscription_plan.storage_limit,
                            'session_type': subscription_plan.session_type,
                            'support_level': subscription_plan.support_level,
                            'billing_cycle': subscription_plan.billing_cycle
                        }
                        
                        # Create features snapshot
                        features_dict = {}
                        for entitlement in subscription_plan.feature_entitlements.all().select_related('feature'):
                            feature = entitlement.feature
                            print("app_id123:", feature.app_id)
                            feature_data = {
                                'id': feature.id,
                                'name': feature.name,
                                'key': feature.key,
                                'description': feature.description,
                                'is_active': feature.is_active,
                                'app_id': feature.app_id,
                                'settings': feature.granual_settings if feature.granual_settings else {}
                            }
                            features_dict[str(feature.id)] = feature_data
                            
                            # Add app_id to set for role creation
                            if feature.app_id:
                                app_ids.add(feature.app_id)
                            
                            # Add to features list for role creation
                            features.append(feature_data)
                        
                        # Create subscription license
                        subscription = TenantSubscriptionLicenses.objects.create(
                            tenant=tenant,
                            subscription_plan=subscription_plan,
                            license_key=uuid.uuid4(),
                            license_status='active',
                            client_id=validated_data.get('client_id'),
                            company_id=validated_data.get('company_id'),
                            created_by=validated_data.get('created_by'),
                            valid_from=timezone.now(),
                            subscription_plan_snapshot=subscription_plan_snapshot,
                            features_snapshot=features_dict
                        )
                        
                        print(f"Created subscription license with key: {subscription.license_key}")
                        subscriptions.append(subscription)
                        
                    except SubscriptionPlan.DoesNotExist:
                        print(f"Subscription plan with id {plan_id} does not exist")
                        continue
                
                if not app_ids:
                    print("Warning: No valid app_ids found in subscription features")
                    # Add a default app_id of 1 if none found
                    app_ids.add(1)
                    print("Added default app_id: 1")
            else:
                print("No subscription plans provided, using default app_id: 1")
                
            # Get unique app_ids from features
            #     app_ids = set()
            #     for pf in plan_features:
            #         if pf.feature and pf.feature.app_id:
            #             app_ids.add(pf.feature.app_id)
            #             print(f"Added app_id: {pf.feature.app_id} from feature: {pf.feature.name}")
            #         else:
            #             print(f"Warning: Feature {pf.id} has no app_id")
                
            #     if not app_ids:
            #         print("Warning: No valid app_ids found in subscription plan features")
            #         # Add a default app_id of 1 if none found
            #         app_ids.add(1)
            #         print("Added default app_id: 1")
                
            #     # Create SuperRole for each application
            #     print(f"Creating SuperRoles for schema: {schema_name}")
            #     print(f"Found app_ids: {app_ids}")
                
            #     for app_id in app_ids:
            #         try:
            #             # First try with all columns
            #             sql = """
            #                 INSERT INTO \"{}\".role_controles_role 
            #                 (name, description, is_active, app_id, client_id, created_at, updated_at, created_by, updated_by)
            #                 VALUES (%s, %s, %s, %s, %s, NOW(), NOW(), %s, %s)
            #                 RETURNING id
            #             """.format(schema_name)
                        
            #             params = [
            #                 'SuperRole',
            #                 'Default super role with all access',
            #                 True,
            #                 app_id,
            #                 None,
            #                 1,
            #                 1

            #             ]
                        
            #             print(f"Executing SQL: {sql} with params: {params}")
            #             cursor.execute(sql, params)
            #             role_id = cursor.fetchone()[0]
            #             print(f"Created SuperRole with ID: {role_id}")
                        
            #             # Create ModulePermissionSet with full access for each feature
            #             for pf in plan_features:
            #                 if pf.feature and pf.feature.app_id == app_id:
            #                     # Create ModulePermissionSet
            #                     cursor.execute(f"""
            #                         INSERT INTO \"{schema_name}\".role_controles_modulepermissionset
            #                         (module_id, can_create, can_read, can_update, can_delete, field_permissions, app_id, created_at, updated_at)
            #                         VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            #                         RETURNING id
            #                     """, [
            #                         pf.feature.id,  # module_id is the feature id
            #                         True,  # can_create
            #                         True,  # can_read
            #                         True,  # can_update
            #                         True,  # can_delete
            #                         '{}',  # field_permissions (empty JSON)
            #                         app_id
            #                     ])
                                
            #                     permission_set_id = cursor.fetchone()[0]
                                
            #                     # Assign ModulePermissionSet to Role
            #                     cursor.execute(f"""
            #                         INSERT INTO \"{schema_name}\".role_controles_role_assigned_permissions
            #                         (role_id, modulepermissionset_id)
            #                         VALUES (%s, %s)
            #                     """, [role_id, permission_set_id])
                                
            #                     print(f"Assigned permission set {permission_set_id} to role {role_id} for feature {pf.feature.id}")
                        
            #             # Assign role to admin user
            #             # cursor.execute(f"""
            #             #     INSERT INTO \"{schema_name}\".role_controles_userroleassignment
            #             #     (assigned_on, role_id, \"user\",app_id, created_at, updated_at, created_by, updated_by)
            #             #     VALUES (NOW(), %s, %s, %s, NOW(), NOW(), %s, %s)
            #             # """, [
            #             #     role_id,
            #                 cursor.execute(sql, params)
            #                 role_id = cursor.fetchone()[0]
            #                 print(f"Created SuperRole with ID: {role_id}")
                            
            #                 # Create ModulePermissionSet with full access for each feature
            #                 for pf in plan_features:
            #                     if pf.feature and pf.feature.app_id == app_id:
            #                         # Create ModulePermissionSet
            #                         cursor.execute(f"""
            #                             INSERT INTO \"{schema_name}\".role_controles_modulepermissionset
            #                             (module_id, can_create, can_read, can_update, can_delete, field_permissions, app_id, created_at, updated_at)
            #                             VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            #                             RETURNING id
            #                         """, [
            #                             pf.feature.id,  # module_id is the feature id
            #                             True,  # can_create
            #                             True,  # can_read
            #                             True,  # can_update
            #                             True,  # can_delete
            #                             '{}',  # field_permissions (empty JSON)
            #                             app_id
            #                         ])
                                    
            #                         permission_set_id = cursor.fetchone()[0]
                                    
            #                         # Assign ModulePermissionSet to Role
            #                         cursor.execute(f"""
            #                             INSERT INTO \"{schema_name}\".role_controles_role_assigned_permissions
            #                             (role_id, modulepermissionset_id)
            #                             VALUES (%s, %s)
            #                         """, [role_id, permission_set_id])
                                    
            #                         print(f"Assigned permission set {permission_set_id} to role {role_id} for feature {pf.feature.id}")
                            
            #                 # Assign role to admin user
            #                 cursor.execute(f"""
            #                     INSERT INTO \"{schema_name}\".role_controles_userroleassignment
            #                     (assigned_on, role_id, \"user\", app_id, created_at, updated_at, created_by, updated_by)
            #                     VALUES (NOW(), %s, %s, %s, NOW(), NOW(), %s, %s)
            #                 """, [role_id, tenant_user_id, app_id, tenant_user_id, tenant_user_id])
                            
            #                 print(f"Assigned role {role_id} to user {tenant_user_id} for app {app_id}")
            #             else:
            #                 raise


            # Create SuperRole for each application
            print(f"Creating SuperRoles for schema: {schema_name}")
            print(f"Found app_ids: {app_ids}")
            
            for app_id in app_ids:
                try:
                    # Create SuperRole
                    cursor.execute(f"""
                        INSERT INTO \"{schema_name}\".role_controles_role 
                        (name, description, is_active, app_id, created_at, updated_at, created_by, updated_by)
                        VALUES (%s, %s, %s, %s, NOW(), NOW(), %s, %s)
                        RETURNING id
                    """, [
                        'SuperRole',
                        'Default super role with all access',
                        True,
                        app_id,
                        admin_email if admin_email else 'system',
                        admin_email if admin_email else 'system'
                    ])
                    role_id = cursor.fetchone()[0]
                    print(f"Created SuperRole with ID: {role_id}")
                    
                    # Create ModulePermissionSet for each feature if we have subscriptions
                    if subscriptions:
                        for feature in features:
                            if feature.get('app_id') == app_id:
                                # Get permissions from feature settings
                                field_permissions = feature.get('settings', {}).get('field_permissions', {})
                                # Convert dictionary to JSON string for PostgreSQL
                                field_permissions_json = json.dumps(field_permissions)
                                
                                cursor.execute(f"""
                                    INSERT INTO \"{schema_name}\".role_controles_modulepermissionset
                                    (module_id, can_create, can_read, can_update, can_delete, field_permissions, app_id, created_at, updated_at)
                                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                                    RETURNING id
                                """, [
                                    feature['id'],  # module_id is the feature id
                                    feature.get('settings', {}).get('can_create', True),  # can_create
                                    feature.get('settings', {}).get('can_read', True),   # can_read
                                    feature.get('settings', {}).get('can_update', True),  # can_update
                                    feature.get('settings', {}).get('can_delete', True),  # can_delete
                                    field_permissions_json,  # field_permissions as JSON string
                                    app_id
                                ])
                                
                                # Move this line inside the if block
                                result = cursor.fetchone()
                                if result:
                                    permission_set_id = result[0]
                                    
                                    # Assign ModulePermissionSet to Role only if we have a valid permission set
                                    cursor.execute(f"""
                                        INSERT INTO \"{schema_name}\".role_controles_role_assigned_permissions
                                        (role_id, modulepermissionset_id)
                                        VALUES (%s, %s)
                                    """, [role_id, permission_set_id])
                                    print(f"Assigned permission set {permission_set_id} to role {role_id} for feature {feature['id']}")
                    
                    # Check if app_id column exists in userroleassignment table
                    cursor.execute(f"""
                        SELECT column_name FROM information_schema.columns 
                        WHERE table_schema = %s AND table_name = 'role_controles_userroleassignment' AND column_name = 'app_id'
                    """, [schema_name])
                    column_exists = cursor.fetchone()

                    # Add app_id column if it doesn't exist
                    if not column_exists:
                        print(f"Adding app_id column to {schema_name}.role_controles_userroleassignment")
                        cursor.execute(f"""
                            ALTER TABLE \"{schema_name}\".role_controles_userroleassignment 
                            ADD COLUMN app_id INTEGER
                        """)

                    # Assign role to admin user
                    cursor.execute(f"""
                        INSERT INTO \"{schema_name}\".role_controles_userroleassignment
                        (assigned_on, role_id, \"user\", app_id, created_at, updated_at, created_by, updated_by)
                        VALUES (NOW(), %s, %s, %s, NOW(), NOW(), %s, %s)
                    """, [role_id, tenant_user_id, app_id, tenant_user_id, tenant_user_id])
                    
                    print(f"Assigned role {role_id} to user {tenant_user_id} for app {app_id}")
                    
                    # Get app details and call migration endpoint
                    try:
                        app = Application.objects.get(app_id=app_id)
                        if app.app_backend_url and app.migrate_schema_endpoint:
                            # Clean and validate URLs
                            base_url = app.app_backend_url.strip().rstrip('/')
                            endpoint = app.migrate_schema_endpoint.strip().strip('/')
                            
                            if not base_url.startswith(('http://', 'https://')):
                                base_url = f'http://{base_url}'
                            
                            # Construct the full URL
                            url = f"{base_url}/{endpoint}/"
                            
                            print(f"Calling schema migration for app '{app.application_name}' at URL: {url}")

                            # Start app migration in background
                            from concurrent.futures import ThreadPoolExecutor
                            from functools import partial
                            
                            def call_migration_endpoint(url, data):
                                try:
                                    response = requests.post(
                                        url=url,
                                        json=data,
                                        headers={
                                            "Content-Type": "application/json",
                                            "Accept": "application/json"
                                        },
                                        timeout=60  # 5 seconds timeout
                                    )
                                    response.raise_for_status()
                                    print(f"Successfully migrated schema for app '{app.application_name}' at {url}")
                                except Exception as e:
                                    print(f"Background migration failed for app '{app.application_name}': {str(e)}")
                            
                            # Prepare request data
                            migration_data = {
                                "tenant_schema": schema_name,
                                "tenant_id": tenant.id,
                                "app_id": app.app_id
                            }
                            
                            # Start migration in background thread
                            with ThreadPoolExecutor(max_workers=1) as executor:
                                future = executor.submit(call_migration_endpoint, url, migration_data)
                            print(f"Started background migration for app '{app.application_name}' at {url}")
                                
                        else:
                            print(f"Skipping migration for app {app_id} - missing backend URL or migrate endpoint")
                            
                    except Application.DoesNotExist:
                        print(f"Application with ID {app_id} not found")
                    except requests.Timeout:
                        print(f"Timeout while calling schema migration for app {app_id}")
                    except requests.ConnectionError:
                        print(f"Connection error while calling schema migration for app {app_id}. Please check if the service is running.")
                    except requests.RequestException as app_error:
                        print(f"Failed to call schema migration for app {app_id}: {str(app_error)}")
                    except Exception as e:
                        print(f"Error migrating app {app_id}: {str(e)}")
                    
                except Exception as e:
                    print(f"Error creating SuperRole: {str(e)}")
                    raise

            # Set contact email if provided
            if contact_email:
                tenant.tenant_admin_email = contact_email
                tenant.save()

            # Close cursor after all operations are complete
            cursor.close()

            return tenant

    def update(self, instance, validated_data):
        # Remove admin fields if present (they shouldn't be used in updates)
        validated_data.pop('admin_email', None)
        validated_data.pop('admin_first_name', None)
        validated_data.pop('admin_last_name', None)
        validated_data.pop('admin_password', None)
        
        # Update tenant without subscription plan first
        tenant = super().update(instance, validated_data)
        
        return tenant

    def get_assigned_applications(self, obj):
        """Get the applications assigned to this tenant."""
        tenant_applications = TenantApplication.objects.filter(tenant=obj, is_active=True)
        applications = [ta.application for ta in tenant_applications]
        return ApplicationDisplaySerializer(applications, many=True).data
    
class DomainSerializer(serializers.ModelSerializer):
    """
    Serializer for the SHARED Domain model.
    """
    class Meta:
        model = Domain
        fields = '__all__'
        # Consider making 'tenant' read-only or write-only depending on use case
        # read_only_fields = ('tenant',)

class LoginSerializer(serializers.Serializer):
    """
    Serializer for standard login requests (email/password).
    Used by both platform admin and potentially tenant login views.
    """
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        style={'input_type': 'password'},
        trim_whitespace=False,
        required=True
    )
    # No validate method needed here - authentication happens in the view

class ApplicationDisplaySerializer(serializers.ModelSerializer):
    """
    Simplified serializer for displaying Application information in responses.
    """
    class Meta:
        model = Application
        fields = ['app_id', 'application_name', 'is_active']

class ApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Application model from public schema.
    """
    class Meta:
        model = Application
        fields = '__all__'
        read_only_fields = ['app_id', 'created_at', 'updated_at']

    def validate_application_name(self, value):
        """
        Validate that the application name is unique.
        """
        instance = getattr(self, 'instance', None)
        if instance and instance.application_name == value:
            return value

        if Application.objects.filter(application_name__iexact=value).exists():
            raise serializers.ValidationError("An application with this name already exists.")
        return value

    def validate_app_default_url(self, value):
        """
        Validate that the default URL is a valid URL.
        """
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("URL must start with http:// or https://")
        return value

    def validate_app_endpoint_route(self, value):
        """
        Validate that the endpoint route starts with a slash.
        """
        if not value.startswith('/'):
            raise serializers.ValidationError("Endpoint route must start with a slash (/)")
        return value

    def validate_app_secret_key(self, value):
        """
        Validate that the secret key is not empty and has a minimum length.
        """
        if not value or len(value.strip()) < 6:
            raise serializers.ValidationError("Secret key must be at least 6 characters long")
        return value

class LineOfBusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = LineOfBusiness
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    def create(self, validated_data):
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)