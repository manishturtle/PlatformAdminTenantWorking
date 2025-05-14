import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def update_database():
    try:
        with connection.cursor() as cursor:
            # Check if the AllowPortalAccess column exists
            cursor.execute("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='Customers' AND column_name='AllowPortalAccess'
            """)
            column_exists = cursor.fetchone()
            
            if not column_exists:
                # Add the column if it doesn't exist
                print("Adding AllowPortalAccess column to Customers table...")
                cursor.execute('ALTER TABLE "Customers" ADD COLUMN "AllowPortalAccess" boolean DEFAULT true')
                print("Column added successfully.")
            else:
                # Update the default value for the column
                print("AllowPortalAccess column already exists. Updating default value...")
                cursor.execute('ALTER TABLE "Customers" ALTER COLUMN "AllowPortalAccess" SET DEFAULT true')
                # Update existing records to have AllowPortalAccess = true
                cursor.execute('UPDATE "Customers" SET "AllowPortalAccess" = true WHERE "AllowPortalAccess" IS NULL')
                print("Default value updated and existing records updated.")
            
            print("Database update completed successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    update_database()
