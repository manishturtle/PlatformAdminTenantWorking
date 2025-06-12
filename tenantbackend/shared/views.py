from django.db.models import QuerySet
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.request import Request
from typing import Dict, Any, List, Optional
from django.db.models import Subquery, OuterRef, F, Value, Q
from rest_framework.permissions import AllowAny

from shared.models import StatesByCountry
from shared.serializers import CountrySerializer, StateSerializer, CitySerializer


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving country information.
    Provides a list of all available countries.
    """
    permission_classes = [AllowAny]
    serializer_class = CountrySerializer
    pagination_class = None
    
    def get_queryset(self) -> QuerySet:
        # Get distinct countries to avoid duplicates
        return StatesByCountry.objects.filter(
            country_id__isnull=False
        ).values(
            'country_id', 'country_name', 'country_code'
        ).distinct().order_by('country_name')


class StateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving state information.
    Provides states filtered by country_id or country_code.
    """
    serializer_class = StateSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get_queryset(self) -> QuerySet:
        queryset = StatesByCountry.objects.filter(state_id__isnull=False)
        
        # Filter by country_id if provided
        country_id = self.request.query_params.get('countryId')
        if country_id:
            queryset = queryset.filter(country_id=country_id)
            
        # Filter by country_code if provided
        country_code = self.request.query_params.get('countryCode')
        if country_code:
            queryset = queryset.filter(country_code=country_code)
        
        # Return distinct states for the specified filters
        return queryset.values(
            'state_id', 'state_name', 'state_code', 'country_id'
        ).distinct().order_by('state_name')


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving city information.
    Provides cities filtered by state_id.
    """
    serializer_class = CitySerializer
    permission_classes = [AllowAny]
    pagination_class = None
    
    def get_queryset(self) -> QuerySet:
        queryset = StatesByCountry.objects.filter(name__isnull=False)
        
        # Filter by state_id if provided
        state_id = self.request.query_params.get('stateId')
        if state_id:
            queryset = queryset.filter(state_id=state_id)
        else:
            # Return empty queryset if state_id is not provided
            return StatesByCountry.objects.none()
        
        # Return cities for the specified state_id
        return queryset.order_by('name')
