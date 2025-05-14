from django.contrib import admin
from .models import SubscriptionPlan, FeatureGroup, Feature, PlanFeatureEntitlement

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'price', 'status', 'max_users', 'storage_limit', 'support_level', 'valid_from', 'valid_until')
    search_fields = ('name', 'description')
    list_filter = ('status', 'support_level', 'session_type', 'created_at')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(FeatureGroup)
class FeatureGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'app_id', 'created_at')
    search_fields = ('name', 'description')
    list_filter = ('app_id', 'created_at')

@admin.register(Feature)
class FeatureAdmin(admin.ModelAdmin):
    list_display = ('name', 'key', 'group', 'app_id', 'is_active')
    search_fields = ('name', 'key', 'description')
    list_filter = ('is_active', 'app_id', 'group')
    autocomplete_fields = ['group']

@admin.register(PlanFeatureEntitlement)
class PlanFeatureEntitlementAdmin(admin.ModelAdmin):
    list_display = ('plan', 'feature', 'created_at')
    search_fields = ('plan__name', 'feature__name')
    list_filter = ('plan', 'feature')
    autocomplete_fields = ['plan', 'feature']
