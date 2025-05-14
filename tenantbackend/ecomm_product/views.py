from django.shortcuts import render
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Category,
    Brand,
    Attribute,
    AttributeValue,
    Product,
    ProductVariant,
    ProductVariantAttribute,
    ProductImage,
    ProductReview
)
from .serializers import (
    CategorySerializer,
    BrandSerializer,
    AttributeSerializer,
    AttributeValueSerializer,
    ProductSerializer,
    ProductDetailSerializer,
    ProductVariantSerializer,
    ProductVariantAttributeSerializer,
    ProductImageSerializer,
    ProductReviewSerializer
)

class CategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product categories.
    """
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['name', 'parent', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """
        Get all products in a specific category.
        """
        category = self.get_object()
        products = Product.objects.filter(category=category)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

class BrandViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product brands.
    """
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['name', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """
        Get all products for a specific brand.
        """
        brand = self.get_object()
        products = Product.objects.filter(brand=brand)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)

class AttributeViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product attributes.
    """
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['name', 'is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    
    @action(detail=True, methods=['get'])
    def values(self, request, pk=None):
        """
        Get all values for a specific attribute.
        """
        attribute = self.get_object()
        values = AttributeValue.objects.filter(attribute=attribute)
        serializer = AttributeValueSerializer(values, many=True)
        return Response(serializer.data)

class AttributeValueViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product attribute values.
    """
    queryset = AttributeValue.objects.all()
    serializer_class = AttributeValueSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['attribute', 'is_active']
    search_fields = ['value', 'attribute__name']
    ordering_fields = ['attribute__name', 'display_order', 'value']

class ProductViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing products.
    """
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'brand', 'product_type', 'is_active', 'is_featured']
    search_fields = ['name', 'sku', 'description', 'short_description']
    ordering_fields = ['name', 'price', 'created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProductDetailSerializer
        return ProductSerializer
    
    @action(detail=True, methods=['get'])
    def variants(self, request, pk=None):
        """
        Get all variants for a specific product.
        """
        product = self.get_object()
        variants = ProductVariant.objects.filter(product=product)
        serializer = ProductVariantSerializer(variants, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def images(self, request, pk=None):
        """
        Get all images for a specific product.
        """
        product = self.get_object()
        images = ProductImage.objects.filter(product=product)
        serializer = ProductImageSerializer(images, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """
        Get all reviews for a specific product.
        """
        product = self.get_object()
        reviews = ProductReview.objects.filter(product=product, is_approved=True)
        serializer = ProductReviewSerializer(reviews, many=True)
        return Response(serializer.data)

class ProductVariantViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product variants.
    """
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'is_active']
    search_fields = ['sku', 'name', 'product__name']
    ordering_fields = ['product__name', 'name', 'created_at']
    
    @action(detail=True, methods=['get'])
    def attributes(self, request, pk=None):
        """
        Get all attributes for a specific product variant.
        """
        variant = self.get_object()
        attributes = ProductVariantAttribute.objects.filter(variant=variant)
        serializer = ProductVariantAttributeSerializer(attributes, many=True)
        return Response(serializer.data)

class ProductImageViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product images.
    """
    queryset = ProductImage.objects.all()
    serializer_class = ProductImageSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'variant', 'is_primary']
    search_fields = ['product__name', 'alt_text']
    ordering_fields = ['product__name', 'display_order']

class ProductReviewViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing product reviews.
    """
    queryset = ProductReview.objects.all()
    serializer_class = ProductReviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['product', 'user', 'rating', 'is_approved']
    search_fields = ['product__name', 'title', 'review']
    ordering_fields = ['product__name', 'rating', 'created_at']
