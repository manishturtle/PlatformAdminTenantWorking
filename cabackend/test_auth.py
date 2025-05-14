import requests
import json
import sys

API_URL = 'http://127.0.0.1:8000'

def test_authentication():
    print("Testing JWT Authentication Flow")
    print("-" * 50)
    
    # Step 1: Login and get token
    print("\nStep 1: Login and get token")
    login_url = f"{API_URL}/api/login/"
    login_data = {
        "user_id": "admin",
        "password": "password123"
    }
    
    try:
        login_response = requests.post(login_url, json=login_data)
        print(f"Status Code: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get('access')
            print(f"\nAccess Token: {access_token[:20]}...")
            
            # Step 2: Test protected endpoint with token
            print("\nStep 2: Test protected endpoint with token")
            customers_url = f"{API_URL}/api/customers/?page=1&page_size=10"
            
            # Make sure to format the Authorization header correctly
            headers = {
                "Authorization": f"Bearer {access_token}"
            }
            
            print(f"Using Authorization header: {headers['Authorization']}")
            
            customers_response = requests.get(customers_url, headers=headers)
            print(f"Status Code: {customers_response.status_code}")
            
            if customers_response.status_code == 200:
                customers_data = customers_response.json()
                print(f"Customers count: {customers_data.get('count', 'N/A')}")
                print(f"First customer: {json.dumps(customers_data.get('results', [])[0] if customers_data.get('results') else {}, indent=2)[:200]}...")
                print("\nAuthentication flow test PASSED ")
                return True
            else:
                print(f"Error accessing protected endpoint: {customers_response.text}")
                print("\nAuthentication flow test FAILED ")
                return False
        else:
            print("\nAuthentication flow test FAILED ")
            return False
    
    except Exception as e:
        print(f"\nError during test: {str(e)}")
        print("\nAuthentication flow test FAILED ")
        return False

if __name__ == "__main__":
    success = test_authentication()
    sys.exit(0 if success else 1)
