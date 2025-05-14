import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
import datetime

def mark_migration_applied():
    try:
        with connection.cursor() as cursor:
            # Check if the migration is already in the table
            cursor.execute(
                "SELECT * FROM django_migrations WHERE app='customers' AND name='0002_customer_allowportalaccess'"
            )
            if not cursor.fetchone():
                # Add the migration record to django_migrations
                now = datetime.datetime.now()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['customers', '0002_customer_allowportalaccess', now]
                )
                print("Migration 'customers/0002_customer_allowportalaccess' marked as applied.")
            else:
                print("Migration 'customers/0002_customer_allowportalaccess' is already applied.")
                
            # Check if there are any other problematic migrations
            cursor.execute(
                "SELECT name FROM django_migrations WHERE app='customers' AND name LIKE '0002_%' AND name != '0002_customer_allowportalaccess'"
            )
            problematic_migrations = cursor.fetchall()
            if problematic_migrations:
                print(f"Found problematic migrations: {[m[0] for m in problematic_migrations]}")
                print("Removing problematic migrations...")
                cursor.execute(
                    "DELETE FROM django_migrations WHERE app='customers' AND name LIKE '0002_%' AND name != '0002_customer_allowportalaccess'"
                )
                print("Problematic migrations removed.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    mark_migration_applied()
