import os
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')
django.setup()

# Import the Customer model after Django setup
from customers.models import Customer

def create_sample_customers():
    # Sample customer data
    sample_customers = [
        {
            'ClientId': 1,
            'CustomerId': 101,
            'FirstName': 'Rahul',
            'LastName': 'Sharma',
            'Email': 'rahul.sharma@example.com',
            'Phone': '9876543210',
            'AadharCard': '123456789012',
            'PANCard': 'ABCDE1234F',
            'Source': 'Referral',
            'CustomerType': 'Active',
        },
        {
            'ClientId': 1,
            'CustomerId': 102,
            'FirstName': 'Priya',
            'LastName': 'Patel',
            'Email': 'priya.patel@example.com',
            'Phone': '8765432109',
            'AadharCard': '234567890123',
            'PANCard': 'BCDEF2345G',
            'Source': 'Google Ads',
            'CustomerType': 'New',
        },
        {
            'ClientId': 1,
            'CustomerId': 103,
            'FirstName': 'Amit',
            'LastName': 'Kumar',
            'Email': 'amit.kumar@example.com',
            'Phone': '7654321098',
            'AadharCard': '345678901234',
            'PANCard': 'CDEFG3456H',
            'Source': 'Website',
            'CustomerType': 'Lead',
        },
        {
            'ClientId': 1,
            'CustomerId': 104,
            'FirstName': 'Sneha',
            'LastName': 'Gupta',
            'Email': 'sneha.gupta@example.com',
            'Phone': '6543210987',
            'AadharCard': '456789012345',
            'PANCard': 'DEFGH4567I',
            'Source': 'Existing',
            'CustomerType': 'Active',
        },
        {
            'ClientId': 1,
            'CustomerId': 105,
            'FirstName': 'Vikram',
            'LastName': 'Singh',
            'Email': 'vikram.singh@example.com',
            'Phone': '5432109876',
            'AadharCard': '567890123456',
            'PANCard': 'EFGHI5678J',
            'Source': 'Others',
            'CustomerType': 'Dormant',
        },
    ]

    # Create the customers
    customers_created = 0
    for customer_data in sample_customers:
        try:
            # Check if customer with this email already exists
            if not Customer.objects.filter(Email=customer_data['Email']).exists():
                Customer.objects.create(**customer_data)
                customers_created += 1
                print(f"Created customer: {customer_data['FirstName']} {customer_data['LastName']}")
            else:
                print(f"Customer with email {customer_data['Email']} already exists. Skipping.")
        except Exception as e:
            print(f"Error creating customer {customer_data['FirstName']} {customer_data['LastName']}: {str(e)}")

    print(f"Successfully created {customers_created} sample customers")

if __name__ == '__main__':
    create_sample_customers()
