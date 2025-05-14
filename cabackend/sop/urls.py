from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SOPMasterViewSet
from .process_sop_views import ProcessSOPViewSet
from .step_views import SOPStepsViewSet, SOPStepsBySOPViewSet

router = DefaultRouter()
router.register(r'sops', SOPMasterViewSet)
router.register(r'steps', SOPStepsViewSet)

# Process-specific SOP endpoints
process_sop_list = ProcessSOPViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

# SOP-specific step endpoints
sop_steps_list = SOPStepsBySOPViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

# SOP steps reorder endpoint
sop_steps_reorder = SOPStepsBySOPViewSet.as_view({
    'post': 'reorder'
})

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/processes/<int:process_id>/sops/', process_sop_list, name='process-sops'),
    path('api/sops/<int:sop_id>/steps/', sop_steps_list, name='sop-steps'),
    path('api/sops/<int:sop_id>/steps/reorder/', sop_steps_reorder, name='sop-steps-reorder'),
]
