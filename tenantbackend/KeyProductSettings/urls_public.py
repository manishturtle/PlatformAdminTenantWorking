# ecomm_product/urls_public.py
from django.urls import path, include

# Define app_name for namespace support
app_name = 'public_api'

urlpatterns = [
    # Include platform admin URLs
    path('platform-admin/api/', include('ecomm_superadmin.admin_urls')),
    
    # Add any other URLs specific to the public/main website here
    # Note: Tenant-specific URLs should be in urls.py, not here
]
