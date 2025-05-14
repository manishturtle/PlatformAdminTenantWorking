import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def fix_migrations():
    try:
        with connection.cursor() as cursor:
            # Check if the migration table exists
            cursor.execute("SELECT COUNT(*) FROM django_migrations")
            
            # Delete problematic migration records
            cursor.execute("DELETE FROM django_migrations WHERE app='customers' AND name LIKE '0002_%'")
            cursor.execute("DELETE FROM django_migrations WHERE app='customers' AND name LIKE '0003_%'")
            
            # Add our new migration record
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                ['customers', '0002_customer_allowportalaccess']
            )
            
            print("Migration records fixed successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_migrations()
