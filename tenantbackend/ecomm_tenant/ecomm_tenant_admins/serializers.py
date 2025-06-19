# --- serializers.py ---

from rest_framework import serializers
from ecomm_superadmin.models import User, Tenant, SubscriptionPlan, Application, TenantApplication # Assuming 'User' here is the base user model
from ecomm_tenant.ecomm_tenant_admins.models import ( # Adjust imports as per your project structure
    UserProfile,
    PendingRegistration,
    Role,
    Permission,
    UserRole,
    RolePermission,
    Company,
    TenantUser # Assuming TenantUser is your tenant-specific user model
)
from django.contrib.auth.hashers import make_password
from django.utils import timezone # Needed for setting timestamps
import secrets # Needed for password generation
import string  # Needed for password generation
import re      # Needed for schema name generation

# Base User Serializer (Used by others)
class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the base User model.
    """
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User # Use your base User model
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'date_joined', 'profile')
        read_only_fields = ('id', 'date_joined')

    def get_profile(self, obj):
        """
        Get the user profile data. Handles potential UserProfile.DoesNotExist.
        """
        try:
            # Assuming UserProfile has a OneToOneField to the base User model
            profile = UserProfile.objects.get(user_id=obj.id)
            return {
                'is_company_admin': profile.is_company_admin,
                'is_tenant_admin': profile.is_tenant_admin,
                'nationality': profile.nationality,
                'is_email_verified': profile.is_email_verified,
                'is_2fa_enabled': profile.is_2fa_enabled,
                'needs_2fa_setup': profile.needs_2fa_setup,
                'company_id': profile.company_id # Include company_id if relevant
            }
        except UserProfile.DoesNotExist:
            return None
        except AttributeError: # Handle case where profile might be None unexpectedly
             return None

# Email Check Serializer
class EmailCheckSerializer(serializers.Serializer):
    """
    Serializer for checking email availability during signup.
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """
        Validate that the email is in a valid format and normalize.
        """
        return value.lower()  # Normalize to lowercase

# User Registration Serializer (Creates Base User and Profile)
class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration (likely for the initial superadmin/company admin).
    Creates both User and UserProfile.
    """
    first_name = serializers.CharField(write_only=True, required=True)
    last_name = serializers.CharField(write_only=True, required=True)
    nationality = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User # Use your base User model
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'nationality', 'password', 'password_confirm')
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': False} # Username optional, defaults to email
        }

    def validate_email(self, value):
        """
        Validate that the email is unique in the base User table.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def validate(self, data):
        """
        Validate that the passwords match and set username if not provided.
        """
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        # Use email as username if not provided
        if not data.get('username'):
            data['username'] = data.get('email')

        return data

    def create(self, validated_data):
        """
        Create and return a new base user with encrypted password and user profile.
        """
        first_name = validated_data.pop('first_name')
        last_name = validated_data.pop('last_name')
        nationality = validated_data.pop('nationality', None)
        validated_data.pop('password_confirm')

        # Create the base user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )

        # Create the associated user profile
        # Note: Assumes this registration is for a Company Admin initially
        UserProfile.objects.create(
            user=user,
            nationality=nationality,
            is_company_admin=True, # Adjust based on registration context
            is_tenant_admin=False, # Adjust based on registration context
            is_email_verified=False, # Usually requires email confirmation step
            created_at=timezone.now(),
            updated_at=timezone.now(),
            # company_id might be set later or based on context
        )

        return user

# Pending Registration Serializer
class PendingRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for pending user registration (e.g., requiring OTP verification).
    """
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = PendingRegistration
        fields = ('id', 'email', 'first_name', 'last_name', 'nationality', 'password', 'password_confirm', 'otp')
        read_only_fields = ('id', 'otp')
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate_email(self, value):
        """
        Validate that the email isn't already in the main User table.
        """
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def validate(self, data):
        """
        Validate that the passwords match.
        """
        if data.get('password') != data.get('password_confirm'):
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return data

    def create(self, validated_data):
        """
        Create and return a new pending registration.
        """
        validated_data.pop('password_confirm', None)
        # Password in PendingRegistration should likely be stored hashed
        validated_data['password'] = make_password(validated_data['password'])
        return PendingRegistration.objects.create(**validated_data)

# Company Serializer
class CompanySerializer(serializers.ModelSerializer):
    """
    Serializer for the Company model (if used distinctly from Client/Tenant).
    """
    class Meta:
        model = Company
        fields = ('id', 'name', 'industry', 'size', 'country', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

# Subscription Plan Serializer
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """
    Serializer for SubscriptionPlan model.
    """
    class Meta:
        model = SubscriptionPlan
        fields = ('id', 'name', 'description', 'price', 'max_users', 'max_storage',
                  'features', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')

# Tenant (Client) Serializer
class TenantSerializer(serializers.ModelSerializer):
    """
    Serializer for the Tenant model.
    """
    applications = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Application.objects.filter(is_active=True),
        required=False
    )
    subscription_plan = SubscriptionPlanSerializer(read_only=True)
    subscription_plan_id = serializers.PrimaryKeyRelatedField(
        queryset=SubscriptionPlan.objects.all(),
        source='subscription_plan',
        write_only=True,
        required=False,
        allow_null=True
    )

    # Fields for initial tenant admin user (write-only)
    admin_email = serializers.EmailField(write_only=True, required=False)
    admin_first_name = serializers.CharField(max_length=255, write_only=True, required=False)
    admin_last_name = serializers.CharField(max_length=255, write_only=True, required=False)
    admin_password = serializers.CharField(max_length=255, write_only=True, required=False)

    class Meta:
        model = Tenant
        fields = (
            'id', 'name', 'description', 'schema_name', 'url_suffix',
            'status', 'environment', 'on_trial', 'trial_end_date', 'paid_until',
            'subscription_plan', 'subscription_plan_id',
            'created_at', 'updated_at', 'admin_email', 'admin_first_name',
            'admin_last_name', 'admin_password'
        )
        read_only_fields = ('id', 'schema_name', 'created_at', 'updated_at')

    def validate_url_suffix(self, value):
        """
        Validate that the url_suffix is unique and contains only valid characters.
        """
        if value is None:
            return value

        # Check uniqueness (case-insensitive), excluding self during update
        query = Tenant.objects.filter(url_suffix__iexact=value)
        if self.instance:
            query = query.exclude(pk=self.instance.pk)
        if query.exists():
            raise serializers.ValidationError("This URL suffix is already in use.")

        return value

    def create(self, validated_data):
        """
        Create and return a new Tenant instance. Auto-generate schema_name.
        Create initial tenant admin user and profile within the tenant schema.
        """
        # Generate schema_name if not provided
        if 'schema_name' not in validated_data:
            base_schema_name = re.sub(r'[^\w]', '', validated_data['name'].lower().replace(' ', '_'))
            schema_name = base_schema_name
            counter = 1
            while Tenant.objects.filter(schema_name=schema_name).exists():
                schema_name = f"{base_schema_name}_{counter}"
                counter += 1
            validated_data['schema_name'] = schema_name

        # Extract admin user data
        admin_email = validated_data.pop('admin_email', None)
        admin_first_name = validated_data.pop('admin_first_name', None)
        admin_last_name = validated_data.pop('admin_last_name', None)
        admin_password = validated_data.pop('admin_password', None)

        # Create the tenant
        tenant = Tenant.objects.create(**validated_data)

        # Create admin user if all required fields are provided
        if admin_email and admin_first_name and admin_last_name and admin_password:
            from django.db import connection # Required for tenant context switching

            connection.set_tenant(tenant) # Switch to the newly created tenant's schema

            try:
                # Check if user already exists in this tenant (should ideally not happen on create)
                if TenantUser.objects.filter(email__iexact=admin_email).exists():
                     # This case shouldn't be hit on tenant creation if email validation is correct
                     # but handle defensively. Maybe log a warning.
                     print(f"Warning: Admin user {admin_email} already exists in schema {tenant.schema_name}.")
                     # Decide how to handle: raise error, skip, or update? Skipping for now.
                     admin_user = TenantUser.objects.get(email__iexact=admin_email)
                else:
                    # Create the tenant user
                    admin_user = TenantUser.objects.create_user(
                        username=admin_email,
                        email=admin_email,
                        password=admin_password,
                        first_name=admin_first_name,
                        last_name=admin_last_name,
                        is_staff=True # Tenant admins might need staff access
                    )

                # Create or update the profile for the admin user
                # Note: Assumes this registration is for a Company Admin initially
                profile, created = UserProfile.objects.update_or_create(
                    user=admin_user,
                    defaults={
                        'nationality':'IN', # Or get from input if available
                        'is_company_admin':True, # This user administers this tenant/company
                        'is_tenant_admin':True,  # Also a tenant admin
                        'is_email_verified':True, # Assume verified for initial admin
                        'otp':None,
                        'totp_secret':None,
                        'is_2fa_enabled':False,
                        'needs_2fa_setup':False,
                        'recovery_codes':None,
                        'updated_at':timezone.now(),
                        'company_id': tenant.id # Link profile to this tenant
                    }
                )
                if created:
                    profile.created_at = timezone.now()
                    profile.save(update_fields=['created_at'])

            except Exception as e:
                print(f"Error creating admin user or profile for tenant {tenant.schema_name}: {str(e)}")
                # Decide on error handling: delete tenant? Log error? Raise?
                # Raising error to prevent incomplete setup
                tenant.delete() # Rollback tenant creation
                raise serializers.ValidationError(f"Failed to create tenant admin: {e}") from e

            finally:
                # Always switch back to the public schema
                connection.set_schema_to_public()

        return tenant

# User Profile Serializer (Read-only display)
class UserProfileSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for the UserProfile model.
    """
    # Assuming 'user' field in UserProfile points to TenantUser model for tenant context
    # If it points to the base User model, you might need UserSerializer here.
    user = serializers.PrimaryKeyRelatedField(read_only=True) # Display user ID

    class Meta:
        model = UserProfile
        fields = ('id', 'user', 'nationality', 'is_company_admin', 'is_tenant_admin',
                  'is_email_verified', 'is_2fa_enabled', 'needs_2fa_setup', 'company_id')
        read_only_fields = ('id', 'user', 'company_id') # Make most fields read-only for display

# --- Other Auth/Utility Serializers ---

class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True)
    last_name = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
    company_name = serializers.CharField(required=True)
    industry = serializers.CharField(required=False, allow_blank=True)
    company_size = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)
    nationality = serializers.CharField(required=False, allow_blank=True)

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

class PasswordResetSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True, min_length=8)

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)

class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)
    otp = serializers.CharField(required=True, max_length=6, min_length=6)

# --- 2FA Serializers ---

class TwoFactorSetupSerializer(serializers.Serializer):
    pass # Usually just triggers the setup process, might return QR code URL/secret

class TwoFactorSetupConfirmRequestSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, max_length=6, min_length=6) # OTP Token

class TwoFactorSetupConfirmResponseSerializer(serializers.Serializer):
    recovery_codes = serializers.ListField(child=serializers.CharField())

class TwoFactorVerifyRequestSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, max_length=6, min_length=6) # OTP Token

class TwoFactorRecoveryVerifyRequestSerializer(serializers.Serializer):
    recovery_code = serializers.CharField(required=True)

class TwoFactorLoginResponseSerializer(serializers.Serializer):
    # Response after initial login, indicating if 2FA is needed
    requires_2fa = serializers.BooleanField(required=False, default=False)
    needs_2fa_setup = serializers.BooleanField(required=False, default=False)
    user_id = serializers.IntegerField()
    temp_token = serializers.CharField(required=False, allow_null=True) # Temporary token for 2FA step
    message = serializers.CharField(required=False, allow_null=True)
    # Optionally return some initial data if 2FA is not required
    tenant = serializers.JSONField(required=False, allow_null=True)
    token = serializers.CharField(required=False, allow_null=True) # Final auth token
    user = serializers.JSONField(required=False, allow_null=True) # User details


# --- Admin & RBAC Serializers ---

class UserAdminSerializer(serializers.ModelSerializer):
    """
    Serializer for admin management of base users (e.g., in superadmin).
    """
    profile = serializers.SerializerMethodField()

    class Meta:
        model = User # Use base User model
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser', 'date_joined', 'profile')
        read_only_fields = ('id', 'date_joined')
        # Define writable fields as needed for admin updates

    def get_profile(self, obj):
        # Similar to UserSerializer.get_profile
        try:
            profile = UserProfile.objects.get(user_id=obj.id)
            return {
                'is_company_admin': profile.is_company_admin,
                'is_tenant_admin': profile.is_tenant_admin,
                'nationality': profile.nationality,
                'is_email_verified': profile.is_email_verified,
                'company_id': profile.company_id
            }
        except UserProfile.DoesNotExist:
            return None
        except AttributeError:
             return None

class PermissionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Permission model.
    """
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'description']
        read_only_fields = ['id']

class RoleSerializer(serializers.ModelSerializer):
    """
    Serializer for the Role model. Includes related permissions.
    """
    permissions = PermissionSerializer(many=True, read_only=True, source='permission_set') # Efficiently get related permissions

    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'permissions']
        read_only_fields = ['id']
        # Allow writing 'name' and 'description'

# UserRole Serializer (For assigning roles to users)
class UserRoleSerializer(serializers.ModelSerializer):
    """
    Serializer for the UserRole model (the through model).
    Used for associating a User with a Role.
    """
    # Display role details when reading
    role = RoleSerializer(read_only=True)
    # Allow assigning role by ID when writing
    role_id = serializers.IntegerField(
        required=True,
        allow_null=False,
        write_only=True,
        help_text="ID of the initial tenant role"
    )
    # Assuming 'user' field is set in the view or context
    user = serializers.PrimaryKeyRelatedField(read_only=True) # Show user ID

    class Meta:
        model = UserRole
        fields = ['id', 'user', 'role', 'role_id']
        read_only_fields = ['id', 'user'] # User is typically set contextually

# Tenant User Display Serializer (Read-only)
class TenantUserDisplaySerializer(serializers.ModelSerializer):
    """
    Serializer for displaying tenant users with profile and roles. Read-only.
    Uses the TenantUser model.
    """
    profile = serializers.SerializerMethodField()
    roles = RoleSerializer(many=True, read_only=True, source='role_set') # Get roles via UserRole reverse relation
    is_super_admin = serializers.SerializerMethodField()

    class Meta:
        model = TenantUser # Use the tenant-specific user model
        fields = ('id', 'email', 'username', 'first_name', 'last_name',
                  'is_active', 'is_staff', 'is_super_admin', 'date_joined', 'profile', 'roles')
        read_only_fields = fields # Make all fields read-only for display

    def get_profile(self, obj):
        """ Get the user profile data for the tenant user. """
        try:
            # Assumes UserProfile relates to TenantUser via 'user' field
            profile = UserProfile.objects.get(user=obj)
            return {
                'id': profile.id,
                'nationality': profile.nationality,
                'is_company_admin': profile.is_company_admin,
                'is_tenant_admin': profile.is_tenant_admin,
                'is_email_verified': profile.is_email_verified,
                'is_2fa_enabled': profile.is_2fa_enabled,
                'needs_2fa_setup': profile.needs_2fa_setup,
                'created_at': profile.created_at,
                'updated_at': profile.updated_at
            }
        except UserProfile.DoesNotExist:
            return None
        except AttributeError:
            return None

    def get_is_super_admin(self, obj):
        """ Return the is_superuser field value as is_super_admin """
        return obj.is_superuser

# Tenant User Update Serializer (Write-only)
class TenantUserUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating tenant users.
    """
    is_super_admin = serializers.BooleanField(
        required=False,
        write_only=True,
        help_text="If true, user will have superuser privileges in the tenant"
    )
    application_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="List of application IDs to assign to the user"
    )
    
    class Meta:
        model = TenantUser
        fields = ('first_name', 'last_name', 'email', 'is_active', 'is_staff', 'is_super_admin', 'application_ids')
    
    def update(self, instance, validated_data):
        # Extract is_super_admin to set is_superuser
        is_super_admin = validated_data.pop('is_super_admin', None)
        if is_super_admin is not None:
            instance.is_superuser = is_super_admin
        
        # Extract application_ids as they're handled separately in the view
        validated_data.pop('application_ids', None)
        
        # Update the remaining fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance

# Tenant User Creation Serializer (Write-only)
class TenantUserCreateSerializer(serializers.Serializer):
    # ... (rest of the code remains the same)
    """
    Serializer for creating tenant users by a Tenant Admin.
    Handles creation of TenantUser, UserProfile, and assigns an initial Role.
    """
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=True, max_length=150)
    last_name = serializers.CharField(required=True, max_length=150)
    nationality = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100, default='')
    role_id = serializers.IntegerField(
        required=True,
        allow_null=False,
        write_only=True,
        help_text="ID of the initial tenant role"
    )
    user_type = serializers.ChoiceField(
        choices=[('internal', 'Internal User'), ('external', 'External User')],
        required=False,
        default='external',
        help_text="Type of user. Internal users have is_staff=True, external users have is_staff=False"
    )
    is_super_admin = serializers.BooleanField(
        required=False,
        default=False,
        help_text="If true, user will have superuser privileges in the tenant"
    )
    password = serializers.CharField(
        write_only=True,
        required=True,
        min_length=8,
        style={'input_type': 'password'},
        help_text="Password for the user account."
    )
    password_confirm = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text="Confirmation of the password. Must match the password field."
    )
    application_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        write_only=True,
        help_text="List of application IDs to assign to the user"
    )

    def validate_email(self, value):
        """ Validate email uniqueness within the current tenant schema. """
        if not value:
            raise serializers.ValidationError("Email is required.")
        
        email = value.lower()
        if TenantUser.objects.filter(email=email).exists():
            raise serializers.ValidationError("A user with this email already exists in this tenant.")
        return email

    def validate_role_id(self, value):
        """ Validate that the role exists (queryset already does this). """
        # You could add checks here if only specific roles are assignable by certain users
        return value
    
    def validate_first_name(self, value):
        """ Ensure first_name is not empty """
        if not value or not value.strip():
            raise serializers.ValidationError("First name is required.")
        return value.strip()
    
    def validate_last_name(self, value):
        """ Ensure last_name is not empty """
        if not value or not value.strip():
            raise serializers.ValidationError("Last name is required.")
        return value.strip()

    def validate(self, data):
        """ Validate that passwords match if provided. """
        password = data.get('password')
        password_confirm = data.get('password_confirm')

        # If password is provided and not empty
        if password and password.strip():
            # Password confirmation is required
            if not password_confirm or not password_confirm.strip():
                raise serializers.ValidationError({"password_confirm": "Password confirmation is required when setting a password."})
            
            # Passwords must match
            if password != password_confirm:
                raise serializers.ValidationError({"password_confirm": ["Passwords do not match."]})
        
        # Ensure user_type is provided
      #  if 'user_type' not in data or not data['user_type']:
    #     raise serializers.ValidationError({"user_type": "User type is required."})

        return data

    def create(self, validated_data):
        """
        Create TenantUser, UserProfile, and assign Role.
        Expects 'tenant' object in context: serializer.save(tenant=request.tenant)
        """
        # We moved imports like TenantUser, UserRole, UserProfile to the top of the file
        # If keeping them local: from .models import TenantUser, UserRole, UserProfile

        validated_data.pop('password_confirm', None)
        role = validated_data.pop('role_id', None)
        nationality = validated_data.pop('nationality', None) # Get nationality if provided
        application_ids = validated_data.pop('application_ids', None)

        # --- Get Password ---
        password = validated_data.pop('password')
        generated_password = None  # We're not generating passwords anymore

        user = None
        profile = None
        # Consider using a transaction here: from django.db import transaction
        # with transaction.atomic():
        # --- User Creation ---
        try:
            # Extract is_super_admin value
            is_super_admin = validated_data.pop('is_super_admin', False)
            
            user = TenantUser.objects.create_user(
                email=validated_data['email'],
                password=password,
                first_name=validated_data['first_name'],
                last_name=validated_data['last_name'],
                username=validated_data['email'], # Use email as username
                is_superuser=is_super_admin # Set superuser status based on is_super_admin
            )
            user.user_type = validated_data['user_type']
            if validated_data['user_type'] == 'internal':
                user.is_staff = True
            else:
                user.is_staff = False
            user.save()
        except Exception as e:
             raise serializers.ValidationError({"detail": f"Failed to create user: {e}"}) from e

        # --- Profile Creation ---
        try:
            # --- IMPORTANT: Get tenant from context passed by the view ---
            current_tenant = self.context.get('tenant', None)
            if not current_tenant:
                 # Clean up created user if tenant context is missing
                 if user: user.delete()
                 raise serializers.ValidationError({"detail": "Tenant context is missing. Cannot create user profile."})
            company_id = current_tenant.id

            profile = UserProfile.objects.create(
                user=user,
                nationality=nationality, # Use provided or None
                is_company_admin=False,  # Default for tenant-created users
                is_tenant_admin=False,   # Default; role assignment implies permissions
                is_email_verified=False, # Requires verification workflow
                created_at=timezone.now(),
                updated_at=timezone.now(),
                company_id=company_id # Link profile to the current tenant
                # Add other UserProfile fields with defaults if necessary
            )
        except Exception as e:
             # Clean up created user if profile creation fails
             if user: user.delete()
             raise serializers.ValidationError({"detail": f"Failed to create user profile: {e}"}) from e

        # --- Role Assignment ---
        try:
            if role:
                UserRole.objects.create(user=user, role_id=role)
        except Exception as e:
            # Clean up profile and user if role assignment fails
            if profile: profile.delete()
            if user: user.delete()
            raise serializers.ValidationError({"detail": f"Failed to assign role to user: {e}"}) from e

        # --- Assign Applications ---
        if application_ids:
            try:
                user.applications.set(Application.objects.filter(id__in=application_ids))
            except Exception as e:
                # Clean up profile, user, and role if application assignment fails
                if profile: profile.delete()
                if user: user.delete()
                raise serializers.ValidationError({"detail": f"Failed to assign applications to user: {e}"}) from e

        # --- Prepare Result ---
        # Return serialized data of the created user and assigned role
        result = {
            # Use the display serializer to format the output user object
            'user': TenantUserDisplaySerializer(user, context=self.context).data,
            'role': RoleSerializer(Role.objects.get(id=role)).data if role else None # Include details of the assigned role
        }

        if generated_password:
            result['generated_password'] = generated_password
            # Consider how to securely communicate this password (e.g., email, display once)

        # The serializer's save() method returns the result of create()
        return result

# Application Serializer
class ApplicationSerializer(serializers.ModelSerializer):
    """
    Serializer for the Application model.
    """
    class Meta:
        model = Application
        fields = [
            'app_id',
            'application_name',
            'app_default_url',
            'app_secret_key',
            'app_endpoint_route',
            'description',
            'client_id',
            'company_id',
            'is_active',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        read_only_fields = ['app_id', 'created_at', 'updated_at']

    def validate_application_name(self, value):
        """
        Validate that the application name is unique.
        """
        if not value:
            raise serializers.ValidationError("Application name cannot be empty.")
        if Application.objects.filter(application_name__iexact=value).exists():
            raise serializers.ValidationError("An application with this name already exists.")
        return value

    def validate_app_default_url(self, value):
        """
        Validate that the default URL is a valid URL.
        """
        if not value:
            raise serializers.ValidationError("Default URL cannot be empty.")
        # Add URL validation if needed
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("URL must start with http:// or https://")
        return value

    def validate_app_endpoint_route(self, value):
        """
        Validate that the endpoint route starts with a slash.
        """
        if not value.startswith('/'):
            raise serializers.ValidationError("Endpoint route must start with a slash (/).")
        return value

    def validate_app_secret_key(self, value):
        """
        Validate that the secret key is not empty and has a minimum length.
        """
        if not value or len(value) < 32:
            raise serializers.ValidationError("Secret key must be at least 32 characters long.")
        return value

from ecomm_tenant.ecomm_tenant_admins.models import LoginConfig, TenantConfiguration

from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

class LoginConfigSerializer(serializers.ModelSerializer):
    """
    Serializer for the LoginConfig model.
    Handles the login page configuration including logo and brand name.
    """
    logo = serializers.ImageField(required=False, allow_null=True)
    is_2fa_enabled = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Enable or disable two-factor authentication for all users"
    )
    
    def validate_logo(self, value):
        if not value:
            return value

        # Log the received file details
        logger.info(f"Validating logo: name={value.name}, size={value.size}, content_type={value.content_type}")
        
        try:
            # Try to open the image using PIL
            img = Image.open(value)
            img.verify()  # Verify it's actually an image
            
            # Rewind the file pointer after verify()
            value.seek(0)
            
            # Open it again to check format and size
            img = Image.open(value)
            if img.format.upper() not in ['PNG', 'JPEG', 'SVG']:
                raise serializers.ValidationError(
                    f"Unsupported image format: {img.format}. Please use PNG, JPEG, or SVG."
                )
                
            # Check file size (2MB)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError(
                    "Image file too large. Maximum size is 2MB."
                )
                
            # Rewind the file pointer again
            value.seek(0)
            return value
            
        except Exception as e:
            logger.error(f"Error validating logo: {str(e)}")
            raise serializers.ValidationError(
                "Upload a valid image. The file you uploaded was either not an image or a corrupted image."
            )
    
    theme_color = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Theme color in hex format (e.g., #FC123FF)"
    )
    font_family = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Font family for the application (e.g., 'Arial', 'Times New Roman')"
    )
    app_language = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True,
        help_text="Application language code (e.g., 'en' for English, 'ar' for Arabic)"
    )
    
    class Meta:
        model = LoginConfig
        fields = [
            'id',
            'brand_name',
            'logo',
            'is_2fa_enabled',
            'theme_color',
            'app_language',
            'font_family',
            'company_name',
            'address_1',
            'address_2',
            'city',
            'state',
            'country',
            'pincode',
            'gstin',
            'client_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_logo(self, value):
        """
        Validate the uploaded logo file.
        """
        if value:
            # Check file size (max 2MB)
            if value.size > 2 * 1024 * 1024:
                raise serializers.ValidationError("Image size should be less than 2MB")

            # Check file type
            allowed_types = ['image/jpeg', 'image/png', 'image/svg+xml']
            if value.content_type not in allowed_types:
                raise serializers.ValidationError(
                    "Invalid file type. Only JPEG, PNG, and SVG files are allowed."
                )

        return value


class TenantConfigurationSerializer(serializers.ModelSerializer):
    """
    Serializer for the TenantConfiguration model.
    Handles tenant configuration including branding, company info, and localization.
    """
    class Meta:
        model = TenantConfiguration
        fields = [
            'id',
            'company_info',
            'branding_config',
            'localization_config',
            'client_id',
            'company_id',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
        extra_kwargs = {
            'company_info': {'required': False},
            'branding_config': {'required': False},
            'localization_config': {'required': False},
        }

    def validate_company_info(self, value):
        """Validate company info structure."""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("Company info must be a JSON object")
        return value

    def validate_branding_config(self, value):
        """Validate branding config structure."""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("Branding config must be a JSON object")
        
        # Validate required fields if branding config is provided
        if value:
            required_fields = [
                'company_logo_light',
                'company_logo_dark',
                'favicon',
                'primary_brand_color',
                'secondary_brand_color',
                'default_font_style',
                'default_theme_mode'
            ]
            
            for field in required_fields:
                if field not in value:
                    value[field] = None
        
        return value

    def validate_localization_config(self, value):
        """Validate localization config structure."""
        if value and not isinstance(value, dict):
            raise serializers.ValidationError("Localization config must be a JSON object")
        
        # Validate required fields if localization config is provided
        if value:
            required_fields = [
                'default_language',
                'default_time_zone',
                'default_date_format',
                'default_time_format'
            ]
            
            for field in required_fields:
                if field not in value:
                    value[field] = None
        
        return value

    def create(self, validated_data):
        """Create a new tenant configuration."""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            # Store only the tenant ID
            print("kk:", request.tenant)
            tenant_id = str(request.tenant.id)
            
            validated_data['created_by'] = tenant_id
            validated_data['updated_by'] = tenant_id
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Update an existing tenant configuration."""
        request = self.context.get('request')
        if request and hasattr(request, 'tenant'):
            # Store only the tenant ID
            tenant_id = str(request.tenant.id)
            
            validated_data['updated_by'] = tenant_id
        return super().update(instance, validated_data)
