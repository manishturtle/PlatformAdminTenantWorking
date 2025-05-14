import requests
import json

def test_check_user_api():
    url = "http://localhost:8000/platform-admin/api/auth/check-user/"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "email": "ankit@turtlesoftware.co"
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response
    except requests.exceptions.RequestException as e:
        print(f"Error: {e}")
        return None

def test_login_api():
    url = "http://localhost:8000/platform-admin/api/auth/login/"
    headers = {
        "Content-Type": "application/json",
        "X-Platform-Admin": "true"
    }
    data = {
        "email": "ankit@turtlesoftware.co",
        "password": "India@1981"
    }
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(data))
        print(f"Login Status Code: {response.status_code}")
        print(f"Login Response: {response.text}")
        return response
    except requests.exceptions.RequestException as e:
        print(f"Login Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing check-user API:")
    test_check_user_api()
    
    print("\nTesting login API:")
    test_login_api()
