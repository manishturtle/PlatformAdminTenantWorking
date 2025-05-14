from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceCategoryViewSet

# Create a router and register our viewset
router = DefaultRouter()
router.register(r'', ServiceCategoryViewSet, basename='servicecategory')

# Set the application namespace
app_name = 'servicecategories'

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]
