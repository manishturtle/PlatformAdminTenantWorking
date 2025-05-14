import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
from django.core.management import call_command

def manage_migrations():
    try:
        # First, clean up the database
        with connection.cursor() as cursor:
            # Drop all tables
            cursor.execute("""
                DO $$ DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                    END LOOP;
                END $$;
            """)
        
        # Clean up migration files
        apps = [
            'authentication',
            'credentials',
            'customers',
            'documents',
            'process',
            'serviceagent',
            'servicecategory',
            'servicetickets',
            'sop'
        ]
        
        for app in apps:
            migrations_dir = os.path.join(app, 'migrations')
            if os.path.exists(migrations_dir):
                # Keep __init__.py, remove all other .py files
                for filename in os.listdir(migrations_dir):
                    if filename.endswith('.py') and filename != '__init__.py':
                        os.remove(os.path.join(migrations_dir, filename))
        
        # Create initial migrations for each app
        for app in apps:
            try:
                print(f"Creating migrations for {app}...")
                call_command('makemigrations', app)
            except Exception as e:
                print(f"Error creating migrations for {app}: {e}")
        
        # Apply migrations
        print("Applying migrations...")
        call_command('migrate')
        
        print("Migration management completed successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    manage_migrations()
