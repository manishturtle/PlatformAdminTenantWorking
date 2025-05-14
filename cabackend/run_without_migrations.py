import os
import sys
import django
from django.conf import settings

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

# Disable migrations completely
class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None

# Apply settings
settings.MIGRATION_MODULES = DisableMigrations()

# Initialize Django
django.setup()

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    
    # Run the server with migrations disabled
    sys.argv = ['manage.py', 'runserver']
    execute_from_command_line(sys.argv)
