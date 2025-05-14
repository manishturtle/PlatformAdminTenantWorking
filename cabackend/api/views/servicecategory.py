from rest_framework import viewsets, status
from rest_framework.response import Response
from ..models.servicecategory import ServiceCategory
from ..serializers.servicecategory import ServiceCategorySerializer
from rest_framework.permissions import IsAuthenticated

class ServiceCategoryViewSet(viewsets.ModelViewSet):
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        # Set default values
        request.data['clientid'] = 1
        request.data['companyid'] = 1
        request.data['created_by'] = request.user.username
        request.data['updated_by'] = request.user.username

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        # Set default values
        request.data['clientid'] = 1
        request.data['companyid'] = 1
        request.data['updated_by'] = request.user.username

        return super().update(request, *args, **kwargs)
