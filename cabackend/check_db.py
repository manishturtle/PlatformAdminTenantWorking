import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')
django.setup()

# Now we can import Django models
from django.db import connection

# Get all table names in the database
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = cursor.fetchall()

print("Tables in the database:")
for table in tables:
    print(f"- {table[0]}")

# Check if the Customer table exists and its structure
from customers.models import Customer
print("\nCustomer model fields:")
for field in Customer._meta.get_fields():
    print(f"- {field.name} ({field.__class__.__name__})")

# Check if the Password field exists in the Customer model
has_password_field = any(field.name == 'Password' for field in Customer._meta.get_fields())
print(f"\nPassword field exists in Customer model: {has_password_field}")

# Check if the migration has been applied
from django.db.migrations.recorder import MigrationRecorder
applied_migrations = MigrationRecorder.Migration.objects.filter(app='customers').values_list('name', flat=True)
print("\nApplied migrations for customers app:")
for migration in applied_migrations:
    print(f"- {migration}")

print("\nIs 0004_customer_password applied?", '0004_customer_password' in applied_migrations)
