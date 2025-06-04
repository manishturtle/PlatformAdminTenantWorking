"""
URL configuration for itrapp project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from rest_framework.documentation import include_docs_urls
from django.conf import settings
from django.conf.urls.static import static
from .views import migrate_tenant_schema
from .views import get_subscription_plan_by_tenant, get_user_subscription_plan_with_roles

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('customers.urls')),  # Include customers app URLs under /api/
    path('api/', include('authentication.urls')),  # Include authentication app URLs under /api/
    path('api/', include('documents.urls')),  # Include documents app URLs under /api/
    path('api/', include('credentials.urls')),  # Include credentials app URLs under /api/
    path('', include('sop.urls')),  # Include SOP app URLs
    path('api/', include('process.urls')),  # Include Process app URLs
    path('api/servicecategories/', include('servicecategory.urls')),  # Include Service Category URLs
    path('api/serviceagents/', include('serviceagent.urls')),  # Include Service Agent URLs
    path('api/servicetickets/', include('servicetickets.urls', namespace='servicetickets')),  # Include Service Tickets URLs with namespace
    path('api/portal/', include('externalcustomer.api.urls')),  # Include external customer portal URLs
    path('api-auth/', include('rest_framework.urls')),  # DRF browsable API authentication
    path('api/tenant/migrate/', migrate_tenant_schema, name='migrate-tenant-schema'),  # Tenant schema migration
    # path('docs/', include_docs_urls(title='ITR App API')),  # API documentation

    path('api/management/', include('role_management.role_controles.urls')), # role management
    path('api/subscription/plan/', get_subscription_plan_by_tenant, name='get-subscription-plan-by-tenant'),
    path('api/subscription/plan/user/', get_user_subscription_plan_with_roles, name='get-user-subscription-plan-with-roles'),

]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
