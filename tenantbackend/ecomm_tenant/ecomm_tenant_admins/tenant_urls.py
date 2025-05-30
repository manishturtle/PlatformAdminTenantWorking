"""
URL patterns for tenant users (not tenant admins).
"""
from django.urls import path
from .tenant_views import TenantUserCheckView, TenantUserLoginView

# Define app_name for namespace support
app_name = 'tenant_user'

# Define URL patterns
urlpatterns = [
    # Authentication endpoints
    path('auth/check-user/', TenantUserCheckView.as_view(), name='tenant-user-check'),
    path('auth/login/', TenantUserLoginView.as_view(), name='tenant-user-login'),
]
