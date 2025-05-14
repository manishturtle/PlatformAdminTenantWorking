import subprocess
import sys
import os

def install_dependencies():
    """Install compatible versions of Django and Django REST Framework."""
    print("Installing dependencies with compatible versions...")
    
    # First uninstall current versions to avoid conflicts
    subprocess.check_call([sys.executable, "-m", "pip", "uninstall", "-y", "django", "djangorestframework"])
    
    # Install compatible versions
    # Django 4.2 LTS with DRF 3.14
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Django==4.2.10", "djangorestframework==3.14.0"])
    
    # Install essential packages without compilation requirements
    essential_packages = [
        "asgiref",
        "django-cors-headers",
        "django-tenant-schemas",
        "django-tenants",
        "djangorestframework_simplejwt",
        "psycopg2-binary",
        "PyJWT",
        "pymongo",
        "requests"
    ]
    
    print("\nInstalling essential packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install"] + essential_packages)
    
    print("\nDependencies installed successfully!")
    print("\nYou can now run the server with: python manage.py runserver")
    
    # Try to run the server
    print("\nAttempting to start the Django server...")
    try:
        subprocess.check_call([sys.executable, "manage.py", "runserver"])
    except subprocess.CalledProcessError:
        print("\nServer failed to start. You may need to run migrations first:")
        print("python manage.py migrate")

if __name__ == "__main__":
    install_dependencies()
