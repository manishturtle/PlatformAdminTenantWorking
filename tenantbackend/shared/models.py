from django.db import models
from typing import Dict, Any

class StatesByCountry(models.Model):
    """
    Model representing geographical data including countries, states, and cities.
    Maps to an existing database table that contains hierarchical location information.
    """
    id = models.IntegerField(primary_key=True)
    name = models.CharField(max_length=100, null=True, blank=True)
    state_id = models.IntegerField(null=True, blank=True)
    state_code = models.CharField(max_length=10, null=True, blank=True)
    state_name = models.CharField(max_length=100, null=True, blank=True)
    country_id = models.IntegerField(null=True, blank=True)
    country_code = models.CharField(max_length=10, null=True, blank=True)
    country_name = models.CharField(max_length=100, null=True, blank=True)
    latitude = models.CharField(max_length=50, null=True, blank=True)
    longitude = models.CharField(max_length=50, null=True, blank=True)
    wiki_data_id = models.CharField(max_length=50, null=True, blank=True)

    class Meta:
        db_table = 'states_by_country'
        verbose_name = 'States By Country'
        verbose_name_plural = 'States By Countries'
    
    def __str__(self) -> str:
        return f"{self.name or self.state_name or self.country_name}"
