import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def remove_duplicate_migrations():
    try:
        with connection.cursor() as cursor:
            # Remove the duplicate customers migration record
            cursor.execute(
                "DELETE FROM django_migrations WHERE app='customers' AND name='0002_customer_allowportalaccess'"
            )
            print("Removed duplicate customers.0002_customer_allowportalaccess migration record")
            
            # Remove the duplicate documents migration record
            cursor.execute(
                "DELETE FROM django_migrations WHERE app='documents' AND name='0002_document_fixed'"
            )
            print("Removed duplicate documents.0002_document_fixed migration record")
            
            print("\nDuplicate migration records removed successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    remove_duplicate_migrations()
