import requests
import json

def test_login():
    print("Testing login endpoint...")
    url = "http://127.0.0.1:8000/api/login/"
    data = {
        "user_id": "admin",
        "password": "password123"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            return response.json()
        return None
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

def test_customers_api(token):
    print("\nTesting customers API with token...")
    url = "http://127.0.0.1:8000/api/customers/?page=1&page_size=10"
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text[:500]}...")  # Show first 500 chars
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    # Step 1: Login and get token
    login_data = test_login()
    
    if login_data and "access" in login_data:
        token = login_data["access"]
        print(f"\nAccess token: {token[:20]}...")
        
        # Step 2: Test customers API with token
        success = test_customers_api(token)
        
        if success:
            print("\nAuthentication flow SUCCESSFUL!")
        else:
            print("\nAuthentication flow FAILED at customers API!")
    else:
        print("\nAuthentication flow FAILED at login!")
