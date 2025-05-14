import requests
import json

# API endpoint for adding inventory
url = 'http://localhost:8000/api/man/inventory/inventory/add_inventory/'

# Headers with JWT token
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQzODQ5ODc3LCJpYXQiOjE3NDM3NjM0NzcsImp0aSI6IjZhZmM2MThjZDQ1NjRmYTliM2ZjZWUxOTU5ODUwZmUyIiwidXNlcl9pZCI6MX0.DOBSa6DwCPkfyu1ClNbExPi-XB3V0a6zvoiqAkSCKyQ'
}

# Request data - using a non-serialized product (ID 3)
data = {
    "product_id": 3,  # Office Chair (non-serialized)
    "location_id": 1,
    "stock_quantity": 50,
    "adjustment_reason_id": 1,
    "notes": "Initial stock for Office Chair"
}

# Make the request
try:
    print("Sending request with data:")
    print(json.dumps(data, indent=2))
    
    response = requests.post(url, headers=headers, json=data)
    
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
