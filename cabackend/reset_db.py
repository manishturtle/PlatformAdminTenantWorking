import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
from django.core.management import call_command

def reset_database():
    try:
        # Drop all tables
        with connection.cursor() as cursor:
            cursor.execute("""
                DO $$ DECLARE
                    r RECORD;
                BEGIN
                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                    END LOOP;
                END $$;
            """)
        
        # Create new migrations
        print("Creating new migrations...")
        call_command('makemigrations', 'customers')
        call_command('makemigrations', 'documents')
        call_command('makemigrations', 'credentials')
        call_command('makemigrations', 'servicetickets')
        
        # Apply migrations
        print("Applying migrations...")
        call_command('migrate')
        
        print("Database reset successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_database()
