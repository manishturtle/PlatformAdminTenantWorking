import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
import datetime

def reset_all_migrations():
    try:
        with connection.cursor() as cursor:
            # Completely clear all migration records
            print("Clearing all migration records...")
            cursor.execute("DELETE FROM django_migrations")
            print("All migration records cleared.")
            
            # Add back initial migrations for all apps
            now = datetime.datetime.now()
            apps = [
                'admin', 'auth', 'contenttypes', 'customers', 'sessions', 
                'documents', 'process', 'serviceagent', 'servicecategory', 
                'servicetickets', 'sop', 'credentials'
            ]
            
            for app in apps:
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    [app, '0001_initial', now]
                )
                print(f"Added initial migration for {app}")
            
            # Add the AllowPortalAccess migration for customers
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                ['customers', '0002_customer_allowportalaccess', now]
                )
            print("Added AllowPortalAccess migration for customers")
            
            print("\nAll migrations reset successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_all_migrations()
