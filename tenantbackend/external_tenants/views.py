import logging
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import logging
import uuid
from datetime import timedelta
from django.utils import timezone
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)



class OrderProcessedView(APIView):
    """API endpoint for processing completed ecommerce orders."""
    
    permission_classes = [AllowAny]
    
    def create_tenant_subscription(self, tenant, subscription_plan, client_id, company_id, created_by):
        """
        Create a subscription for the tenant.
        """
        from ecomm_superadmin.models import TenantSubscriptionLicenses
        
        # Create the subscription
        subscription = TenantSubscriptionLicenses.objects.create(
            tenant=tenant,
            subscription_plan=subscription_plan,
            license_key=str(uuid.uuid4()),
            license_status='active',
            valid_from=timezone.now(),
            client_id=client_id,
            company_id=company_id,
            created_by=created_by
        )
        
        return subscription

    def post(self, request, format=None):
        """Process a completed order and create tenant if needed."""
        try:
            # Validate request data
            required_fields = {'order_id', 'client_id', 'product_ids'}
            if not all(field in request.data for field in required_fields):
                return JsonResponse(
                    {
                        'error': 'Missing required fields',
                        'required_fields': list(required_fields)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            order_id = request.data['order_id']
            client_id = request.data['client_id']
            product_ids = request.data['product_ids']
            
            if not isinstance(product_ids, list):
                return JsonResponse(
                    {'error': 'product_ids must be a list'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"Processing order {order_id} for client {client_id}")
            
            # Get client data
            try:
                from ecomm_superadmin.models import CrmClient
                client = CrmClient.objects.get(id=client_id)
            except CrmClient.DoesNotExist:
                return JsonResponse(
                    {'error': f'Client with id {client_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Get the default active subscription plan
            try:
                from ecomm_superadmin.models import SubscriptionPlan
                subscription_plan = SubscriptionPlan.objects.filter(status='active').first()
                if not subscription_plan:
                    return JsonResponse(
                        {'error': 'No active subscription plans available'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as e:
                return JsonResponse(
                    {'error': f'Error getting subscription plan: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Generate tenant name and schema name from client name
            import re
            from django.utils.text import slugify
            
            # Create slugs from client name for schema and URL
            # Schema name can use underscores, URL suffix must use hyphens
            base_slug = slugify(client.client_name)
            schema_base = base_slug.replace('-', '_')
            url_base = base_slug
            
            schema_name = schema_base
            url_suffix = url_base
            
            # Make sure both schema_name and url_suffix are unique
            from ecomm_superadmin.models import Tenant
            counter = 1
            while (Tenant.objects.filter(schema_name=schema_name).exists() or 
                   Tenant.objects.filter(url_suffix=url_suffix).exists()):
                schema_name = f"{schema_base}_{counter}"
                url_suffix = f"{url_base}-{counter}"  # Use hyphen for URL suffix
                counter += 1
                
            logger.info(f"Generated tenant details - Schema: {schema_name}, URL Suffix: {url_suffix}")
            
            # Prepare tenant data with default values
            tenant_data = {
                'name': f"{client.client_name} Tenant",
                'schema_name': schema_name,
                'url_suffix': url_suffix,  # Use the properly formatted URL suffix
                'environment': 'production',
                'status': 'active',
                'default_url': f"https://{url_suffix}.turtlesoftware.co",
                'subscription_plan': product_ids,
                'client_id': client_id,
                'admin_email':client.contact_person_email,  # You might want to get this from the client
                'admin_first_name': client.client_name, 
                'admin_last_name': "User",
                'admin_password': "India@123",  # Generate a random password
                'contact_email': client.contact_person_email or f"contact@{url_suffix}.turtlesoftware.co"
            }
            
            print("tenant_data:", tenant_data)
            # Create tenant using TenantSerializer
            from ecomm_superadmin.serializers import TenantSerializer
            from django.db import transaction
            from django.db.models.signals import post_save
            from ecomm_superadmin.models import Tenant
            
            serializer = TenantSerializer(data=tenant_data)
            if not serializer.is_valid():
                return JsonResponse(
                    {'error': 'Invalid tenant data', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                # with transaction.atomic():
                    # Create tenant
                tenant = serializer.save()
                
                # Trigger post-save signal for tenant creation
                post_save.send(
                    sender=Tenant,
                    instance=tenant,
                    created=True,
                    raw=False,
                    using='default',
                    update_fields=None
                )
                
                # Create subscription
                subscription = self.create_tenant_subscription(
                    tenant=tenant,
                    subscription_plan=subscription_plan,
                    client_id=client_id,
                    company_id=1,
                    created_by='system:order_processor'
                )
                
                # Prepare success response
                result = {
                    'status': 'success',
                    'message': 'Tenant and subscription created successfully',
                    'tenant': {
                        'id': tenant.id,
                        'name': tenant.name,
                        'schema_name': schema_name,
                        'url_suffix': url_suffix
                    },
                    'subscription': {
                        'id': subscription.id,
                        'license_key': subscription.license_key,
                        'status': subscription.license_status,
                        'valid_from': subscription.valid_from,
                        'valid_until': getattr(subscription, 'valid_until', None)
                    }
                }
                
            except Exception as e:
                # Log the error for debugging
                logger.error(f"Error creating tenant and subscription: {str(e)}", exc_info=True)
                return JsonResponse(
                    {'error': 'Failed to create tenant and subscription', 'details': str(e)},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
            return JsonResponse(
                result,
                status=status.HTTP_201_CREATED
            )
        
        except Exception as e:
            logger.error(f"Error processing order: {str(e)}", exc_info=True)
            return JsonResponse(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
