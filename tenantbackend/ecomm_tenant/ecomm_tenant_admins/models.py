from django.db import models, connection
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.contrib.auth.models import Group, Permission
from django.utils.translation import gettext_lazy as _
import logging

# Create your models here.
logger = logging.getLogger(__name__)

class TenantUserManager(BaseUserManager):
    """
    Custom manager for TenantUser that uses email as the unique identifier
    instead of username for authentication.
    """
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and save a user with the given email and password.
        """
        if not email:
            raise ValueError(_('The Email field must be set'))
        
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and save a superuser with the given email and password.
        In tenant context, a superuser is a tenant admin.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(email, password, **extra_fields)

class TenantUser(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for tenant schemas.
    Uses email as the unique identifier instead of username for authentication.
    
    This model is specific to tenant schemas and should not be used in the public schema.
    """
    email = models.EmailField(_('email address'), unique=True)
    username = models.CharField(_('username'), max_length=150, blank=True)
    first_name = models.CharField(_('first name'), max_length=150, blank=True)
    last_name = models.CharField(_('last name'), max_length=150, blank=True)
    is_active = models.BooleanField(
        _('active'),
        default=True,
        help_text=_(
            'Designates whether this user should be treated as active. '
            'Unselect this instead of deleting accounts.'
        ),
    )
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into the tenant admin site.'),
    )
    date_joined = models.DateTimeField(_('date joined'), default=timezone.now)
    
    # Add common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this user")
    company_id = models.IntegerField(null=True, blank=True, help_text="ID of the company associated with this user")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Timestamp when the user was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Timestamp when the user was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this user")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this user")
    
    # Add related_name attributes to avoid clashes with the User model in public schema
    groups = models.ManyToManyField(
        Group,
        verbose_name=_('groups'),
        blank=True,
        help_text=_(
            'The groups this user belongs to. A user will get all permissions '
            'granted to each of their groups.'
        ),
        related_name='tenant_user_set',
        related_query_name='tenant_user',
    )
    user_permissions = models.ManyToManyField(
        Permission,
        verbose_name=_('user permissions'),
        blank=True,
        help_text=_('Specific permissions for this user.'),
        related_name='tenant_user_set',
        related_query_name='tenant_user',
    )
    
    objects = TenantUserManager()
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []  # Email is already required by default
    
    class Meta:
        verbose_name = _('tenant user')
        verbose_name_plural = _('tenant users')
        ordering = ['email']
        db_table = 'ecomm_tenant_admins_tenantuser'
        
    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        schema_name = connection.schema_name
        table_name = cls._meta.db_table
        
        with connection.cursor() as cursor:
            # Check if the table exists
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in schema {schema_name}")
                # Create the table using Django's migration system
                from django.core.management import call_command
                try:
                    # Create the auth tables first if they don't exist
                    cursor.execute(query, [schema_name, 'auth_user'])
                    auth_exists = cursor.fetchone()[0]
                    if not auth_exists:
                        # Create auth tables
                        cursor.execute(f"SET search_path TO {schema_name}, public;")
                        call_command('migrate', 'auth', verbosity=0)
                    
                    # Create the tenant admin tables
                    cursor.execute(f"SET search_path TO {schema_name}, public;")
                    call_command('migrate', 'ecomm_tenant_admins', verbosity=0)
                    return True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {str(e)}")
                    return False
            return True
    
    def __str__(self):
        return self.email
    
    def get_full_name(self):
        """
        Return the first_name plus the last_name, with a space in between.
        """
        full_name = f"{self.first_name} {self.last_name}"
        return full_name.strip()
    
    def get_short_name(self):
        """Return the short name for the user."""
        return self.first_name


class UserProfile(models.Model):
    """
    Model to extend the built-in User model with additional fields.
    """
    user = models.OneToOneField(TenantUser, on_delete=models.CASCADE, related_name='profile')
    # Changed from ForeignKey to IntegerField to remove dependency on ecomm_superadmin.Company
    company_id = models.IntegerField(null=True, blank=True)
    nationality = models.CharField(max_length=100, null=True, blank=True)
    is_company_admin = models.BooleanField(default=False)
    is_tenant_admin = models.BooleanField(default=False)  # Added field to identify tenant administrators
    is_email_verified = models.BooleanField(default=False)
    otp = models.CharField(max_length=6, null=True, blank=True)
    # 2FA fields
    totp_secret = models.CharField(max_length=255, null=True, blank=True)
    is_2fa_enabled = models.BooleanField(default=False)
    needs_2fa_setup = models.BooleanField(default=False)  # Added field to track if user needs to set up 2FA
    recovery_codes = models.JSONField(null=True, blank=True)  # Store recovery codes as JSON
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        schema_name = connection.schema_name
        table_name = cls._meta.db_table
        
        with connection.cursor() as cursor:
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in schema {schema_name}")
                try:
                    # Ensure TenantUser table exists first
                    TenantUser.create_table_if_not_exists()
                    
                    # Create this table using Django's migration system
                    cursor.execute(f"SET search_path TO {schema_name}, public;")
                    from django.core.management import call_command
                    call_command('migrate', 'ecomm_tenant_admins', verbosity=0)
                    return True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {str(e)}")
                    return False
            return True
    
    def __str__(self):
        if self.nationality:
            return f"{self.user.email} - {self.nationality}"
        return f"{self.user.email}"

class Role(models.Model):
    """
    Model to define roles in the system.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    app_id = models.ForeignKey(
        'ecomm_superadmin.Application',
        on_delete=models.CASCADE,
        related_name='roles',
        null=True,
        blank=True
    )
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    class Meta:
        db_table = 'role_controles_role'
        unique_together = ('name', 'app_id')
    
    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        schema_name = connection.schema_name
        table_name = cls._meta.db_table
        
        with connection.cursor() as cursor:
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in schema {schema_name}")
                try:
                    cursor.execute(f"SET search_path TO {schema_name}, public;")
                    from django.core.management import call_command
                    call_command('migrate', 'ecomm_tenant_admins', verbosity=0)
                    return True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {str(e)}")
                    return False
            return True
    
    def __str__(self):
        return self.name

class Permission(models.Model):
    """
    Model to define permissions in the system.
    """
    name = models.CharField(max_length=100, unique=True)
    codename = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        schema_name = connection.schema_name
        table_name = cls._meta.db_table
        
        with connection.cursor() as cursor:
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in schema {schema_name}")
                try:
                    cursor.execute(f"SET search_path TO {schema_name}, public;")
                    from django.core.management import call_command
                    call_command('migrate', 'ecomm_tenant_admins', verbosity=0)
                    return True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {str(e)}")
                    return False
            return True
    
    def __str__(self):
        return self.name

class RolePermission(models.Model):
    """
    Model to define which permissions are assigned to which roles.
    """
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='roles')
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    class Meta:
        unique_together = ('role', 'permission')
    
    def __str__(self):
        return f"{self.role.name} - {self.permission.name}"

class UserRole(models.Model):
    """
    Model to assign roles to users.
    """
    user = models.ForeignKey(TenantUser, on_delete=models.CASCADE, related_name='user_roles', db_column='user')
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='user_roles')
    assigned_on = models.DateTimeField(auto_now_add=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    company_id = models.IntegerField(null=True, blank=True, help_text="ID of the company associated with this record")
    
    def __str__(self):
        return f"{self.user.email} - {self.role.name}"

    class Meta:
        db_table = 'role_controles_userroleassignment'
        verbose_name = "User Role"
        verbose_name_plural = "User Roles"
        unique_together = ('user', 'role')

class PendingRegistration(models.Model):
    """
    Model to store pending user registrations before OTP verification.
    """
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    nationality = models.CharField(max_length=100, null=True, blank=True)
    company_name = models.CharField(max_length=255)
    password = models.CharField(max_length=255)
    otp = models.CharField(max_length=6)
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return f"{self.email} - Pending Registration"

class OTP(models.Model):
    """
    Model to store One-Time Passwords (OTPs) for password reset functionality.
    This model provides better persistence and auditability compared to cache-based solutions.
    """
    user = models.ForeignKey(
        TenantUser, 
        on_delete=models.CASCADE,
        related_name='password_reset_otps'
    )
    otp_code = models.CharField(
        max_length=6, 
        db_index=True
    )
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    expires_at = models.DateTimeField()
    
    class Meta:
        verbose_name = "One-Time Password"
        verbose_name_plural = "One-Time Passwords"
    
    def __str__(self):
        return f"OTP for {self.user.email}"
    
    def is_valid(self):
        """
        Check if the OTP is still valid (not expired).
        """
        return timezone.now() < self.expires_at
    
    @classmethod
    def generate_otp(cls, user, expiry_minutes=10):
        """
        Generate a new OTP for the given user.
        Deletes any existing OTPs for the user first.
        """
        import random
        
        # Delete existing OTPs for this user
        cls.objects.filter(user=user).delete()
        
        # Generate a random 6-digit OTP
        otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        
        # Calculate expiry time
        expires_at = timezone.now() + timedelta(minutes=expiry_minutes)
        
        # Create and save the OTP
        otp = cls(
            user=user,
            otp_code=otp_code,
            expires_at=expires_at
        )
        otp.save()
        
        return otp

class Company(models.Model):
    """
    Model to represent a company in the tenant schema.
    Each company can have multiple users within the tenant.
    """
    name = models.CharField(max_length=255)
    country = models.CharField(max_length=100, blank=True, null=True)
    client = models.ForeignKey(
        'TenantCrmClient',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies',
        db_column='client_id',  # Keep the same column name in the database
        help_text='The CRM client associated with this company'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        db_table = "ecomm_tenant_admins_company"
    
    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        schema_name = connection.schema_name
        table_name = cls._meta.db_table
        
        with connection.cursor() as cursor:
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in schema {schema_name}")
                try:
                    # Ensure TenantCrmClient table exists first
                    TenantCrmClient.create_table_if_not_exists()
                    
                    cursor.execute(f"SET search_path TO {schema_name}, public;")
                    from django.core.management import call_command
                    call_command('migrate', 'ecomm_tenant_admins', verbosity=0)
                    return True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {str(e)}")
                    return False
            return True
    
    class Meta:
        verbose_name = "Company"
        verbose_name_plural = "Companies"
        db_table = "ecomm_tenant_admins_company"
    
    def __str__(self):
        return self.name

class TenantCrmClient(models.Model):
    """
    Tenant-specific CRM Client model for storing client information within a tenant schema.
    This model has a manually set primary key (client_id) that is not auto-created.
    """
    client_id = models.IntegerField(primary_key=True)
    client_name = models.CharField(max_length=255)
    contact_person_email = models.EmailField(max_length=255)
    created_by = models.EmailField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.EmailField(max_length=255)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Tenant CRM Client"
        verbose_name_plural = "Tenant CRM Clients"
        db_table = 'ecomm_tenant_admins_crmclients'
    
    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        schema_name = connection.schema_name
        table_name = cls._meta.db_table
        
        with connection.cursor() as cursor:
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in schema {schema_name}")
                try:
                    cursor.execute(f"SET search_path TO {schema_name}, public;")
                    from django.core.management import call_command
                    call_command('migrate', 'ecomm_tenant_admins', verbosity=0)
                    return True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {str(e)}")
                    return False
            return True
    
    def __str__(self):
        return self.client_name

class UserApplication(models.Model):
    """
    Model to track which applications a user has access to.
    """
    user = models.ForeignKey(TenantUser, on_delete=models.CASCADE, related_name='user_applications')
    application = models.ForeignKey(
        'ecomm_superadmin.Application',
        on_delete=models.CASCADE,
        related_name='user_applications'
    )
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    class Meta:
        unique_together = ('user', 'application')
        db_table = 'ecomm_tenant_admins_userapplication'
        verbose_name = "User Application"
        verbose_name_plural = "User Applications"
    
    def __str__(self):
        return f"{self.user.email} - {self.application.name}"

    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        schema_name = connection.schema_name
        table_name = cls._meta.db_table
        
        with connection.cursor() as cursor:
            query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = %s
                    AND table_name = %s
                );
            """
            cursor.execute(query, [schema_name, table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in schema {schema_name}")
                # Create the table using Django's migration system
                from django.core.management import call_command
                try:
                    cursor.execute(f"SET search_path TO {schema_name}, public;")
                    call_command('migrate', 'ecomm_tenant_admins', verbosity=0)
                    return True
                except Exception as e:
                    logger.error(f"Error creating table {table_name}: {str(e)}")
                    return False
            return True

class LoginConfig(models.Model):
    """
    Model to store login page configuration for tenants.
    This includes branding elements like logo and brand name.
    """
    brand_name = models.CharField(max_length=255, blank=True, null=True)
    logo = models.ImageField(upload_to='tenant_logos/', blank=True, null=True)
    is_2fa_enabled = models.BooleanField(
        default=False,
        help_text="Enable or disable two-factor authentication for all users"
    )
    theme_color = models.CharField(max_length=255, blank=True, null=True)
    app_language = models.CharField(max_length=255, blank=True, null=True)
    font_family = models.CharField(max_length=255, blank=True, null=True)
    
    # Company information fields
    company_name = models.CharField(max_length=255, blank=True, null=True)
    address_1 = models.CharField(max_length=255, blank=True, null=True)
    address_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    pincode = models.CharField(max_length=20, blank=True, null=True)
    gstin = models.CharField(max_length=20, blank=True, null=True)
    
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")

    class Meta:
        db_table = 'ecomm_tenant_admins_loginconfig'
        verbose_name = "Login Configuration"
        verbose_name_plural = "Login Configurations"

    def __str__(self):
        return f"Login Config for Client {self.client_id}: {self.brand_name}"

    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        """
        with connection.cursor() as cursor:
            table_name = cls._meta.db_table
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = CURRENT_SCHEMA()
                    AND table_name = %s
                );
            """, [table_name])
            table_exists = cursor.fetchone()[0]
            
            if not table_exists:
                logger.info(f"Creating table {table_name} in tenant schema")
                cursor.execute(f"""
                    CREATE TABLE {table_name} (
                        id SERIAL PRIMARY KEY,
                        brand_name VARCHAR(255),
                        logo VARCHAR(255),
                        is_2fa_enabled BOOLEAN DEFAULT FALSE,
                        theme_color VARCHAR(255),
                        app_language VARCHAR(255),
                        font_family VARCHAR(255),
                        company_name VARCHAR(255),
                        address_1 VARCHAR(255),
                        address_2 VARCHAR(255),
                        city VARCHAR(100),
                        state VARCHAR(100),
                        country VARCHAR(100),
                        pincode VARCHAR(20),
                        gstin VARCHAR(20),
                        client_id INTEGER,
                        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                        created_by VARCHAR(255),
                        updated_by VARCHAR(255)
                    );
                """)
                logger.info(f"Table {table_name} created successfully")

from django.db.models import JSONField

class TenantConfiguration(models.Model):
    """
    Model to store centralized, customizable configuration settings for each tenant.
    This model excludes an ORM-level foreign key constraint to the Tenant model,
    relying on the 'tenant_id' field for identification.
    Security and authentication-related configurations are also excluded.
    """
    # Django will automatically add an 'id' field as the primary key (AutoField)
    # --- JSONB Columns for Logical Groupings ---

    company_info = JSONField(
        default=dict,
        help_text="Stores core company information like name, registered address, and primary contacts."
    )
    branding_config = JSONField(
        default=dict,
        help_text="Stores branding and visual identity settings like logos, colors, fonts, theme mode."
    )
    localization_config = JSONField(
        default=dict,
        help_text="Stores default language, time zone, date/time formats."
    )

    # --- Metadata / Audit Fields ---
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    company_id = models.IntegerField(null=True, blank=True, help_text="ID of the company associated with this record")


    class Meta:
        db_table = 'tenant_configurations'
        verbose_name = "Tenant Configuration"
        verbose_name_plural = "Tenant Configurations"
      
  
