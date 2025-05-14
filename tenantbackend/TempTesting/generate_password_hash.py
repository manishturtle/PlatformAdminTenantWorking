from django.contrib.auth.hashers import make_password

def generate_password_hash():
    # Plain text password
    plain_password = "abc@123"
    
    # Generate Django password hash
    hashed_password = make_password(plain_password)
    
    print(f"Plain password: {plain_password}")
    print(f"Hashed password: {hashed_password}")

if __name__ == "__main__":
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')
    django.setup()
    generate_password_hash()
