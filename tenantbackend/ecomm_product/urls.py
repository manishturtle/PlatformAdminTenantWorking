from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet,
    BrandViewSet,
    AttributeViewSet,
    AttributeValueViewSet,
    ProductViewSet,
    ProductVariantViewSet,
    ProductImageViewSet,
    ProductReviewViewSet
)

# Define app_name for namespace
app_name = 'products'

# Create a router for the product app
router = DefaultRouter()
router.register(r'categories', CategoryViewSet, basename='product-category')
router.register(r'brands', BrandViewSet, basename='product-brand')
router.register(r'attributes', AttributeViewSet, basename='product-attribute')
router.register(r'attribute-values', AttributeValueViewSet, basename='product-attribute-value')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'variants', ProductVariantViewSet, basename='product-variant')
router.register(r'images', ProductImageViewSet, basename='product-image')
router.register(r'reviews', ProductReviewViewSet, basename='product-review')

urlpatterns = [
    path('', include(router.urls)),
]
