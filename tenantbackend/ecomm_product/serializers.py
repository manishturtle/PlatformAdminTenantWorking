from rest_framework import serializers
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

class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for the Category model.
    """
    class Meta:
        model = Category
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class BrandSerializer(serializers.ModelSerializer):
    """
    Serializer for the Brand model.
    """
    class Meta:
        model = Brand
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class AttributeSerializer(serializers.ModelSerializer):
    """
    Serializer for the Attribute model.
    """
    class Meta:
        model = Attribute
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class AttributeValueSerializer(serializers.ModelSerializer):
    """
    Serializer for the AttributeValue model.
    """
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    
    class Meta:
        model = AttributeValue
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class ProductVariantAttributeSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductVariantAttribute model.
    """
    attribute_name = serializers.CharField(source='attribute.name', read_only=True)
    value_name = serializers.CharField(source='value.value', read_only=True)
    
    class Meta:
        model = ProductVariantAttribute
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class ProductImageSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductImage model.
    """
    class Meta:
        model = ProductImage
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class ProductVariantSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductVariant model.
    """
    attributes = ProductVariantAttributeSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    
    class Meta:
        model = ProductVariant
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class ProductReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for the ProductReview model.
    """
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = ProductReview
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class ProductSerializer(serializers.ModelSerializer):
    """
    Serializer for the Product model.
    """
    category_name = serializers.CharField(source='category.name', read_only=True)
    brand_name = serializers.CharField(source='brand.name', read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    reviews = ProductReviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class ProductDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for the Product model with all related data.
    """
    category = CategorySerializer(read_only=True)
    brand = BrandSerializer(read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    reviews = ProductReviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
