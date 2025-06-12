from rest_framework import serializers
from typing import Dict, Any, List

from shared.models import StatesByCountry


class CountrySerializer(serializers.ModelSerializer):
    """
    Serializer for country data.
    Provides a standardized representation of country information.
    """
    id = serializers.IntegerField(source='country_id')
    name = serializers.CharField(source='country_name')
    code = serializers.CharField(source='country_code')
    
    class Meta:
        model = StatesByCountry
        fields = ['id', 'name', 'code']


class StateSerializer(serializers.ModelSerializer):
    """
    Serializer for state data.
    Provides a standardized representation of state information.
    """
    id = serializers.IntegerField(source='state_id')
    name = serializers.CharField(source='state_name')
    code = serializers.CharField(source='state_code')
    country_id = serializers.IntegerField()
    
    class Meta:
        model = StatesByCountry
        fields = ['id', 'name', 'code', 'country_id']


class CitySerializer(serializers.ModelSerializer):
    """
    Serializer for city data.
    Provides a standardized representation of city information.
    """
    # No need to specify source when it's the same as the field name
    id = serializers.IntegerField()
    name = serializers.CharField()
    state_id = serializers.IntegerField()
    
    class Meta:
        model = StatesByCountry
        fields = ['id', 'name', 'state_id', 'latitude', 'longitude']
