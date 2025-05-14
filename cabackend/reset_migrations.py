import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
import datetime

def reset_migrations():
    try:
        with connection.cursor() as cursor:
            print("Cleaning up migration records...")
            
            # Clean up all migrations for customers and documents
            cursor.execute("DELETE FROM django_migrations WHERE app IN ('customers', 'documents')")
            
            # Add initial migration records
            now = datetime.datetime.now()
            migrations_to_add = [
                ('customers', '0001_initial'),
                ('documents', '0001_initial')
            ]
            
            for app, name in migrations_to_add:
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    [app, name, now]
                )
            
            print("Migration records reset successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    reset_migrations()
