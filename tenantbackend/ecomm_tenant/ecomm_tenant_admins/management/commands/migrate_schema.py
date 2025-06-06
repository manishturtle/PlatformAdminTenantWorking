from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
from django.core.management import call_command
from tenant_schemas.utils import get_tenant_model, get_public_schema_name
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run migrations for all or specific tenant schemas'

    def add_arguments(self, parser):
        parser.add_argument('schema_name', nargs='?', type=str, help='Specific schema name to migrate')
        parser.add_argument('--noinput', '--no-input', action='store_false', dest='interactive',
                          help='Tells Django to NOT prompt the user for input of any kind.')
        parser.add_argument('--fake', action='store_true',
                          help='Mark migrations as run without actually running them.')
        parser.add_argument('--fake-initial', action='store_true',
                          help='Detect if tables already exist and fake-apply initial migrations if so.')
        parser.add_argument('--database', default='default',
                          help='Nominates a database to synchronize. Defaults to the "default" database.')

    def handle(self, *args, **options):
        schema_name = options.get('schema_name')
        verbosity = options.get('verbosity')
        interactive = options.get('interactive')
        fake = options.get('fake')
        fake_initial = options.get('fake_initial')
        database = options.get('database')

        # If a specific schema is provided, migrate only that schema
        if schema_name:
            self.migrate_schema(schema_name, verbosity, interactive, fake, fake_initial, database)
            return

        # Otherwise, migrate all schemas
        self.migrate_all_schemas(verbosity, interactive, fake, fake_initial, database)

    def migrate_schema(self, schema_name, verbosity, interactive, fake, fake_initial, database):
        self.stdout.write(f'Migrating schema: {schema_name}')
        
        # Get the tenant model
        TenantModel = get_tenant_model()
        
        try:
            # Try to get the specific tenant
            tenant = TenantModel.objects.get(schema_name=schema_name)
            
            # Set the schema
            connection.set_tenant(tenant)
            
            # Run migrations for this schema
            self.stdout.write(f'Running migrations for {schema_name}...')
            call_command(
                'migrate',
                verbosity=verbosity,
                interactive=interactive,
                fake=fake,
                fake_initial=fake_initial,
                database=database,
            )
            
            self.stdout.write(self.style.SUCCESS(f'Successfully migrated schema: {schema_name}'))
            
        except TenantModel.DoesNotExist:
            self.stderr.write(self.style.ERROR(f'Schema {schema_name} does not exist'))
            return

    def migrate_all_schemas(self, verbosity, interactive, fake, fake_initial, database):
        # Get the tenant model and all tenants
        TenantModel = get_tenant_model()
        tenants = TenantModel.objects.all()
        
        # Migrate public schema first
        self.stdout.write('Migrating public schema...')
        call_command(
            'migrate_schemas',
            schema_name='public',
            interactive=interactive,
            verbosity=verbosity,
            fake=fake,
            fake_initial=fake_initial,
            database=database,
        )
        
        # Migrate each tenant
        for tenant in tenants:
            self.migrate_schema(
                tenant.schema_name,
                verbosity,
                interactive,
                fake,
                fake_initial,
                database
            )
        
        self.stdout.write(self.style.SUCCESS('Successfully migrated all schemas'))
