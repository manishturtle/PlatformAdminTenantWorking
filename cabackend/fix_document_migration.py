import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def fix_document_migration():
    try:
        with connection.cursor() as cursor:
            # Check the documents migration that's causing the problem
            cursor.execute(
                "SELECT * FROM django_migrations WHERE app='documents' AND name='0002_document'"
            )
            if cursor.fetchone():
                # Update the dependency to point to our new migration
                print("Fixing documents migration dependency...")
                cursor.execute(
                    "UPDATE django_migrations SET name='0002_document_fixed' WHERE app='documents' AND name='0002_document'"
                )
                print("Documents migration dependency fixed.")
                
                # Create a new migration file for documents that depends on our new migration
                print("Creating a new migration file for documents...")
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                    ['documents', '0002_document_fixed']
                )
                print("New documents migration created and marked as applied.")
            else:
                print("Documents migration not found.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_document_migration()
