import requests

# First get the JWT token
auth_response = requests.post(
    'https://cabe.turtleit.in/api/login/',
    json={'user_id': 'admin', 'password': 'password123'}  # Using credentials from AUTH_USER_CREDENTIALS
)

if auth_response.status_code == 200:
    token = auth_response.json()['access']
    print(f"Got JWT token: {token}")
    
    # Now use the token to get SOPs
    headers = {'Authorization': f'Bearer {token}'}
    sop_response = requests.get(
        'https://cabe.turtleit.in/api/sops/?status=active',  # SOPs are under /api/
        headers=headers
    )
    
    print("\nSOPs Response:")
    print(sop_response.json())
else:
    print("Failed to get JWT token")
    print(auth_response.json())
