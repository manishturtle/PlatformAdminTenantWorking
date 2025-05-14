from django.urls import path
from . import views

urlpatterns = [
    path('tenant-applications/<str:url_suffix>/', views.TenantApplicationsByUrlView.as_view(), name='tenant-applications'),
    path('tenant-subscription/<str:tenant_slug>/', views.TenantSubscriptionDetailsView.as_view(), name='tenant-subscription'),
    # Add other URL patterns here
]
