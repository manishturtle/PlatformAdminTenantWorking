import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def list_migrations():
    try:
        with connection.cursor() as cursor:
            print("\n===== APPLIED MIGRATIONS =====\n")
            
            # Query all migrations
            cursor.execute("SELECT app, name, applied FROM django_migrations ORDER BY app, name")
            migrations = cursor.fetchall()
            
            # Group migrations by app
            current_app = None
            for app, name, applied in migrations:
                if app != current_app:
                    print(f"\n{app}:")
                    current_app = app
                print(f"  [X] {name}")
            
            print("\n===== SPECIFIC MIGRATIONS OF INTEREST =====\n")
            
            # Specifically check for customers migrations
            print("Customers migrations:")
            cursor.execute("SELECT name, applied FROM django_migrations WHERE app='customers' ORDER BY name")
            customer_migrations = cursor.fetchall()
            if customer_migrations:
                for name, applied in customer_migrations:
                    print(f"  [X] {name} (applied: {applied})")
            else:
                print("  No customers migrations found")
            
            # Check for documents migrations
            print("\nDocuments migrations:")
            cursor.execute("SELECT name, applied FROM django_migrations WHERE app='documents' ORDER BY name")
            document_migrations = cursor.fetchall()
            if document_migrations:
                for name, applied in document_migrations:
                    print(f"  [X] {name} (applied: {applied})")
            else:
                print("  No documents migrations found")
                
            # Check for the specific AllowPortalAccess migration
            print("\nAllowPortalAccess migration status:")
            cursor.execute("SELECT * FROM django_migrations WHERE app='customers' AND name='0002_customer_allowportalaccess'")
            portal_access_migration = cursor.fetchone()
            if portal_access_migration:
                print(f"  [X] APPLIED: customers.0002_customer_allowportalaccess (applied: {portal_access_migration[2]})")
            else:
                print("  [ ] NOT APPLIED: customers.0002_customer_allowportalaccess")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_migrations()
