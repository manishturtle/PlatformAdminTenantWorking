import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection
import datetime

def update_migration_records():
    try:
        with connection.cursor() as cursor:
            # Check if the original customers migration is in the database
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app='customers' AND name='0002_rename_customerid_customer_companyid_and_more'"
            )
            count = cursor.fetchone()[0]
            
            if count == 0:
                # Add the original customers migration record
                now = datetime.datetime.now()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['customers', '0002_rename_customerid_customer_companyid_and_more', now]
                )
                print("Added customers.0002_rename_customerid_customer_companyid_and_more migration record")
            else:
                print("customers.0002_rename_customerid_customer_companyid_and_more migration record already exists")
            
            # Check if the original documents migration is in the database
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app='documents' AND name='0002_document'"
            )
            count = cursor.fetchone()[0]
            
            if count == 0:
                # Add the original documents migration record
                now = datetime.datetime.now()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['documents', '0002_document', now]
                )
                print("Added documents.0002_document migration record")
            else:
                print("documents.0002_document migration record already exists")
            
            # Check for customers.0003_alter_customer_aadharcard_and_more
            cursor.execute(
                "SELECT COUNT(*) FROM django_migrations WHERE app='customers' AND name='0003_alter_customer_aadharcard_and_more'"
            )
            count = cursor.fetchone()[0]
            
            if count == 0:
                # Add the customers.0003 migration record
                now = datetime.datetime.now()
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    ['customers', '0003_alter_customer_aadharcard_and_more', now]
                )
                print("Added customers.0003_alter_customer_aadharcard_and_more migration record")
            else:
                print("customers.0003_alter_customer_aadharcard_and_more migration record already exists")
            
            print("\nMigration records updated successfully!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_migration_records()
