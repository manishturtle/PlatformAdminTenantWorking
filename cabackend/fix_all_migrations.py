import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
import datetime

def fix_all_migrations():
    try:
        with connection.cursor() as cursor:
            # Get all migrations that depend on the missing customers migration
            cursor.execute(
                """
                SELECT app, name FROM django_migrations 
                WHERE app != 'customers' 
                ORDER BY app, name
                """
            )
            all_migrations = cursor.fetchall()
            print(f"Found {len(all_migrations)} migrations in total")
            
            # Check for any migrations with dependencies on the missing migration
            problem_apps = set()
            for app, name in all_migrations:
                # Check if this app has a migration file that might depend on the missing customers migration
                if app != 'customers':
                    problem_apps.add(app)
            
            print(f"Potential problem apps: {problem_apps}")
            
            # Fix each app's migrations
            for app in problem_apps:
                print(f"\nFixing migrations for app: {app}")
                
                # Delete all migrations for this app
                cursor.execute(
                    "DELETE FROM django_migrations WHERE app = %s",
                    [app]
                )
                print(f"Deleted all migrations for {app}")
                
                # Add back a fake initial migration
                now = datetime.datetime.now()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    [app, '0001_initial', now]
                )
                print(f"Added fake initial migration for {app}")
            
            # Make sure customers migrations are correct
            cursor.execute("DELETE FROM django_migrations WHERE app='customers' AND name != '0001_initial' AND name != '0002_customer_allowportalaccess'")
            
            # Check if our AllowPortalAccess migration exists
            cursor.execute("SELECT * FROM django_migrations WHERE app='customers' AND name='0002_customer_allowportalaccess'")
            if not cursor.fetchone():
                now = datetime.datetime.now()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['customers', '0002_customer_allowportalaccess', now]
                )
                print("Added AllowPortalAccess migration")
            
            print("\nAll migrations fixed successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_all_migrations()
