# Multi-Tenant Architecture Guide

This guide explains how to add new applications to the multi-tenant architecture of the TurtleEComm ERP system.

## Overview

The TurtleEComm ERP system uses a schema-based multi-tenant approach where:
- Each tenant has its own PostgreSQL schema identified by a slug in the URL
- All tables for different modules (inventory, product, etc.) are created within that tenant's schema
- The `TenantRoutingMiddleware` handles schema switching based on URL patterns
- The `TenantAwareModel` provides tenant-specific fields and table creation

## Adding a New Application

Follow these steps to create a new tenant-aware application:

### 1. Create the Django App

```bash
python manage.py startapp ecomm_your_app_name
```

### 2. Create Models Using the Base Model

In your `models.py`, inherit from `TenantAwareModel`:

```python
from ecomm_tenant.base_model import TenantAwareModel
from django.db import models

class YourModel(TenantAwareModel):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.name
```

### 3. Register Your App in the Registry

In your app's `apps.py`:

```python
from django.apps import AppConfig
from ecomm_tenant.app_registry import TenantAppRegistry

class YourAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ecomm_your_app_name'
    
    def ready(self):
        # Register this app with the tenant registry
        TenantAppRegistry.register_app('ecomm_your_app_name')
```

### 4. Create Tenant-Aware ViewSets

In your `views.py`:

```python
from ecomm_tenant.base_viewset import TenantAwareViewSet
from .models import YourModel
from .serializers import YourModelSerializer

class YourModelViewSet(TenantAwareViewSet):
    queryset = YourModel.objects.all()
    serializer_class = YourModelSerializer
```

### 5. Create Serializers

In your `serializers.py`:

```python
from rest_framework import serializers
from .models import YourModel

class YourModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = YourModel
        fields = ['id', 'name', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']
```

### 6. Configure URLs

In your `urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import YourModelViewSet

app_name = 'your_app_name'

router = DefaultRouter()
router.register(r'your-models', YourModelViewSet, basename='yourmodel')

urlpatterns = [
    path('', include(router.urls)),
]
```

### 7. Include in Main URLs

In the main `urls.py`:

```python
urlpatterns = [
    # ... existing URLs
    path('api/v1/your-app/', include('ecomm_your_app_name.urls')),
]
```

## Testing Your Tenant-Aware App

Access your API using the tenant slug in the URL:

```
http://api/[tenant-slug]/your-app/your-models/
```

The middleware will:
1. Extract the tenant slug
2. Set the appropriate database schema
3. Ensure all required tables exist
4. Process the request in the tenant context

## Debugging

If you encounter issues, use the debugging utilities:

```python
from ecomm_tenant.debug_utils import debug_tenant_tables, fix_missing_tables

# Check tables for a tenant
results = debug_tenant_tables('tenant-slug')

# Fix missing tables
fix_results = fix_missing_tables('tenant-slug')
```

## Best Practices

1. Always inherit from `TenantAwareModel` for tenant-aware models
2. Use `TenantAwareViewSet` for all API views
3. Register your app with `TenantAppRegistry`
4. Test thoroughly with multiple tenants
5. Use the debugging utilities to diagnose issues
