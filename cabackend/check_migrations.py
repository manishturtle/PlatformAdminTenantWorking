import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def check_migrations():
    try:
        with connection.cursor() as cursor:
            # Get all migrations
            cursor.execute("SELECT app, name FROM django_migrations ORDER BY app, name")
            rows = cursor.fetchall()
            
            print("All applied migrations:")
            print("======================")
            
            current_app = None
            for app, name in rows:
                if app != current_app:
                    print(f"\n{app}:")
                    current_app = app
                print(f"  [X] {name}")
            
            # Check for specific migrations
            print("\n\nSpecific migrations:")
            print("===================")
            
            # Check for customers.0002_customer_allowportalaccess
            cursor.execute("SELECT COUNT(*) FROM django_migrations WHERE app='customers' AND name='0002_customer_allowportalaccess'")
            count = cursor.fetchone()[0]
            print(f"\ncustomers.0002_customer_allowportalaccess: {'APPLIED' if count > 0 else 'NOT APPLIED'}")
            
            # Check for documents migrations
            cursor.execute("SELECT name FROM django_migrations WHERE app='documents' ORDER BY name")
            docs = cursor.fetchall()
            print("\ndocuments migrations:")
            if docs:
                for name in docs:
                    print(f"  [X] {name[0]}")
            else:
                print("  None applied")
    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_migrations()
