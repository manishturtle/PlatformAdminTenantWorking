from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DocumentTypeViewSet, 
    upload_document, 
    list_documents, 
    document_detail, 
    get_document_versions, 
    download_document
)

router = DefaultRouter()
router.register(r'document-types', DocumentTypeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('documents/upload/', upload_document, name='upload-document'),
    path('documents/', list_documents, name='list-documents'),
    path('documents/<int:document_id>/', document_detail, name='document-detail'),
    path('documents/<int:document_id>/versions/', get_document_versions, name='get-document-versions'),
    path('documents/<int:document_id>/download/', download_document, name='download-document'),
]
