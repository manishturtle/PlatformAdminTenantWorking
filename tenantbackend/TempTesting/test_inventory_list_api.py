import requests
import json

# API endpoint for listing inventory
url = 'http://localhost:8000/api/man/inventory/inventory/'

# Headers
headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzQzODQ5ODc3LCJpYXQiOjE3NDM3NjM0NzcsImp0aSI6IjZhZmM2MThjZDQ1NjRmYTliM2ZjZWUxOTU5ODUwZmUyIiwidXNlcl9pZCI6MX0.DOBSa6DwCPkfyu1ClNbExPi-XB3V0a6zvoiqAkSCKyQ',
    'Cookie': 'csrftoken=5pEi5isVebxfyXH3y4J8nLZQ11WikG0l; sessionid=8i2lq7b7n5hvyf90tlsye89gnbzp1bzn'
}

# Make the request
try:
    response = requests.get(url, headers=headers)
    
    # Print response details
    print(f"Status Code: {response.status_code}")
    print("Response Headers:")
    print(json.dumps(dict(response.headers), indent=2))
    print("\nResponse Body:")
    print(json.dumps(response.json(), indent=2))
    
except Exception as e:
    print(f"Error: {e}")
