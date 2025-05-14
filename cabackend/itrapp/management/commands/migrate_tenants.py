from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.core.management import call_command
from django.conf import settings

class Command(BaseCommand):
    help = 'Run migrations for all tenant schemas'

    def create_schema_if_not_exists(self, schema_name):
        with connection.cursor() as cursor:
            # First check if schema exists
            cursor.execute(
                "SELECT schema_name FROM information_schema.schemata WHERE schema_name = %s",
                [schema_name])
            
            exists = cursor.fetchone() is not None
            
            if not exists:
                cursor.execute(f'CREATE SCHEMA "{schema_name}"')
                # Wait for schema to be fully created
                cursor.execute('COMMIT')
                self.stdout.write(f"Created new schema: {schema_name}")

    def migrate_shared_apps(self):
        """Migrate shared apps in public schema"""
        self.stdout.write("\nMigrating shared apps in public schema...")
        with connection.cursor() as cursor:
            cursor.execute('SET search_path TO public')
            for app in settings.SHARED_APPS:
                if app.startswith('django.') or app in ['rest_framework', 'corsheaders', 'django_filters']:
                    app_name = app.split('.')[-1]
                    self.stdout.write(f"  Migrating shared app {app_name}...")
                    try:
                        call_command('migrate', app_name, interactive=False, verbosity=0)
                    except Exception as e:
                        self.stdout.write(f"    Warning: {str(e)}")

    def ensure_auth_tables(self, schema):
        """Ensure auth tables exist and are properly set up"""
        with connection.cursor() as cursor:
            cursor.execute(f'SET search_path TO "{schema}"')
            
            # Check if django_migrations table exists
            cursor.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = 'django_migrations')",
                [schema])
            
            has_migrations_table = cursor.fetchone()[0]
            
            if not has_migrations_table:
                self.stdout.write(f"Creating django_migrations table in schema {schema}...")
                # Only create the django_migrations table
                cursor.execute(
                    "CREATE TABLE django_migrations ("
                    "    id SERIAL PRIMARY KEY,"
                    "    app VARCHAR(255) NOT NULL,"
                    "    name VARCHAR(255) NOT NULL,"
                    "    applied TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
                    ");"
                )
            
            # Check if content types table exists
            cursor.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = 'django_content_type')",
                [schema])
            has_content_types = cursor.fetchone()[0]
            
            # Check if auth tables exist
            cursor.execute(
                "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = %s AND table_name = 'auth_user')",
                [schema])
            has_auth = cursor.fetchone()[0]
            
            try:
                # Migrate contenttypes with --fake if table exists
                if has_content_types:
                    self.stdout.write(f"Faking contenttypes migration in {schema} as tables exist...")
                    call_command('migrate', 'contenttypes', '--fake-initial', schema=schema, interactive=False, verbosity=0)
                else:
                    self.stdout.write(f"Running contenttypes migration in {schema}...")
                    call_command('migrate', 'contenttypes', schema=schema, interactive=False, verbosity=0)
                
                # Migrate auth with --fake if tables exist
                if has_auth:
                    self.stdout.write(f"Faking auth migration in {schema} as tables exist...")
                    call_command('migrate', 'auth', '--fake-initial', schema=schema, interactive=False, verbosity=0)
                else:
                    self.stdout.write(f"Running auth migration in {schema}...")
                    call_command('migrate', 'auth', schema=schema, interactive=False, verbosity=0)
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Warning during initial migrations in {schema}: {str(e)}"))

    def migrate_tenant_apps(self, schema):
        """Migrate tenant-specific apps in the given schema"""
        self.stdout.write(f"\nMigrating tenant apps in schema: {schema}")
        
        try:
            # Create schema if it doesn't exist
            self.create_schema_if_not_exists(schema)
            
            # Ensure auth tables exist before migrations
            self.ensure_auth_tables(schema)
            
            # Run migrations for all tenant apps
            with connection.cursor() as cursor:
                cursor.execute(f'SET search_path TO "{schema}"')
                
                for app in settings.TENANT_APPS:
                    if app.startswith('django.') or app in ['rest_framework', 'corsheaders', 'django_filters']:
                        continue  # Skip Django internal apps
                        
                    app_name = app.split('.')[-1]
                    
                    # Check if app tables exist
                    cursor.execute(
                        """SELECT COUNT(*) FROM information_schema.tables 
                        WHERE table_schema = %s 
                        AND table_name LIKE %s""",
                        [schema, f"{app_name}_%"]
                    )
                    table_count = cursor.fetchone()[0]
                    
                    self.stdout.write(f"  Migrating {app_name}...")
                    try:
                        if table_count > 0:
                            self.stdout.write(f"    Faking initial migration as tables exist...")
                            call_command('migrate', app_name, '--fake-initial', interactive=False, verbosity=0)
                        else:
                            call_command('migrate', app_name, interactive=False, verbosity=0)
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f"    Warning migrating {app_name}: {str(e)}"))
                        continue
                
                # Reset search path
                cursor.execute('SET search_path TO public')
                
            self.stdout.write(self.style.SUCCESS(f"Successfully migrated schema: {schema}"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error migrating schema {schema}: {str(e)}"))
            # Rollback any pending transactions
            connection.rollback()
            raise
        finally:
            # Reset search path to public
            with connection.cursor() as cursor:
                cursor.execute('SET search_path TO public')

    def handle(self, *args, **options):
        # First migrate shared apps in public schema
        self.migrate_shared_apps()

        # Get all tenant schemas
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT schema_name 
                FROM information_schema.schemata 
                WHERE schema_name != 'public' 
                AND schema_name != 'information_schema' 
                AND schema_name NOT LIKE 'pg_%';
            """)
            schemas = [row[0] for row in cursor.fetchall()]

        if not schemas:
            self.stdout.write("No tenant schemas found")
            return

        self.stdout.write(f"Found {len(schemas)} tenant schemas")

        # Migrate tenant apps in each schema
        for schema in schemas:
            self.migrate_tenant_apps(schema)

        self.stdout.write("\nMigration complete!")
