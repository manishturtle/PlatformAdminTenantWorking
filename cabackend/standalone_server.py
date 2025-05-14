import os
import sys
import django
from django.conf import settings
from django.http import JsonResponse
from django.urls import path
from django.core.wsgi import get_wsgi_application
import json

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')

# Override migration settings to disable them
settings.MIGRATION_MODULES = {app: None for app in settings.INSTALLED_APPS}

# Initialize Django
django.setup()

from django.db import connection
from django.views.decorators.csrf import csrf_exempt

# API endpoint to get customers
def get_customers(request):
    try:
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 10))
        search = request.GET.get('search', '')
        customer_type = request.GET.get('customer_type', '')
        source = request.GET.get('source', '')
        
        offset = (page - 1) * page_size
        
        # Build query
        query = 'SELECT * FROM "Customers" WHERE 1=1'
        params = []
        
        if search:
            query += ' AND ("FirstName" ILIKE %s OR "LastName" ILIKE %s OR "Email" ILIKE %s)'
            search_param = f'%{search}%'
            params.extend([search_param, search_param, search_param])
        
        if customer_type:
            query += ' AND "CustomerType" = %s'
            params.append(customer_type)
        
        if source:
            query += ' AND "Source" = %s'
            params.append(source)
        
        # Count total records
        count_query = query.replace('SELECT *', 'SELECT COUNT(*)')
        with connection.cursor() as cursor:
            cursor.execute(count_query, params)
            total_count = cursor.fetchone()[0]
        
        # Get paginated results
        query += ' ORDER BY "CustomerID" LIMIT %s OFFSET %s'
        params.extend([page_size, offset])
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            customers = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Convert datetime objects to strings
        for customer in customers:
            for key, value in customer.items():
                if key in ['CreatedAt', 'UpdatedAt'] and value:
                    customer[key] = value.isoformat()
        
        return JsonResponse({
            'count': total_count,
            'next': f'/api/customers/?page={page+1}&page_size={page_size}' if offset + page_size < total_count else None,
            'previous': f'/api/customers/?page={page-1}&page_size={page_size}' if page > 1 else None,
            'results': customers
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# API endpoint to get or update a single customer
@csrf_exempt
def customer_detail(request, customer_id):
    try:
        if request.method == 'GET':
            # Get customer details
            with connection.cursor() as cursor:
                cursor.execute('SELECT * FROM "Customers" WHERE "CustomerID" = %s', [customer_id])
                columns = [col[0] for col in cursor.description]
                row = cursor.fetchone()
                
                if not row:
                    return JsonResponse({'error': 'Customer not found'}, status=404)
                
                customer = dict(zip(columns, row))
                
                # Convert datetime objects to strings
                for key, value in customer.items():
                    if key in ['CreatedAt', 'UpdatedAt'] and value:
                        customer[key] = value.isoformat()
            
            return JsonResponse(customer)
        
        elif request.method == 'PUT':
            try:
                # Update customer
                print(f"Received PUT request for customer_id: {customer_id}")
                data = json.loads(request.body)
                print(f"Request data: {data}")
                
                # Set default values
                data.setdefault('UpdatedBy', 'system')
                data.setdefault('AllowPortalAccess', True)  # Default to True if not provided
                
                # Validate CustomerType against frontend options
                valid_customer_types = ['Lead', 'Disqualified Lead', 'New', 'Active', 'Dormant']
                if 'CustomerType' in data and data['CustomerType'] not in valid_customer_types:
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Validation failed',
                        'errors': {
                            'CustomerType': [f'"{data["CustomerType"]}" is not a valid choice.']
                        }
                    }, status=400)
                
                columns = []
                values = []
                
                for key, value in data.items():
                    if key not in ['CustomerID', 'CreatedAt', 'UpdatedAt', 'CreatedBy']:
                        # Special handling for boolean fields
                        if key == 'AllowPortalAccess':
                            # Ensure the value is a proper boolean for SQL
                            if isinstance(value, str):
                                value = value.lower() in ('true', 't', 'yes', 'y', '1')
                        
                        columns.append(f'"{key}" = %s')
                        values.append(value)
                
                if not columns:
                    print("Error: No valid columns to update")
                    return JsonResponse({'error': 'No valid columns to update'}, status=400)
                
                values.append(customer_id)
                
                print(f"SQL: UPDATE \"Customers\" SET {', '.join(columns)} WHERE \"CustomerID\" = %s")
                print(f"Values: {values}")
                
                with connection.cursor() as cursor:
                    cursor.execute(f'UPDATE "Customers" SET {", ".join(columns)} WHERE "CustomerID" = %s RETURNING *', values)
                    updated_columns = [col[0] for col in cursor.description]
                    row = cursor.fetchone()
                    
                    if not row:
                        print(f"Error: Customer with ID {customer_id} not found")
                        return JsonResponse({'error': 'Customer not found'}, status=404)
            except Exception as e:
                print(f"Error in PUT request: {str(e)}")
                return JsonResponse({'error': str(e)}, status=400)
                
                customer = dict(zip(updated_columns, row))
                
                # Convert datetime objects to strings
                for key, value in customer.items():
                    if key in ['CreatedAt', 'UpdatedAt'] and value:
                        customer[key] = value.isoformat()
            
            return JsonResponse(customer)
        
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    except Exception as e:
        print(f"Error in customer_detail: {e}")
        return JsonResponse({'error': str(e)}, status=500)

# API endpoint to create a customer
@csrf_exempt
def create_customer(request):
    try:
        if request.method == 'POST':
            data = json.loads(request.body)
            
            # Set default values
            data.setdefault('ClientId', 1)
            data.setdefault('CompanyId', 1)
            data.setdefault('CreatedBy', 'system')
            data.setdefault('UpdatedBy', 'system')
            data.setdefault('AllowPortalAccess', True)
            
            columns = []
            placeholders = []
            values = []
            
            for key, value in data.items():
                if key not in ['CustomerID', 'CreatedAt', 'UpdatedAt']:
                    columns.append(f'"{key}"')
                    placeholders.append('%s')
                    values.append(value)
            
            with connection.cursor() as cursor:
                cursor.execute(f'INSERT INTO "Customers" ({", ".join(columns)}) VALUES ({", ".join(placeholders)}) RETURNING *', values)
                created_columns = [col[0] for col in cursor.description]
                row = cursor.fetchone()
                customer = dict(zip(created_columns, row))
                
                # Convert datetime objects to strings
                for key, value in customer.items():
                    if key in ['CreatedAt', 'UpdatedAt'] and value:
                        customer[key] = value.isoformat()
            
            return JsonResponse(customer)
        
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

# API endpoint to create a new customer
@csrf_exempt
def create_customer(request):
    try:
        if request.method == 'POST':
            # Create customer
            print("Received POST request to create customer")
            data = json.loads(request.body)
            print(f"Request data: {data}")
            
            # Set default values
            data.setdefault('CreatedBy', 'system')
            data.setdefault('UpdatedBy', 'system')
            data.setdefault('AllowPortalAccess', True)  # Default to True if not provided
            
            # Validate CustomerType against frontend options
            valid_customer_types = ['Lead', 'Disqualified Lead', 'New', 'Active', 'Dormant']
            if 'CustomerType' in data and data['CustomerType'] not in valid_customer_types:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Validation failed',
                    'errors': {
                        'CustomerType': [f'"{data["CustomerType"]}" is not a valid choice.']
                    }
                }, status=400)
            
            # Required fields for all customer types
            required_fields = ['FirstName', 'LastName', 'CustomerType']
            
            # Additional required fields based on CustomerType
            if data.get('CustomerType') in ['New', 'Active', 'Dormant']:
                required_fields.extend(['Email', 'Phone', 'Source'])
            elif data.get('CustomerType') in ['Lead', 'Disqualified Lead']:
                # For leads, either Email or Phone must be provided
                if not data.get('Email') and not data.get('Phone'):
                    return JsonResponse({
                        'status': 'error',
                        'message': 'Validation failed',
                        'errors': {
                            'Email': ['Either Email or Phone is required for leads'],
                            'Phone': ['Either Email or Phone is required for leads']
                        }
                    }, status=400)
                required_fields.append('Source')
            
            # Check required fields
            missing_fields = []
            for field in required_fields:
                if not data.get(field):
                    missing_fields.append(field)
            
            if missing_fields:
                errors = {field: ['This field is required'] for field in missing_fields}
                return JsonResponse({
                    'status': 'error',
                    'message': 'Validation failed',
                    'errors': errors
                }, status=400)
            
            # Build columns and values for SQL insert
            columns = []
            values = []
            placeholders = []
            
            for key, value in data.items():
                if key not in ['CustomerID', 'CreatedAt', 'UpdatedAt']:
                    # Special handling for boolean fields
                    if key == 'AllowPortalAccess':
                        # Ensure the value is a proper boolean for SQL
                        if isinstance(value, str):
                            value = value.lower() in ('true', 't', 'yes', 'y', '1')
                    
                    columns.append(f'"{key}"')
                    values.append(value)
                    placeholders.append('%s')
            
            # Insert the new customer
            with connection.cursor() as cursor:
                query = f'INSERT INTO "Customers" ({", ".join(columns)}) VALUES ({", ".join(placeholders)}) RETURNING *'
                print(f"SQL: {query}")
                print(f"Values: {values}")
                
                cursor.execute(query, values)
                created_columns = [col[0] for col in cursor.description]
                row = cursor.fetchone()
                
                if not row:
                    return JsonResponse({'error': 'Failed to create customer'}, status=500)
                
                customer = dict(zip(created_columns, row))
                
                # Convert datetime objects to strings
                for key, value in customer.items():
                    if key in ['CreatedAt', 'UpdatedAt'] and value:
                        customer[key] = value.isoformat()
            
            return JsonResponse(customer)
        
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    except Exception as e:
        print(f"Error in create_customer: {str(e)}")
        return JsonResponse({'error': str(e)}, status=500)

# URL patterns
urlpatterns = [
    path('api/customers/', lambda request: get_customers(request) if request.method == 'GET' else create_customer(request)),
    path('api/customers/<int:customer_id>/', customer_detail),
]

# WSGI application
application = get_wsgi_application()

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    sys.argv = ['manage.py', 'runserver', '--noreload']
    execute_from_command_line(sys.argv)
