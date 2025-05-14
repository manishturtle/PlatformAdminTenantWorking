from django.shortcuts import render
from rest_framework import viewsets, permissions, filters, mixins, status
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework import serializers
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.views import APIView
from django.db import transaction
from django.db.models import F, ExpressionWrapper, fields
from django.utils import timezone
from django.db import connection

from .models import (
    FulfillmentLocation,
    AdjustmentReason,
    Inventory,
    InventoryAdjustment,
    SerializedInventory,
    Lot,
    AdjustmentType
)
from .serializers import (
    FulfillmentLocationSerializer,
    AdjustmentReasonSerializer,
    InventorySerializer,
    InventoryAdjustmentSerializer,
    InventoryAdjustmentCreateSerializer,
    SerializedInventorySerializer,
    LotSerializer,
    LotCreateSerializer,
    InventoryImportSerializer
)
from .filters import InventoryFilter, SerializedInventoryFilter, LotFilter
from rest_framework.parsers import MultiPartParser, FormParser
from .tasks import process_inventory_import
from celery.result import AsyncResult
from rest_framework_csv.renderers import CSVRenderer
from datetime import datetime
from .services import perform_inventory_adjustment, update_serialized_status, reserve_serialized_item, ship_serialized_item, receive_serialized_item, find_available_serial_for_reservation

# Import tenant-specific permissions
from ecomm_tenant.ecomm_tenant_admins.permissions import IsTenantAdmin, IsCurrentTenantAdmin, HasTenantPermission

# Create your views here.

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100

# Base class for tenant-aware viewsets
class TenantAwareViewSet(viewsets.ModelViewSet):
    """
    Base viewset that ensures all operations are tenant-aware.
    This class ensures that data is properly isolated per tenant.
    """
    
    def dispatch(self, request, *args, **kwargs):
        """
        Override dispatch to ensure tables exist before processing any request.
        """
        # Get the model class for this viewset
        model_class = self.get_serializer_class().Meta.model
        
        # If the model inherits from InventoryAwareModel, ensure its table exists
        if hasattr(model_class, 'create_table_if_not_exists'):
            # Log the attempt to create table
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Checking if table exists for model {model_class.__name__}")
            
            # Create the table if it doesn't exist
            table_created = model_class.create_table_if_not_exists()
            logger.info(f"Table creation result for {model_class.__name__}: {table_created}")
        
        # Continue with normal dispatch
        return super().dispatch(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Return queryset for the current tenant.
        The tenant context is set by the TenantRoutingMiddleware.
        """
        # Get the base queryset from the parent class
        queryset = super().get_queryset()
        
        # Log current tenant context for debugging
        if hasattr(self.request, 'tenant_slug'):
            print(f"Fetching data for tenant: {self.request.tenant_slug}")
        
        # No need to do any schema-specific filtering since Django Tenants handles this
        # automatically by setting the connection.schema_name
        return queryset
    
    def perform_create(self, serializer):
        """
        Perform create operation in the context of the current tenant.
        """
        # Check if we have tenant information in the request
        tenant_slug = self.request.tenant_slug if hasattr(self.request, 'tenant_slug') else None
        
        # Log the tenant context for debugging
        print(f"Creating object in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        # Save the object directly to the tenant's schema
        serializer.save()
    
    def perform_update(self, serializer):
        """
        Perform update operation in the context of the current tenant.
        """
        # Check if we have tenant information in the request
        tenant_slug = self.request.tenant_slug if hasattr(self.request, 'tenant_slug') else None
        
        # Log the tenant context for debugging
        print(f"Updating object in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        # Save the object directly to the tenant's schema
        serializer.save()
    
    def perform_destroy(self, instance):
        """
        Perform destroy operation in the context of the current tenant.
        """
        # Check if we have tenant information in the request
        tenant_slug = self.request.tenant_slug if hasattr(self.request, 'tenant_slug') else None
        
        # Log the tenant context for debugging
        print(f"Deleting object in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        # Delete the object directly from the tenant's schema
        instance.delete()

class FulfillmentLocationViewSet(TenantAwareViewSet):
    """
    API endpoint that allows Fulfillment Locations to be viewed or edited.
    
    list:
    Return a paginated list of all fulfillment locations for the current tenant.
    Results can be filtered by location_type, is_active, and country_code.
    
    create:
    Create a new fulfillment location for the current tenant.
    All address fields (except address_line_2) are required if any address field is provided.
    
    retrieve:
    Return the details of a specific fulfillment location.
    
    update:
    Update all fields of a specific fulfillment location.
    
    partial_update:
    Update one or more fields of a specific fulfillment location.
    
    destroy:
    Delete a specific fulfillment location.
    Note: This may be restricted if the location has associated inventory.
    """
    serializer_class = FulfillmentLocationSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter
    ]
    filterset_fields = ['location_type', 'is_active', 'country_code']
    search_fields = ['name', 'city', 'state_province', 'country_code']
    ordering_fields = ['name', 'created_at', 'location_type']
    ordering = ['name']

    def get_queryset(self):
        """
        Return all locations for the current tenant.
        django-tenants handles tenant filtering automatically.
        """
        return FulfillmentLocation.objects.all()

    def perform_destroy(self, instance):
        """
        Override destroy to check if location has associated inventory.
        """
        if instance.inventory_set.exists():
            raise serializers.ValidationError(
                "Cannot delete location with existing inventory. "
                "Please transfer or remove inventory first."
            )
        instance.delete()

class AdjustmentReasonViewSet(TenantAwareViewSet):
    """
    API endpoint for managing Inventory Adjustment Reasons.
    
    list:
    Return a paginated list of all adjustment reasons for the current tenant.
    Results can be filtered by is_active status.
    
    create:
    Create a new adjustment reason for the current tenant.
    Name must be unique and descriptive.
    
    retrieve:
    Return the details of a specific adjustment reason.
    
    update:
    Update all fields of a specific adjustment reason.
    
    partial_update:
    Update one or more fields of a specific adjustment reason.
    
    destroy:
    Delete a specific adjustment reason.
    Note: This may be restricted if the reason has been used in adjustments.
    """
    queryset = AdjustmentReason.objects.all()
    serializer_class = AdjustmentReasonSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination
    filter_backends = [
            DjangoFilterBackend,
            filters.SearchFilter,
            filters.OrderingFilter
        ]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']

    # No need for get_queryset method as TenantViewMixin handles tenant filtering

    def perform_destroy(self, instance):
        """
        Override destroy to check if reason has been used in adjustments.
        """
        # Check if this reason has been used in any adjustments
        if instance.adjustments.exists():
            raise serializers.ValidationError(
                "Cannot delete reason that has been used in adjustments. Consider marking it as inactive instead."
            )
        instance.delete()

class InventoryViewSet(TenantAwareViewSet):
    """
    API endpoint for managing Inventory levels.
    
    list:
    Return a paginated list of all inventory records.
    Results can be filtered by product, location, stock status, etc.
    
    create:
    Create a new inventory record.
    Requires product, location, and stock quantities.
    
    retrieve:
    Return the details of a specific inventory record.
    
    update:
    Update all fields of a specific inventory record.
    
    partial_update:
    Update one or more fields of a specific inventory record.
    
    destroy:
    Delete a specific inventory record.
    
    Filtering Options:
    - Product: SKU, name, active status
    - Location: ID, type
    - Stock Status: In stock, out of stock, low stock
    - Quantities: Min/max stock, has backorders, has reserved
    
    Searching:
    - Product SKU, name
    - Location name
    
    Ordering:
    - Product: SKU, name
    - Location name
    - Stock quantities
    - Last updated
    - Available to promise
    
    Custom Actions:
    - POST /api/v1/inventory/add_inventory/ - Add inventory with adjustment record
    - GET /api/v1/inventory/{id}/lots/ - List all lots for this inventory
    - POST /api/v1/inventory/{id}/add-lot/ - Add quantity to a lot
    - POST /api/v1/inventory/{id}/consume-lot/ - Consume quantity from lots
    - POST /api/v1/inventory/{id}/reserve-lot/ - Reserve quantity from lots
    - POST /api/v1/inventory/{id}/release-lot-reservation/ - Release reserved lot quantity
    """
    serializer_class = InventorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [
            DjangoFilterBackend,
            filters.SearchFilter,
            filters.OrderingFilter
        ]
    filterset_class = InventoryFilter
    search_fields = ['product__sku', 'product__name', 'location__name']
    ordering_fields = [
            'product__sku', 'product__name', 'location__name',
            'stock_quantity', 'reserved_quantity', 'last_updated',
            'available_to_promise'
        ]
    ordering = ['product__name', 'location__name']
    
    def get_queryset(self):
        """
        Return all inventory records for the current tenant.
        django-tenants handles tenant filtering automatically.
        
        Annotate the queryset with calculated fields to avoid property setter errors.
        """
        queryset = Inventory.objects.all()
        
        # Apply select_related for nested serializers
        queryset = queryset.select_related('product', 'location')
        
        return queryset
        
    @action(detail=False, methods=['post'])
    def add_inventory(self, request, tenant_slug=None, **kwargs):
        """
        Add inventory quantity with adjustment record.
        
        Required Fields:
          * product_id: ID of the product
          * location_id: ID of the fulfillment location
          * stock_quantity: Quantity to add
          * adjustment_reason_id: ID of the adjustment reason
        Optional Fields:
          * notes: Additional notes about the inventory addition
        Returns:
          * Updated inventory record
          * Inventory adjustment record
        """
        # Extract and validate required fields
        product_id = request.data.get('product_id')
        location_id = request.data.get('location_id')
        stock_quantity = request.data.get('stock_quantity')
        adjustment_reason_id = request.data.get('adjustment_reason_id')
        notes = request.data.get('notes', '')
        serial_number = request.data.get('serial_number')  # Extract serial_number if provided
        
        # Validate required fields
        if not all([product_id, location_id, stock_quantity, adjustment_reason_id]):
            return Response(
                {"detail": "Missing required fields: product_id, location_id, stock_quantity, adjustment_reason_id"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Convert stock_quantity to integer
            stock_quantity = int(stock_quantity)
            
            # Check if the product exists
            from ecomm_product.models import Product
            try:
                product = Product.objects.get(id=product_id)
            except Product.DoesNotExist:
                return Response({"detail": f"Product with ID {product_id} not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if the location exists
            try:
                location = FulfillmentLocation.objects.get(id=location_id)
            except FulfillmentLocation.DoesNotExist:
                return Response({"detail": f"Location with ID {location_id} not found"}, status=status.HTTP_404_NOT_FOUND)
            
            # Check if the adjustment reason exists or create it
            try:
                reason = AdjustmentReason.objects.get(id=adjustment_reason_id)
            except AdjustmentReason.DoesNotExist:
                reason = AdjustmentReason.objects.create(
                    id=adjustment_reason_id,
                    name="Initial Stock",
                    description="Initial inventory receipt",
                    is_active=True,
                    client_id=1,
                    company_id=1
                )
            
            # Check if the product is serialized and requires a serial number
            if product.is_serialized and not serial_number:
                return Response({"detail": ["Serial number is required for ADD adjustment on serialized products"]}, 
                               status=status.HTTP_400_BAD_REQUEST)
            
            # Use direct SQL to update or create inventory record
            from django.db import connection
            with connection.cursor() as cursor:
                # Check if inventory record exists
                cursor.execute(
                    "SELECT id, stock_quantity FROM ecomm_inventory_inventory WHERE product_id = %s AND location_id = %s",
                    [product_id, location_id]
                )
                inventory_record = cursor.fetchone()
                
                if inventory_record:
                    # Update existing inventory record
                    inventory_id = inventory_record[0]
                    current_stock = inventory_record[1] or 0
                    new_stock = current_stock + stock_quantity
                    
                    cursor.execute(
                        "UPDATE ecomm_inventory_inventory SET stock_quantity = %s, updated_at = NOW() WHERE id = %s",
                        [new_stock, inventory_id]
                    )
                else:
                    # First, get the next ID from the sequence
                    cursor.execute("SELECT nextval('ecomm_inventory_inventory_id_seq')")
                    next_id = cursor.fetchone()[0]
                    
                    # Create new inventory record with the next ID from sequence
                    cursor.execute(
                        """
                        INSERT INTO ecomm_inventory_inventory 
                        (id, product_id, location_id, stock_quantity, reserved_quantity, non_saleable_quantity, 
                        on_order_quantity, in_transit_quantity, returned_quantity, hold_quantity, 
                        backorder_quantity, low_stock_threshold, client_id, company_id, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, 0, 0, 0, 0, 0, 0, 0, 5, 1, 1, NOW(), NOW())
                        RETURNING id
                        """,
                        [next_id, product_id, location_id, stock_quantity]
                    )
                    inventory_id = cursor.fetchone()[0]
                    new_stock = stock_quantity
                
                # Create adjustment record
                cursor.execute(
                    """
                    INSERT INTO ecomm_inventory_inventoryadjustment
                    (inventory_id, adjustment_type, quantity_change, reason_id, notes, 
                    new_stock_quantity, timestamp, client_id, company_id, created_at, updated_at, created_by_id)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW(), 1, 1, NOW(), NOW(), %s)
                    RETURNING id
                    """,
                    [inventory_id, 'ADD', stock_quantity, reason.id, notes, new_stock, request.user.id if hasattr(request, 'user') else None]
                )
                adjustment_id = cursor.fetchone()[0]
            
            # Get the updated inventory record
            inventory = Inventory.objects.get(id=inventory_id)
            adjustment = InventoryAdjustment.objects.get(id=adjustment_id)
            
            # Return the updated inventory and adjustment record
            return Response({
                'inventory': InventorySerializer(inventory).data,
                'adjustment': InventoryAdjustmentSerializer(adjustment).data
            }, status=status.HTTP_200_OK)
            
        except Product.DoesNotExist:
            return Response({"detail": f"Product with ID {product_id} not found"}, status=status.HTTP_404_NOT_FOUND)
        except FulfillmentLocation.DoesNotExist:
            return Response({"detail": f"Location with ID {location_id} not found"}, status=status.HTTP_404_NOT_FOUND)
        except AdjustmentReason.DoesNotExist:
            return Response({"detail": f"Adjustment reason with ID {adjustment_reason_id} not found"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def lots(self, request, pk=None):
        """
        List all lots for a specific inventory record.
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        lots = Lot.objects.filter(inventory_record=inventory)
        
        # Apply filters if provided
        lot_filter = LotFilter(request.GET, queryset=lots)
        lots = lot_filter.qs
        
        # Apply pagination
        page = self.paginate_queryset(lots)
        if page is not None:
            serializer = LotSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = LotSerializer(lots, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_lot(self, request, pk=None):
        """
        Add quantity to a lot for this inventory.
        
        Required fields:
        - lot_number: The lot number to add to
        - quantity: The quantity to add
        - expiry_date: The expiry date for the lot (if new)
        - cost_price_per_unit: Optional cost price per unit
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        serializer = LotCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract data
        lot_number = serializer.validated_data.get('lot_number')
        quantity = serializer.validated_data.get('quantity')
        expiry_date = serializer.validated_data.get('expiry_date')
        cost_price_per_unit = serializer.validated_data.get('cost_price_per_unit')
        
        try:
            # Import here to avoid circular imports
            from .services import add_quantity_to_lot
            
            # Add quantity to lot
            lot = add_quantity_to_lot(
                inventory=inventory,
                lot_number=lot_number,
                quantity=quantity,
                expiry_date=expiry_date,
                cost_price_per_unit=cost_price_per_unit,
                user=request.user
            )
            
            return Response(
                LotSerializer(lot).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def consume_lot(self, request, pk=None):
        """
        Consume quantity from lots for this inventory.
        
        Required fields:
        - quantity: The total quantity to consume
        - strategy: The lot selection strategy ('FEFO' or 'FIFO')
        - lot_number: Optional specific lot number to consume from
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        quantity = request.data.get('quantity')
        strategy = request.data.get('strategy', 'FEFO')  # Default to FEFO
        lot_number = request.data.get('lot_number')
        
        if not quantity or not isinstance(quantity, (int, float)) or quantity <= 0:
            return Response(
                {"detail": "A positive quantity is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Import here to avoid circular imports
            from .services import consume_quantity_from_lot
            
            # Consume quantity from lots
            consumed_lots = consume_quantity_from_lot(
                inventory=inventory,
                quantity=quantity,
                strategy=strategy,
                specific_lot_number=lot_number,
                user=request.user
            )
            
            return Response(
                LotSerializer(consumed_lots, many=True).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def reserve_lot(self, request, pk=None):
        """
        Reserve quantity from lots for this inventory.
        
        Required fields:
        - quantity: The total quantity to reserve
        - strategy: The lot selection strategy ('FEFO' or 'FIFO')
        - lot_number: Optional specific lot number to reserve from
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        quantity = request.data.get('quantity')
        strategy = request.data.get('strategy', 'FEFO')  # Default to FEFO
        lot_number = request.data.get('lot_number')
        
        if not quantity or not isinstance(quantity, (int, float)) or quantity <= 0:
            return Response(
                {"detail": "A positive quantity is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Import here to avoid circular imports
            from .services import reserve_lot_quantity
            
            # Reserve quantity from lots
            reserved_lots = reserve_lot_quantity(
                inventory=inventory,
                quantity=quantity,
                strategy=strategy,
                specific_lot_number=lot_number,
                user=request.user
            )
            
            return Response(
                LotSerializer(reserved_lots, many=True).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def release_lot_reservation(self, request, pk=None):
        """
        Release reserved quantity from lots for this inventory.
        
        Required fields:
        - quantity: The total quantity to release
        - lot_number: Optional specific lot number to release from
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        inventory = self.get_object()
        
        # Validate input
        quantity = request.data.get('quantity')
        lot_number = request.data.get('lot_number')
        
        if not quantity or not isinstance(quantity, (int, float)) or quantity <= 0:
            return Response(
                {"detail": "A positive quantity is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Import here to avoid circular imports
            from .services import release_lot_reservation
            
            # Release reserved quantity
            released_lots = release_lot_reservation(
                inventory=inventory,
                quantity=quantity,
                specific_lot_number=lot_number,
                user=request.user
            )
            
            return Response(
                LotSerializer(released_lots, many=True).data,
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class InventoryAdjustmentViewSet(TenantAwareViewSet):
    """
    API endpoint for creating manual Inventory Adjustments
    and listing adjustment history for a specific inventory item.
    
    POST /api/v1/inventory-adjustments/ - Create a new adjustment.
    GET /api/v1/inventory/{inventory_pk}/adjustments/ - List history for an inventory item.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return InventoryAdjustmentCreateSerializer
        return InventoryAdjustmentSerializer

    # No need for get_queryset method as TenantViewMixin handles tenant filtering

    def perform_create(self, serializer):
        with transaction.atomic():
            # Get the validated data
            inventory = serializer.validated_data['inventory']
            adjustment_type = serializer.validated_data['adjustment_type']
            quantity = serializer.validated_data['quantity']
            reason = serializer.validated_data['reason']
            notes = serializer.validated_data.get('notes', None)
            serial_number = serializer.validated_data.get('serial_number', None)
            lot_number = serializer.validated_data.get('lot_number', None)
            expiry_date = serializer.validated_data.get('expiry_date', None)
            
            # Use the service function to perform the adjustment
            perform_inventory_adjustment(
                user=self.request.user,
                inventory=inventory,
                adjustment_type=adjustment_type,
                quantity_change=quantity,
                reason=reason,
                notes=notes,
                serial_number=serial_number,
                lot_number=lot_number,
                expiry_date=expiry_date
            )

class SerializedInventoryViewSet(TenantAwareViewSet):
    """
    API endpoint for viewing and updating the status of Serialized Inventory items.
    Creation/Deletion might be handled by other processes (e.g., receiving, shipping).
    """
    serializer_class = SerializedInventorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SerializedInventoryFilter
    search_fields = ['serial_number', 'product__sku', 'product__name', 'location__name']
    ordering_fields = ['serial_number', 'product__name', 'location__name', 'status', 'created_at', 'updated_at']
    ordering = ['product__name', 'serial_number']

    # No need for get_queryset method as TenantViewMixin handles tenant filtering

    def perform_update(self, serializer):
        """
        Override perform_update to use the update_serialized_status service function
        for proper status transition validation and side effects.
        """
        instance = serializer.instance
        new_status = serializer.validated_data.get('status')
        
        if new_status and new_status != instance.status:
            # Use the service function to handle status transitions
            update_serialized_status(
                serialized_item=instance,
                new_status=new_status,
                user=self.request.user,
                notes=serializer.validated_data.get('notes')
            )
            # Skip the default save since the service function handles it
            return
            
        # For other field updates, use the default behavior
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['post'])
    def reserve(self, request, pk=None):
        """
        Reserve a specific serialized inventory item.
        """
        serialized_item = self.get_object()
        
        try:
            reserve_serialized_item(
                serialized_item=serialized_item,
                user=request.user,
                notes=request.data.get('notes')
            )
            return Response(
                {"message": f"Serial number {serialized_item.serial_number} has been reserved."},
                status=status.HTTP_200_OK
            )
        except DjangoValidationError as e:
            raise DRFValidationError(detail=str(e))

    @action(detail=True, methods=['post'])
    def ship(self, request, pk=None):
        """
        Mark a serialized inventory item as shipped/sold.
        """
        serialized_item = self.get_object()
        
        try:
            ship_serialized_item(
                serialized_item=serialized_item,
                user=request.user,
                notes=request.data.get('notes')
            )
            return Response(
                {"message": f"Serial number {serialized_item.serial_number} has been marked as shipped."},
                status=status.HTTP_200_OK
            )
        except DjangoValidationError as e:
            raise DRFValidationError(detail=str(e))

class LotViewSet(TenantAwareViewSet):
    """
    API endpoint for managing Inventory Lots.
    
    list:
        Get a list of all lots with filtering options
    
    create:
        Create a new lot with initial quantity
        
    retrieve:
        Get details of a specific lot
        
    update:
        Update quantity or expiry date of a lot
        WARNING: Direct quantity updates bypass the adjustment audit trail
    """
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = LotFilter
    search_fields = ['lot_number', 'product__sku', 'product__name', 'location__name']
    ordering_fields = [
        'lot_number', 'product__name', 'location__name',
        'quantity', 'expiry_date', 'created_at', 'updated_at'
    ]
    ordering = ['product__name', 'expiry_date', 'lot_number']  # Default order for FEFO

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return LotCreateSerializer
        return LotSerializer

    def get_queryset(self):
        """
        Override get_queryset to ensure we're using the inventory schema
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        # Get the queryset with tenant filtering from TenantViewMixin
        return super().get_queryset()

    def perform_create(self, serializer):
        """
        Override perform_create to ensure we're using the inventory schema
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        # Save the instance
        serializer.save()

    def perform_update(self, serializer):
        """
        Override perform_update to add logging for quantity changes and ensure
        we're using the inventory schema
        """
        from django.db import connection
        
        # Ensure we're using the inventory schema in the search path
        if hasattr(connection, 'inventory_schema') and hasattr(connection, 'schema_name'):
            with connection.cursor() as cur:
                cur.execute(f'SET search_path TO "{connection.inventory_schema}", "{connection.schema_name}", public')
        
        old_instance = self.get_object()
        old_quantity = old_instance.quantity
        instance = serializer.save()
        
        # Log quantity changes
        if instance.quantity != old_quantity:
            # In a real app, you might want to create an audit log entry here
            print(f"Lot {instance.lot_number} quantity changed from {old_quantity} to {instance.quantity}")

class AdjustmentTypeView(APIView):
    """
    API endpoint that returns all available adjustment types.
    This is a simple endpoint that returns the choices defined in the AdjustmentType model.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        """
        Return a list of all adjustment types.
        Each type includes a code and display name.
        """
        # Log the tenant context for debugging
        tenant_slug = request.tenant_slug if hasattr(request, 'tenant_slug') else None
        print(f"Getting adjustment types in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        adjustment_types = [
            {'code': code, 'name': name}
            for code, name in AdjustmentType.choices
        ]
        return Response(adjustment_types)

class InventoryImportView(APIView):
    """
    Upload a CSV file to asynchronously import inventory data.
    Expects 'file' field in multipart/form-data.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]
    
    def post(self, request, format=None):
        # Log the tenant context for debugging
        tenant_slug = request.tenant_slug if hasattr(request, 'tenant_slug') else None
        print(f"Importing inventory in tenant: {tenant_slug}, schema: {connection.schema_name}")
        
        serializer = InventoryImportSerializer(data=request.data)
        if serializer.is_valid():
            csv_file = serializer.validated_data['file']
            
            # Start async task
            task = process_inventory_import.delay(
                file_content_str=csv_file.read().decode('utf-8'),
                tenant_id=1,  # Default tenant ID, adjust as needed
                user_id=request.user.id
            )
            
            return Response({
                'task_id': task.id,
                'status': 'PENDING',
                'message': 'Inventory import started. Check task status for updates.'
            }, status=status.HTTP_202_ACCEPTED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, format=None):
        """
        Check status of an inventory import task.
        Requires task_id parameter.
        """
        task_id = request.query_params.get('task_id')
        if not task_id:
            return Response(
                {"error": "task_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        result = AsyncResult(task_id)
        response_data = {
            "task_id": task_id,
            "status": result.status,
        }
        
        if result.successful():
            response_data["result"] = result.get()
        elif result.failed():
            response_data["error"] = str(result.result)
            
        return Response(response_data)
