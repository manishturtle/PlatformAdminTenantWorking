from django.db import models, connection
from django.conf import settings
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class TenantAwareModel(models.Model):
    """
    Abstract base model for all tenant-aware models.
    Includes common fields needed across tenant-aware models and methods for
    table creation and management.
    
    Any new application that needs to be tenant-aware should inherit from this class.
    """
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    client_id = models.IntegerField(default=1)
    company_id = models.IntegerField(default=1)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        related_name="%(class)s_created", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        related_name="%(class)s_updated", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    class Meta:
        abstract = True
    
    @classmethod
    def create_table_if_not_exists(cls):
        """
        Create the table in the current tenant schema if it doesn't exist.
        Dynamically generates SQL for creating tables based on model definition.
        """
        from django.db import connection
        from django.db import models
        
        # Get the current schema name
        schema_name = connection.schema_name
        logger.info(f"Checking if table exists in schema {schema_name}")
        
        # Get the table name
        table_name = cls._meta.db_table
        
        # Check if the table exists in the current schema
        with connection.cursor() as cursor:
            # Format the query to check if the table exists in the current schema
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
                logger.info(f"Table {table_name} does not exist in schema {schema_name}. Creating it now.")
                
                try:
                    # Dynamically generate table creation SQL
                    columns = []
                    fk_constraints = []
                    
                    # Always add common TenantAwareModel fields
                    columns.extend([
                        '"id" serial NOT NULL PRIMARY KEY',
                        '"created_at" timestamp with time zone NOT NULL',
                        '"updated_at" timestamp with time zone NOT NULL',
                        '"client_id" integer NOT NULL',
                        '"company_id" integer NOT NULL',
                        '"created_by_id" integer NULL',
                        '"updated_by_id" integer NULL'
                    ])
                    
                    # Add foreign key constraints for created_by and updated_by
                    fk_constraints.extend([
                        f'ADD CONSTRAINT "{table_name}_created_by_id_fkey" '
                        f'FOREIGN KEY ("created_by_id") REFERENCES "{schema_name}"."auth_user" ("id") '
                        'DEFERRABLE INITIALLY DEFERRED',
                        f'ADD CONSTRAINT "{table_name}_updated_by_id_fkey" '
                        f'FOREIGN KEY ("updated_by_id") REFERENCES "{schema_name}"."auth_user" ("id") '
                        'DEFERRABLE INITIALLY DEFERRED'
                    ])
                    
                    # Dynamically add model-specific fields
                    for field in cls._meta.fields:
                        # Skip fields already added or primary key
                        if field.column in [col.split()[0].strip('"') for col in columns] or field.primary_key:
                            continue
                        
                        # Map Django field types to PostgreSQL types
                        if isinstance(field, models.IntegerField):
                            col_type = 'integer'
                        elif isinstance(field, models.PositiveIntegerField):
                            col_type = 'integer CHECK (value >= 0)'
                        elif isinstance(field, models.CharField):
                            col_type = f'varchar({field.max_length or 255})'
                        elif isinstance(field, models.TextField):
                            col_type = 'text'
                        elif isinstance(field, models.DateTimeField):
                            col_type = 'timestamp with time zone'
                        elif isinstance(field, models.DateField):
                            col_type = 'date'
                        elif isinstance(field, models.BooleanField):
                            col_type = 'boolean'
                        elif isinstance(field, models.DecimalField):
                            col_type = f'numeric({field.max_digits or 10},{field.decimal_places or 2})'
                        elif isinstance(field, models.ForeignKey):
                            # Foreign key
                            related_table = field.related_model._meta.db_table
                            col_type = 'integer'
                            fk_constraints.append(
                                f'ADD CONSTRAINT "{table_name}_{field.column}_fkey" '
                                f'FOREIGN KEY ("{field.column}") REFERENCES "{schema_name}"."{related_table}" ("id") '
                                'DEFERRABLE INITIALLY DEFERRED'
                            )
                        else:
                            # Fallback for unsupported types
                            col_type = 'text'
                        
                        # Determine nullability
                        null_constraint = 'NULL' if field.null else 'NOT NULL'
                        
                        # Add column definition
                        columns.append(f'"{field.column}" {col_type} {null_constraint}')
                    
                    # Create table SQL
                    create_table_sql = f"""
                    CREATE TABLE "{schema_name}"."{table_name}" (
                        {','.join(columns)}
                    );
                    """
                    
                    # Execute table creation
                    cursor.execute(create_table_sql)
                    
                    # Add foreign key constraints
                    for constraint in fk_constraints:
                        try:
                            cursor.execute(f"""
                            ALTER TABLE "{schema_name}"."{table_name}" 
                            {constraint};
                            """)
                        except Exception as e:
                            logger.warning(f"Could not create foreign key constraint: {str(e)}")
                    
                    logger.info(f"Successfully created table {table_name} in schema {schema_name}")
                    return True
                
                except Exception as e:
                    logger.error(f"Error creating table {table_name} in schema {schema_name}: {str(e)}")
                    return False
            else:
                logger.info(f"Table {table_name} already exists in schema {schema_name}")
        
        return True
    
    def save(self, *args, **kwargs):
        """
        Override save method to handle tenant-specific logic
        """
        # Set the current time for created_at and updated_at
        if not self.pk:
            self.created_at = timezone.now()
        self.updated_at = timezone.now()
        
        # Set client_id based on the current schema if not already set
        if not self.client_id and hasattr(connection, 'schema_name') and connection.schema_name != 'public':
            # Get the tenant ID based on the schema name
            with connection.cursor() as cursor:
                cursor.execute("SELECT id FROM public.tenants_tenant WHERE schema_name = %s", [connection.schema_name])
                result = cursor.fetchone()
                if result:
                    self.client_id = result[0]
        
        # Set company_id to default value of 1 if not set
        if not self.company_id:
            self.company_id = 1
        
        # Call the original save method
        super().save(*args, **kwargs)
