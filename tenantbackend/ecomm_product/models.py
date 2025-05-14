from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator

class Category(models.Model):
    """
    Product category model for organizing products.
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='children')
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Category"
        verbose_name_plural = "Categories"
        ordering = ['name']

class Brand(models.Model):
    """
    Brand model for products.
    """
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    logo = models.ImageField(upload_to='brands/', blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Brand"
        verbose_name_plural = "Brands"
        ordering = ['name']

class Attribute(models.Model):
    """
    Product attribute model (e.g., Color, Size, Material).
    """
    name = models.CharField(max_length=100)
    code = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Attribute"
        verbose_name_plural = "Attributes"
        ordering = ['name']

class AttributeValue(models.Model):
    """
    Values for product attributes (e.g., Red, Blue, Small, Large).
    """
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name='values')
    value = models.CharField(max_length=100)
    code = models.SlugField(max_length=100)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return f"{self.attribute.name}: {self.value}"
    
    class Meta:
        verbose_name = "Attribute Value"
        verbose_name_plural = "Attribute Values"
        ordering = ['attribute__name', 'display_order', 'value']
        unique_together = ('attribute', 'value', 'client_id')

class Product(models.Model):
    """
    Main product model.
    """
    PRODUCT_TYPE_CHOICES = (
        ('simple', 'Simple Product'),
        ('variable', 'Variable Product'),
        ('digital', 'Digital Product'),
        ('service', 'Service'),
    )
    
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    sku = models.CharField(max_length=50, unique=True, help_text="Stock Keeping Unit")
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPE_CHOICES, default='simple')
    description = models.TextField(blank=True, null=True)
    short_description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Inventory
    manage_stock = models.BooleanField(default=True)
    stock_quantity = models.IntegerField(default=0)
    low_stock_threshold = models.IntegerField(default=5)
    is_in_stock = models.BooleanField(default=True)
    
    # Product attributes
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    length = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Flags
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_serialized = models.BooleanField(default=False, help_text="Whether this product is tracked by serial number")
    is_lotted = models.BooleanField(default=False, help_text="Whether this product is tracked by lot/batch")
    
    # SEO
    meta_title = models.CharField(max_length=255, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)
    meta_keywords = models.CharField(max_length=255, blank=True, null=True)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name = "Product"
        verbose_name_plural = "Products"
        ordering = ['name']

class ProductVariant(models.Model):
    """
    Product variant model for variable products (e.g., different sizes, colors).
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    sku = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock_quantity = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return f"{self.product.name} - {self.name or self.sku}"
    
    class Meta:
        verbose_name = "Product Variant"
        verbose_name_plural = "Product Variants"
        ordering = ['product__name', 'name']

class ProductVariantAttribute(models.Model):
    """
    Attributes for product variants.
    """
    variant = models.ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='attributes')
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE)
    value = models.ForeignKey(AttributeValue, on_delete=models.CASCADE)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return f"{self.variant.sku} - {self.attribute.name}: {self.value.value}"
    
    class Meta:
        verbose_name = "Product Variant Attribute"
        verbose_name_plural = "Product Variant Attributes"
        unique_together = ('variant', 'attribute', 'client_id')

class ProductImage(models.Model):
    """
    Product images.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True, related_name='images')
    image = models.ImageField(upload_to='products/')
    alt_text = models.CharField(max_length=255, blank=True, null=True)
    is_primary = models.BooleanField(default=False)
    display_order = models.IntegerField(default=0)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return f"Image for {self.product.name} ({self.id})"
    
    class Meta:
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"
        ordering = ['product__name', 'display_order']

class ProductReview(models.Model):
    """
    Product reviews by customers.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey('ecomm_superadmin.User', on_delete=models.CASCADE, related_name='product_reviews')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    title = models.CharField(max_length=255, blank=True, null=True)
    review = models.TextField()
    is_approved = models.BooleanField(default=False)
    
    # Common fields
    client_id = models.IntegerField(null=True, blank=True, help_text="ID of the client associated with this record")
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when this record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when this record was last updated")
    created_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who created this record")
    updated_by = models.CharField(max_length=255, null=True, blank=True, help_text="User who last updated this record")
    
    def __str__(self):
        return f"Review for {self.product.name} by {self.user.email}"
    
    class Meta:
        verbose_name = "Product Review"
        verbose_name_plural = "Product Reviews"
        ordering = ['-created_at']
