from django.urls import path
from . import views

urlpatterns = [
    # Public endpoint to get tenant by default URL
    path('', views.TenantByDefaultUrlView.as_view(), name='tenant-by-default-url'),
    
    # Keep other endpoints but they should be accessed through their respective URL patterns
    path('tenant-applications/<str:url_suffix>/', views.TenantApplicationsByUrlView.as_view(), name='tenant-applications'),
    path('tenant-subscription/<str:tenant_slug>/', views.TenantSubscriptionDetailsView.as_view(), name='tenant-subscription'),
]
