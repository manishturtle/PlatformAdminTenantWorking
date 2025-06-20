"""
URL configuration for KeyProductSettings project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.generic import TemplateView

# Configure admin site
admin.site.site_header = "Turtle ERP Admin"
admin.site.site_title = "Turtle ERP Admin Portal"
admin.site.index_title = "Welcome to Turtle ERP Admin Portal"

# These URL patterns will be available at the root level
urlpatterns = [
    # External tenants routes - ecommerce order processing
    path('api/ecommerce/', include('external_tenants.urls')),
    
    # Django admin (not tenant-specific)
    path('admin/', admin.site.urls),
 
    # Platform admin routes (not tenant-specific)
    path('platform-admin/api/', include('ecomm_superadmin.admin_urls', namespace='platform_admin')),
    
    # Add additional route for platform admin to support frontend API calls
    path('api/platform-admin/api/users/', include('ecomm_superadmin.admin_urls', namespace='platform_admin_with_api_prefix')),
     
    # Subscription plan routes (not tenant-specific, in public schema)
    path('api/platform-admin/subscription/', include('subscription_plan.urls')),
    
    # Tenant-specific API routes
    # These URL patterns will be available at the tenant level (after the tenant slug in the path)
    # Example: /api/<tenant_slug>/tenant-admin/
    path('api/<str:tenant_slug>/tenant-admin/', include('ecomm_tenant.ecomm_tenant_admins.tenant_admin_urls', namespace='tenant_admin')),
    
    # Special endpoint for tenant admin roles
    path('api/<str:tenant_slug>/tenant-admin-roles/', include('ecomm_tenant.ecomm_tenant_admins.tenant_admin_urls', namespace='tenant_admin_roles')),
    
    # Tenant user routes (not tenant admin)
    path('api/<str:tenant_slug>/tenant/', include('ecomm_tenant.ecomm_tenant_admins.tenant_urls', namespace='tenant_user')),

    # Public API endpoints (if any)
    path('api/public/', include('KeyProductSettings.urls_public', namespace='public_api')),
    
    # Frontend routes - catch all tenant admin routes and let the frontend router handle them
    re_path(r'^(?P<tenant_slug>[^/]+)/tenant-admin/', TemplateView.as_view(template_name='index.html')),
    
     # Location API endpoints (countries, states, cities)
    path('api/', include('shared.urls')),
]

# Add this if you're using Django's static files in development
if settings.DEBUG:
    from django.conf.urls.static import static
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)