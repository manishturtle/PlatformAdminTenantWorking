import requests
import json

# API endpoint for getting inventory list
url = 'http://localhost:8000/api/man/inventory/inventory/'

# Headers with JWT token
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQzODQ5ODc3LCJpYXQiOjE3NDM3NjM0NzcsImp0aSI6IjZhZmM2MThjZDQ1NjRmYTliM2ZjZWUxOTU5ODUwZmUyIiwidXNlcl9pZCI6MX0.DOBSa6DwCPkfyu1ClNbExPi-XB3V0a6zvoiqAkSCKyQ'
}

# Make the request
try:
    print("Sending GET request to inventory endpoint...")
    
    response = requests.get(url, headers=headers)
    
    # Print response details
    print(f"\nStatus Code: {response.status_code}")
    print("Response Headers:")
    print(json.dumps(dict(response.headers), indent=2))
    print("\nResponse Body:")
    try:
        print(json.dumps(response.json(), indent=2))
    except:
        print(response.text)
    
except Exception as e:
    print(f"Error: {e}")

# Get a specific inventory item by ID
inventory_id = 2  # Use the ID from the previous response
detail_url = f'http://localhost:8000/api/man/inventory/inventory/{inventory_id}/'

try:
    print("\n\nSending GET request for specific inventory item...")
    
    detail_response = requests.get(detail_url, headers=headers)
    
    # Print response details
    print(f"\nStatus Code: {detail_response.status_code}")
    print("Response Headers:")
    print(json.dumps(dict(detail_response.headers), indent=2))
    print("\nResponse Body:")
    try:
        print(json.dumps(detail_response.json(), indent=2))
    except:
        print(detail_response.text)
    
except Exception as e:
    print(f"Error: {e}")
