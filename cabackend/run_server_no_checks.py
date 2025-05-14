import os
import sys
import django
from django.core.management import call_command

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')
django.setup()

# Disable migration checks
os.environ['DJANGO_ALLOW_ASYNC_UNSAFE'] = 'true'

# Run the server with --noreload and --nothreading to avoid migration checks
if __name__ == '__main__':
    sys.argv = ['manage.py', 'runserver', '--noreload', '--nothreading', '--skip-checks']
    call_command('runserver', '--noreload', '--nothreading', '--skip-checks')
