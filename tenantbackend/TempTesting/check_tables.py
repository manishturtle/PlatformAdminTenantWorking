from django.core.management.base import BaseCommand
from django.db import connection

def run():
    with connection.cursor() as cursor:
        # Get all tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        print("Available tables in the database:")
        for table in tables:
            print(f"- {table[0]}")
        
        # Search for tenant user related tables
        print("\nSearching for tenant user related tables:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name LIKE '%tenant%user%'
            ORDER BY table_name;
        """)
        tenant_tables = cursor.fetchall()
        if tenant_tables:
            print("Found tenant user related tables:")
            for table in tenant_tables:
                print(f"- {table[0]}")
        else:
            print("No tenant user related tables found.")

if __name__ == "__main__":
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')
    django.setup()
    run()
