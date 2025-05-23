from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FeatureViewSet, FeatureGroupViewSet, SubscriptionPlanViewSet,
    check_tenant_exist, get_subscription_plan_by_tenant, change_subscription_plan
)

router = DefaultRouter()
router.register(r'features', FeatureViewSet)
router.register(r'feature-groups', FeatureGroupViewSet)
router.register(r'plans', SubscriptionPlanViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('check-tenant-exist/', check_tenant_exist, name='check_tenant_exist'),
    path('tenant/subscription-plan/', get_subscription_plan_by_tenant, name='get_subscription_plan_by_tenant'),
    path('change-subscription-plan/', change_subscription_plan, name='change_subscription_plan'),
]
