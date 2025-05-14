import requests
import json

# API endpoint
url = "http://localhost:8000/platform-admin/api/auth/login/"

# Request headers
headers = {
    "Content-Type": "application/json"
}

# Request payload
payload = {
    "email": "ankit@turtlesoftware.co",
    "password": "India@123"
}

# Make the POST request
response = requests.post(url, headers=headers, json=payload)

# Print status code
print(f"Status Code: {response.status_code}")

# Print response headers
print("\nResponse Headers:")
for header, value in response.headers.items():
    print(f"{header}: {value}")

# Print response body
print("\nResponse Body:")
try:
    print(json.dumps(response.json(), indent=4))
except:
    print(response.text)
