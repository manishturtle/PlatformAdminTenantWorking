import os
import sys
import django
import inspect

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')
django.setup()

# Import models
from ecomm_inventory.models import *
from django.db import models

# Find all model classes in the module
model_classes = []
for name, obj in inspect.getmembers(sys.modules['ecomm_inventory.models']):
    if inspect.isclass(obj) and issubclass(obj, models.Model) and obj != models.Model:
        model_classes.append((name, obj))

# Print all models and their fields
for name, model_class in model_classes:
    print(f"\nModel: {name}")
    print("-" * 50)
    
    # Get all fields
    for field in model_class._meta.get_fields():
        field_type = field.__class__.__name__
        field_name = field.name
        
        # Additional info for foreign keys
        if hasattr(field, 'related_model') and field.related_model:
            related_model = field.related_model.__name__
            print(f"  {field_name} ({field_type}) -> {related_model}")
        else:
            print(f"  {field_name} ({field_type})")
    
    # Check for any methods related to inventory adjustments
    if name == "Inventory":
        print("\nMethods:")
        for method_name, method in inspect.getmembers(model_class, predicate=inspect.isfunction):
            if not method_name.startswith('_'):  # Skip private methods
                print(f"  {method_name}{inspect.signature(method)}")
