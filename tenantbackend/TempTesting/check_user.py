from django.contrib.auth import get_user_model, authenticate

def check_user():
    User = get_user_model()
    email = "ankit@turtlesoftware.co"
    password = "India@1981"
    
    print(f'Checking user with email: {email}')
    user_exists = User.objects.filter(email=email).exists()
    print(f'User exists: {user_exists}')
    
    if user_exists:
        user = User.objects.get(email=email)
        username = user.username
        print(f'Username: {username}')
        print(f'Is staff: {user.is_staff}')
        print(f'Is superuser: {user.is_superuser}')
        print(f'Is active: {user.is_active}')
        
        # Try authenticating with username and password
        print(f'\nTrying to authenticate with username: {username}')
        auth_user = authenticate(username=username, password=password)
        if auth_user:
            print('Authentication successful!')
            print(f'Authenticated user: {auth_user.username}')
        else:
            print('Authentication failed!')
            
        # Try authenticating with email and password
        print(f'\nTrying to authenticate with email: {email}')
        auth_user = authenticate(username=email, password=password)
        if auth_user:
            print('Authentication successful!')
            print(f'Authenticated user: {auth_user.username}')
        else:
            print('Authentication failed!')
    else:
        print('User not found')

if __name__ == "__main__":
    import os
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'KeyProductSettings.settings')
    django.setup()
    check_user()
