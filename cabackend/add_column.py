import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smallsoftca.settings')

import django
django.setup()

from django.db import connection

def add_column():
    with connection.cursor() as cursor:
        try:
            # Check if column already exists
            cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='Customers' AND column_name='AllowPortalAccess'")
            if not cursor.fetchone():
                # Add the column if it doesn't exist
                cursor.execute('ALTER TABLE "Customers" ADD COLUMN "AllowPortalAccess" boolean DEFAULT false')
                print("Column 'AllowPortalAccess' added successfully")
            else:
                print("Column 'AllowPortalAccess' already exists")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_column()
