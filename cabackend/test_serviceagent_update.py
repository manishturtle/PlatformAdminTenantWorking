import requests
import json
from requests.auth import HTTPBasicAuth

# API endpoint
base_url = "https://cabe.turtleit.in"
endpoint = f"{base_url}/api/serviceagents/"

# Authentication credentials
username = "turtle"
password = "turtle123"

# Create a session to maintain cookies
session = requests.Session()

# Try to login to obtain a session cookie
def login():
    login_url = f"{base_url}/api-auth/login/"
    
    # First get the CSRF token
    response = session.get(login_url)
    if response.status_code != 200:
        print(f"Failed to get login page: {response.status_code}")
        return False
    
    # Now login with credentials
    login_data = {
        'username': username,
        'password': password,
        'next': '/'
    }
    response = session.post(login_url, data=login_data)
    
    if response.status_code == 200 or response.status_code == 302:
        print("Login successful")
        return True
    else:
        print(f"Login failed: {response.status_code}")
        print(response.text)
        return False

# Try to login
login_success = login()

# Test function to get a list of service agents
def get_service_agents():
    # Try with both basic auth and session auth
    response = session.get(endpoint, auth=HTTPBasicAuth(username, password))
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting service agents: {response.status_code}")
        print(response.text)
        return None

# Test function to get a specific service agent
def get_service_agent(service_agent_id):
    response = session.get(f"{endpoint}{service_agent_id}/", auth=HTTPBasicAuth(username, password))
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting service agent {service_agent_id}: {response.status_code}")
        print(response.text)
        return None

# Test function to update a service agent
def update_service_agent(service_agent_id, data):
    print(f"Updating service agent {service_agent_id} with data: {json.dumps(data, indent=2)}")
    
    response = session.put(
        f"{endpoint}{service_agent_id}/", 
        json=data, 
        auth=HTTPBasicAuth(username, password)
    )
    
    print(f"Response status code: {response.status_code}")
    try:
        print(f"Response data: {json.dumps(response.json(), indent=2)}")
        return response.json()
    except:
        print(f"Response text: {response.text}")
        return None

# Main test flow
def run_test():
    # Get all service agents
    print("Getting all service agents...")
    service_agents = get_service_agents()
    
    if not service_agents:
        print("No service agents found or error retrieving them.")
        return
    
    if not service_agents.get('results'):
        print("No service agents found in results.")
        return
    
    # Get the first service agent for testing
    service_agent = service_agents['results'][0]
    service_agent_id = service_agent['serviceagentid']
    
    print(f"Found service agent to test: ID {service_agent_id}, Name: {service_agent['serviceagentname']}")
    
    # Get current data for this agent
    current_data = get_service_agent(service_agent_id)
    if not current_data:
        print("Error retrieving service agent details.")
        return
    
    # Prepare update data - modifying name and keeping other fields
    update_data = {
        'serviceagentname': f"{current_data['serviceagentname']} - Updated",
        'emailid': current_data['emailid'],
        'allowportalaccess': current_data['allowportalaccess'],
        'status': current_data['status'],
        # Include expertat_ids if present
        'expertat_ids': [cat['servicecategoryid'] for cat in current_data['expert_categories']] if current_data['expert_categories'] else []
    }
    
    # Test update
    print("\nTesting service agent update...")
    updated_agent = update_service_agent(service_agent_id, update_data)
    
    if updated_agent:
        print("\nUpdate successful!")
        print(f"Updated name: {updated_agent['serviceagentname']}")
    else:
        print("\nUpdate failed!")

if __name__ == "__main__":
    run_test()
