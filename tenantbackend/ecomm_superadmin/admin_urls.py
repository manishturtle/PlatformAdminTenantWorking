from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ApplicationViewSet
from .views import (PlatformAdminTenantView, PlatformAdminLoginView, PlatformAdminCheckUserExistsView,
    PlatformAdminViewSet, CrmClientViewSet, ApplicationViewSet, TenantApplicationsByUrlView, TenantSubscriptionDetailsView, LineOfBusinessViewSet, TenantByDefaultUrlView, get_license_info)
from ecomm_tenant.ecomm_tenant_admins.views import TenantRolesViewSet

#from .views_2fa import TwoFactorVerifyView, TwoFactorRecoveryVerifyView
#from ecomm_tenant.ecomm_tenant_admins.views_2fa import TwoFactorVerifyView, TwoFactorRecoveryVerifyView # Corrected import path

# Define app_name for namespace support
app_name = 'platform_admin'

# Create a router for admin viewsets
admin_router = DefaultRouter()
# admin_router.register(r'tenants', PlatformAdminTenantViewSet, basename='admin-tenant')  # Commented out the ViewSet
admin_router.register(r'users', PlatformAdminViewSet, basename='admin-user')
admin_router.register(r'crmclients', CrmClientViewSet, basename='admin-crmclient')
admin_router.register(r'applications', ApplicationViewSet, basename='admin-applications')
admin_router.register(r'lines-of-business', LineOfBusinessViewSet, basename='lines-of-business')

urlpatterns = [
    # Include the router URLs
    path('', include(admin_router.urls)),
    
    # Add direct path for tenants
    path('tenants/', PlatformAdminTenantView.as_view(), name='admin-tenant-list'),
    path('tenants/<int:tenant_id>/', PlatformAdminTenantView.as_view(), name='admin-tenant-detail'),
    
    # Authentication URLs for platform admins
    path('auth/login/', PlatformAdminLoginView.as_view(), name='platform-admin-login'),
    path('auth/check-user/', PlatformAdminCheckUserExistsView.as_view(), name='platform-admin-check-user'),
    path('tenant-applications/<str:url_suffix>/', TenantApplicationsByUrlView.as_view(), name='tenant-applications-by-url'),
    path('tenant-subscription/<str:tenant_slug>/', TenantSubscriptionDetailsView.as_view(), name='tenant-subscription'),
    path('tenant/<str:tenant_slug>/roles/', TenantRolesViewSet.as_view({'get': 'list_roles'}), name='tenant-roles'),
   # path('auth/2fa/auth/', TwoFactorVerifyView.as_view(), name='platform-admin-2fa-verify'),
   # path('auth/2fa/recovery-auth/', TwoFactorRecoveryVerifyView.as_view(), name='platform-admin-2fa-recovery-verify'),
   path('lines-of-business/', LineOfBusinessViewSet.as_view({'get': 'list_lines_of_business'}), name='lines-of-business'),
   # Public endpoint to get tenant by default URL
   path('tenant-by-url/', TenantByDefaultUrlView.as_view(), name='tenant-by-default-url'),
   # Internal API endpoint to get license information
   path('license-info/', get_license_info, name='get-license-info'),
]
