from django.urls import path, include
from rest_framework.routers import DefaultRouter
from typing import List

from shared.views import CountryViewSet, StateViewSet, CityViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'countries', CountryViewSet, basename='countries')
router.register(r'states', StateViewSet, basename='states')
router.register(r'cities', CityViewSet, basename='cities')

# The API URLs are now determined automatically by the router
urlpatterns: List = [
    # Create v1 endpoints under location path to bypass tenant routing
    path('location/v1/', include(router.urls)),
]
