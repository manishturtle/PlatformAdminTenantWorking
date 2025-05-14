from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CredentialTypeViewSet, CredentialViewSet, CustomerCredentialViewSet

router = DefaultRouter()
router.register(r'credential-types', CredentialTypeViewSet, basename='credential-types')
router.register(r'credentials', CredentialViewSet, basename='credentials')

urlpatterns = [
    path('', include(router.urls)),
    path('customers/<int:customer_id>/credentials/', CustomerCredentialViewSet.as_view({'get': 'list', 'post': 'create'}), name='customer-credentials'),
]
