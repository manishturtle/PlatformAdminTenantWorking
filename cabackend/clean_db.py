import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def clean_database():
    try:
        with connection.cursor() as cursor:
            # Get list of all tables
            cursor.execute("""
                SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            """)
            tables = cursor.fetchall()
            
            # Disable triggers
            cursor.execute("SET session_replication_role = 'replica';")
            
            # Drop each table
            for table in tables:
                table_name = table[0]
                print(f"Dropping table {table_name}...")
                cursor.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE;")
            
            # Re-enable triggers
            cursor.execute("SET session_replication_role = 'origin';")
            
            print("Database cleaned successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clean_database()
