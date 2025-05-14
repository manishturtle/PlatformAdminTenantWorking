import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def fix_document_migration_file():
    try:
        with connection.cursor() as cursor:
            # Delete the problematic migration record
            cursor.execute("DELETE FROM django_migrations WHERE app='documents' AND name='0002_document'")
            print("Deleted problematic documents.0002_document migration record")
            
            # Check if the fixed migration is already applied
            cursor.execute("SELECT COUNT(*) FROM django_migrations WHERE app='documents' AND name='0002_document_fixed'")
            count = cursor.fetchone()[0]
            
            if count == 0:
                # Add the fixed migration record
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW())",
                    ['documents', '0002_document_fixed']
                )
                print("Added documents.0002_document_fixed migration record")
            else:
                print("documents.0002_document_fixed migration record already exists")
            
            print("\nMigration records updated successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_document_migration_file()
