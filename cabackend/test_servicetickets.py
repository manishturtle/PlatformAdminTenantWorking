import requests
import json

BASE_URL = 'http://127.0.0.1:8000/api'
session = requests.Session()

def get_auth_token():
    auth_data = {
        "user_id": "admin",
        "password": "password123"
    }
    response = requests.post(f'{BASE_URL}/login/', json=auth_data)
    if response.ok:
        return response.json()['access']
    print("Auth Error:", response.text)
    return None

def test_create_ticket(token):
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        "customerid": 1,
        "serviceticketdesc": "Test service ticket",
        "servicecategoryid": 1,
        "targetclosuredate": "2025-04-17"
    }
    response = session.post(f'{BASE_URL}/servicetickets/', json=data, headers=headers)
    print("\nCreate Ticket Response:", response.status_code)
    print(json.dumps(response.json(), indent=2) if response.ok else response.text)
    return response.json() if response.ok else None

def test_get_tickets(token):
    headers = {'Authorization': f'Bearer {token}'}
    response = session.get(f'{BASE_URL}/servicetickets/', headers=headers)
    print("\nGet Tickets Response:", response.status_code)
    print(json.dumps(response.json(), indent=2) if response.ok else response.text)

def test_get_ticket(token, ticket_id):
    headers = {'Authorization': f'Bearer {token}'}
    response = session.get(f'{BASE_URL}/servicetickets/{ticket_id}/', headers=headers)
    print(f"\nGet Ticket {ticket_id} Response:", response.status_code)
    print(json.dumps(response.json(), indent=2) if response.ok else response.text)

def test_update_ticket(token, ticket_id):
    headers = {'Authorization': f'Bearer {token}'}
    data = {
        "serviceticketdesc": "Updated test service ticket",
        "targetclosuredate": "2025-04-18"
    }
    response = session.patch(f'{BASE_URL}/servicetickets/{ticket_id}/', json=data, headers=headers)
    print(f"\nUpdate Ticket {ticket_id} Response:", response.status_code)
    print(json.dumps(response.json(), indent=2) if response.ok else response.text)

def test_filter_tickets(token):
    headers = {'Authorization': f'Bearer {token}'}
    # Test customer filter
    response = session.get(f'{BASE_URL}/servicetickets/?customerid=1', headers=headers)
    print("\nFilter by Customer Response:", response.status_code)
    print(json.dumps(response.json(), indent=2) if response.ok else response.text)

    # Test date filter
    response = session.get(f'{BASE_URL}/servicetickets/?creation_date_start=2025-04-10', headers=headers)
    print("\nFilter by Date Response:", response.status_code)
    print(json.dumps(response.json(), indent=2) if response.ok else response.text)

def run_tests():
    print("Testing Service Tickets API...")
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("Failed to get authentication token")
        return
        
    # Create a ticket
    created_ticket = test_create_ticket(token)
    if created_ticket:
        ticket_id = created_ticket.get('serviceticketid')
        
        # Test other endpoints
        test_get_tickets(token)
        test_get_ticket(token, ticket_id)
        test_update_ticket(token, ticket_id)
        test_filter_tickets(token)

if __name__ == '__main__':
    run_tests()
