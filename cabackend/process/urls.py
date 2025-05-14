from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProcessMasterViewSet

router = DefaultRouter()
router.register(r'processes', ProcessMasterViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
