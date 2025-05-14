from django.contrib import admin
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

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'is_active', 'created_at')
    list_filter = ('is_active', 'parent')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('name', 'website', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Attribute)
class AttributeAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'description')
    prepopulated_fields = {'code': ('name',)}
    readonly_fields = ('created_at', 'updated_at')

@admin.register(AttributeValue)
class AttributeValueAdmin(admin.ModelAdmin):
    list_display = ('attribute', 'value', 'code', 'display_order', 'is_active')
    list_filter = ('attribute', 'is_active')
    search_fields = ('value', 'attribute__name')
    prepopulated_fields = {'code': ('value',)}
    readonly_fields = ('created_at', 'updated_at')

class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'category', 'brand', 'price', 'is_active', 'created_at')
    list_filter = ('category', 'brand', 'is_active', 'is_featured', 'product_type')
    search_fields = ('name', 'sku', 'description')
    prepopulated_fields = {'slug': ('name',)}
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ProductVariantInline, ProductImageInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'slug', 'sku', 'product_type', 'description', 'short_description')
        }),
        ('Categorization', {
            'fields': ('category', 'brand')
        }),
        ('Pricing', {
            'fields': ('price', 'sale_price', 'cost_price')
        }),
        ('Inventory', {
            'fields': ('manage_stock', 'stock_quantity', 'low_stock_threshold', 'is_in_stock')
        }),
        ('Dimensions', {
            'fields': ('weight', 'length', 'width', 'height'),
            'classes': ('collapse',)
        }),
        ('Flags', {
            'fields': ('is_active', 'is_featured', 'is_serialized', 'is_lotted')
        }),
        ('SEO', {
            'fields': ('meta_title', 'meta_description', 'meta_keywords'),
            'classes': ('collapse',)
        }),
        ('Audit', {
            'fields': ('created_at', 'updated_at', 'created_by', 'updated_by', 'client_id'),
            'classes': ('collapse',)
        }),
    )

class ProductVariantAttributeInline(admin.TabularInline):
    model = ProductVariantAttribute
    extra = 1

@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('product', 'sku', 'name', 'price', 'stock_quantity', 'is_active')
    list_filter = ('product', 'is_active')
    search_fields = ('sku', 'name', 'product__name')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ProductVariantAttributeInline]

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('product', 'variant', 'alt_text', 'is_primary', 'display_order')
    list_filter = ('product', 'is_primary')
    search_fields = ('product__name', 'alt_text')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'title', 'is_approved', 'created_at')
    list_filter = ('product', 'rating', 'is_approved')
    search_fields = ('product__name', 'title', 'review')
    readonly_fields = ('created_at', 'updated_at')
    actions = ['approve_reviews', 'unapprove_reviews']
    
    def approve_reviews(self, request, queryset):
        queryset.update(is_approved=True)
    approve_reviews.short_description = "Approve selected reviews"
    
    def unapprove_reviews(self, request, queryset):
        queryset.update(is_approved=False)
    unapprove_reviews.short_description = "Unapprove selected reviews"
