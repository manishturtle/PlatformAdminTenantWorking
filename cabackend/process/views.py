from rest_framework import viewsets, filters, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import ProcessMaster
from .serializers import ProcessMasterSerializer
from django.shortcuts import get_object_or_404

from rest_framework.pagination import PageNumberPagination

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link() is not None,
            'previous': self.get_previous_link() is not None,
            'results': data
        })

class ProcessMasterViewSet(viewsets.ModelViewSet):
    """
    API endpoint for Process management.
    
    Provides CRUD operations for Processes.
    """
    queryset = ProcessMaster.objects.all()
    serializer_class = ProcessMasterSerializer
    pagination_class = CustomPageNumberPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ProcessName', 'Description']
    search_fields = ['ProcessName', 'Description']
    ordering_fields = ['ProcessName', 'CreatedAt']
    ordering = ['ProcessName']
    
    def create(self, request, *args, **kwargs):
        # Ensure ClientId and CompanyId are set to 1 as per requirements
        data = request.data.copy()
        data['ClientId'] = 1
        data['CompanyId'] = 1
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        
        # Set CreatedBy if user is authenticated
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_create(self, serializer):
        serializer.save(CreatedBy=str(self.request.user) if self.request.user.is_authenticated else None)
    
    def update(self, request, *args, **kwargs):
        # Ensure ClientId and CompanyId remain as 1
        data = request.data.copy()
        data['ClientId'] = 1
        data['CompanyId'] = 1
        
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Set UpdatedBy if user is authenticated
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def perform_update(self, serializer):
        serializer.save(UpdatedBy=str(self.request.user) if self.request.user.is_authenticated else None)
