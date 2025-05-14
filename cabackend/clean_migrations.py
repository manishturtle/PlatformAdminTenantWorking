import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

import django
django.setup()

from django.db import connection

def clean_migrations():
    try:
        with connection.cursor() as cursor:
            # Drop the django_migrations table
            print("Dropping django_migrations table...")
            cursor.execute("DROP TABLE IF EXISTS django_migrations")
            
            # Recreate the django_migrations table
            print("Creating django_migrations table...")
            cursor.execute("""
                CREATE TABLE django_migrations (
                    id SERIAL PRIMARY KEY,
                    app VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    applied TIMESTAMP NOT NULL
                )
            """)
            
            print("Migration history cleaned successfully.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clean_migrations()
