from rest_framework import viewsets, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .models import ServiceCategory
from .serializers import ServiceCategorySerializer

class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'clientid', 'companyid']
    search_fields = ['servicecategoryname']
    ordering_fields = ['servicecategoryname', 'created_at']
    ordering = ['servicecategoryname']

    def get_queryset(self):
        queryset = ServiceCategory.objects.all()
        status_param = self.request.query_params.get('status', None)
        if status_param:
            # Support both the old true/false format and the explicit status names
            if status_param.lower() == 'true' or status_param.lower() == 'active':
                queryset = queryset.filter(status='active')
            elif status_param.lower() == 'false' or status_param.lower() == 'inactive':
                queryset = queryset.filter(status='inactive')
        return queryset

    def create(self, request, *args, **kwargs):
        # Set default values
        request.data['clientid'] = 1
        request.data['companyid'] = 1
        request.data['created_by'] = 'system'
        request.data['updated_by'] = 'system'

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        # Set default values
        request.data['clientid'] = 1
        request.data['companyid'] = 1
        request.data['updated_by'] = 'system'

        return super().update(request, *args, **kwargs)
