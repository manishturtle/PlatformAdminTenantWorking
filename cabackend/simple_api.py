import os
import django
from django.conf import settings
from django.core.wsgi import get_wsgi_application
from django.urls import path
from django.http import JsonResponse
import json
from django.db import connection
from django.views.decorators.csrf import csrf_exempt

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'itrapp.settings')
settings.MIGRATION_MODULES = {}  # Disable migrations
django.setup()

# Simple API to get customers
def get_customers(request):
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

# Simple API to get a single customer
def get_customer(request, customer_id):
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

# Simple API to create or update a customer
@csrf_exempt
def create_or_update_customer(request, customer_id=None):
    if request.method == 'POST':
        data = json.loads(request.body)
        
        # Set default values
        data.setdefault('ClientId', 1)
        data.setdefault('CompanyId', 1)
        data.setdefault('CreatedBy', 'system')
        data.setdefault('UpdatedBy', 'system')
        data.setdefault('AllowPortalAccess', True)
        
        if customer_id:  # Update
            columns = []
            values = []
            
            for key, value in data.items():
                if key not in ['CustomerID', 'CreatedAt', 'UpdatedAt']:
                    columns.append(f'"{key}" = %s')
                    values.append(value)
            
            values.append(customer_id)
            
            with connection.cursor() as cursor:
                cursor.execute(f'UPDATE "Customers" SET {", ".join(columns)} WHERE "CustomerID" = %s RETURNING *', values)
                updated_columns = [col[0] for col in cursor.description]
                row = cursor.fetchone()
                
                if not row:
                    return JsonResponse({'error': 'Customer not found'}, status=404)
                
                customer = dict(zip(updated_columns, row))
        else:  # Create
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

# URL patterns
urlpatterns = [
    path('api/customers/', get_customers),
    path('api/customers/<int:customer_id>/', get_customer),
    path('api/customers/create/', create_or_update_customer),
    path('api/customers/update/<int:customer_id>/', create_or_update_customer),
]

# WSGI application
application = get_wsgi_application()

if __name__ == '__main__':
    from django.core.management import execute_from_command_line
    import sys
    sys.argv = ['manage.py', 'runserver', '--noreload']
    execute_from_command_line(sys.argv)
