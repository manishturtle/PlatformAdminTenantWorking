import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
import datetime

def fix_documents_migration():
    try:
        with connection.cursor() as cursor:
            # Check for the documents migration
            cursor.execute(
                "SELECT * FROM django_migrations WHERE app='documents' AND name='0002_document'"
            )
            if cursor.fetchone():
                # Delete the problematic migration
                print("Deleting problematic documents migration...")
                cursor.execute(
                    "DELETE FROM django_migrations WHERE app='documents' AND name='0002_document'"
                )
                print("Problematic documents migration deleted.")
            else:
                print("No problematic documents migration found.")
                
            # Check if we need to add a fixed version
            cursor.execute(
                "SELECT * FROM django_migrations WHERE app='documents' AND name='0002_document_fixed'"
            )
            if not cursor.fetchone():
                # Add a fixed version of the migration
                now = datetime.datetime.now()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['documents', '0002_document_fixed', now]
                )
                print("Fixed documents migration added.")
            else:
                print("Fixed documents migration already exists.")
                
            print("\nDocuments migration fixed successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_documents_migration()
