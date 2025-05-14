from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Feature, FeatureGroup, SubscriptionPlan, PlanFeatureEntitlement
from .serializers import (
    FeatureSerializer, FeatureGroupSerializer, 
    ApplicationFeaturesSerializer, YAMLFeatureSerializer,
    SubscriptionPlanSerializer, PlanFeatureEntitlementSerializer
)
import yaml
from django.db import transaction
from ecomm_superadmin.models import Application, Tenant
from django.db import connection
from rest_framework.decorators import api_view
from rest_framework import status
from urllib.parse import urlparse
from django.views.decorators.csrf import csrf_exempt

from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes

# Create your views here.

class FeatureGroupViewSet(viewsets.ModelViewSet):
    queryset = FeatureGroup.objects.all()
    serializer_class = FeatureGroupSerializer

    def get_queryset(self):
        """Filter feature groups by application if app_id is provided"""
        queryset = super().get_queryset()
        app_id = self.request.query_params.get('app_id')
        if app_id:
            queryset = queryset.filter(app_id=app_id)
        return queryset


class FeatureViewSet(viewsets.ModelViewSet):
    queryset = Feature.objects.all()
    serializer_class = FeatureSerializer

    def get_queryset(self):
        """Filter features by group if group_id is provided"""
        queryset = super().get_queryset()
        group_id = self.request.query_params.get('group_id')
        app_id = self.request.query_params.get('app_id')
        
        if group_id:
            queryset = queryset.filter(group_id=group_id)
        if app_id:
            queryset = queryset.filter(app_id=app_id)
        return queryset

    @action(detail=False, methods=['get'])
    def get_features(self, request):
        """Get all features grouped by application"""
        features = Feature.objects.all()
        grouped_features = {}

        for feature in features:
            try:
                app = Application.objects.get(app_id=feature.app_id)
                app_id = str(app.app_id)
                if app_id not in grouped_features:
                    grouped_features[app_id] = {
                        'application': app.app_id,
                        'application_name': app.application_name,
                        'features': []
                    }

                feature_data = {
                    'id': feature.id,
                    'name': feature.name,
                    'key': feature.key,
                    'description': feature.description,
                    'granual_settings': feature.granual_settings,
                    'is_active': feature.is_active,
                    'created_at': feature.created_at,
                    'updated_at': feature.updated_at
                }
                grouped_features[app_id]['features'].append(feature_data)
            except Application.DoesNotExist:
                continue

        return Response(list(grouped_features.values()))

    @action(detail=True, methods=['patch'])
    def update_feature(self, request, pk=None):
        """Update a feature"""
        feature = self.get_object()
        serializer = FeatureSerializer(feature, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            try:
                app = Application.objects.get(app_id=feature.app_id)
                response_data = {
                    'id': feature.id,
                    'name': feature.name,
                    'key': feature.key,
                    'description': feature.description,
                    'granual_settings': feature.granual_settings,
                    'is_active': feature.is_active,
                    'application': app.app_id,
                    'application_name': app.application_name,
                    'created_at': feature.created_at,
                    'updated_at': feature.updated_at
                }
                return Response(response_data)
            except Application.DoesNotExist:
                return Response(
                    {'error': 'Application not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def update_subfeatures(self, request, pk=None):
        """Update subfeatures for a feature"""
        feature = self.get_object()
        subfeatures = request.data.get('subfeatures', [])

        # Update granual_settings with new subfeatures
        granual_settings = feature.granual_settings or {}
        granual_settings['subfeatures'] = subfeatures
        feature.granual_settings = granual_settings
        feature.save()

        try:
            app = Application.objects.get(app_id=feature.app_id)
            response_data = {
                'id': feature.id,
                'name': feature.name,
                'key': feature.key,
                'description': feature.description,
                'granual_settings': feature.granual_settings,
                'is_active': feature.is_active,
                'application': app.app_id,
                'application_name': app.application_name,
                'created_at': feature.created_at,
                'updated_at': feature.updated_at
            }
            return Response(response_data)
        except Application.DoesNotExist:
            return Response(
                {'error': 'Application not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['delete'])
    def remove_subfeature(self, request, pk=None):
        """Remove a subfeature from a feature"""
        feature = self.get_object()
        subfeature_id = request.data.get('subfeature_id')
        
        if not subfeature_id:
            return Response(
                {"error": "subfeature_id is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        granual_settings = feature.granual_settings
        subfeatures = granual_settings.get('subfeatures', [])
        
        # Remove subfeature
        granual_settings['subfeatures'] = [
            sf for sf in subfeatures 
            if str(sf.get('id')) != str(subfeature_id)
        ]
        
        feature.granual_settings = granual_settings
        feature.save()
        
        try:
            app = Application.objects.get(app_id=feature.app_id)
            response_data = {
                'id': feature.id,
                'name': feature.name,
                'key': feature.key,
                'description': feature.description,
                'granual_settings': feature.granual_settings,
                'is_active': feature.is_active,
                'application': app.app_id,
                'application_name': app.application_name,
                'created_at': feature.created_at,
                'updated_at': feature.updated_at
            }
            return Response(response_data)
        except Application.DoesNotExist:
            return Response(
                {'error': 'Application not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def upload_yaml(self, request):
        """Upload features from YAML file"""
        serializer = YAMLFeatureSerializer(data=request.data)
        if serializer.is_valid():
            result = serializer.save()
            return Response({
                'message': 'Features uploaded successfully',
                'created_features': result['created_features'],
                'updated_features': result['updated_features'],
                'errors': result['errors'],
                'application': {
                    'id': result['application'].app_id,
                    'name': result['application'].application_name
                }
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer

    def get_queryset(self):
        """Filter plans by status if provided"""
        queryset = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset

    @action(detail=False, methods=['get'])
    def available_features(self, request):
        """Get list of all available features that can be added to plans"""
        features = Feature.objects.filter(is_active=True).values('id', 'name', 'key', 'description', 'app_id')
        return Response(list(features))

    def perform_create(self, serializer):
        """Create a new subscription plan and its feature entitlements"""
        with transaction.atomic():
            # Get granular settings from request data
            granular_settings = self.request.data.get('detailed_entitlements', {})
            
            # Update the serializer data with granular_settings
            serializer.validated_data['granular_settings'] = granular_settings
            
            # Save the subscription plan
            plan = serializer.save()
            
            # Create or update feature entitlements for each feature in granular settings
            for feature_id, settings in granular_settings.items():
                try:
                    feature = Feature.objects.get(id=feature_id)
                    
                    # First try to get existing entitlement
                    entitlement = PlanFeatureEntitlement.objects.filter(
                        plan=plan,
                        feature=feature
                    ).first()
                    
                    if entitlement:
                        # Update existing entitlement
                        entitlement.granual_settings = settings
                        entitlement.save()
                    else:
                        # Create new entitlement with auto-generated ID
                        PlanFeatureEntitlement.objects.create(
                            plan=plan,
                            feature=feature,
                            granual_settings=settings
                        )
                        
                except Feature.DoesNotExist:
                    continue

    def perform_update(self, serializer):
        """Update an existing subscription plan"""
        serializer.save()

    @action(detail=True, methods=['post'])
    def add_feature(self, request, pk=None):
        """Add a feature to the plan"""
        plan = self.get_object()
        serializer = PlanFeatureEntitlementSerializer(data=request.data)
        
        if serializer.is_valid():
            feature_id = serializer.validated_data['feature_id']
            feature = Feature.objects.get(id=feature_id)
            
            # Check if feature is already in plan
            if PlanFeatureEntitlement.objects.filter(plan=plan, feature=feature).exists():
                return Response(
                    {"error": "Feature already exists in plan"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            entitlement = PlanFeatureEntitlement.objects.create(
                plan=plan,
                feature=feature,
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=True, methods=['delete'])
    def remove_feature(self, request, pk=None):
        """Remove a feature from the plan"""
        plan = self.get_object()
        feature_id = request.data.get('feature_id')
        
        if not feature_id:
            return Response(
                {"error": "feature_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            entitlement = PlanFeatureEntitlement.objects.get(
                plan=plan,
                feature_id=feature_id
            )
            entitlement.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except PlanFeatureEntitlement.DoesNotExist:
            return Response(
                {"error": "Feature not found in plan"},
                status=status.HTTP_404_NOT_FOUND
            )


# @api_view(['POST'])
# @csrf_exempt
# def check_tenant_exist(request):
#     """
#     Check if a tenant exists based on the schema_name.
#     Returns tenant details if found, otherwise appropriate error messages.
#     """
#     if request.method != 'POST':
#         return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
#     try:
#         # Get the data from request
#         data = request.data
#         application_url = data.get('application_url')

#         if not application_url:
#             return Response({'error': 'application_url is required'}, status=status.HTTP_400_BAD_REQUEST)

#         # Parse URL to get schema_name
#         url_obj = urlparse(application_url)
#         schema_name = url_obj.path.split('/')[1].lower()
#         default_url = f"{url_obj.scheme}://{url_obj.netloc}/"
#         # Query the tenants table
#         with connection.cursor() as cursor:
#             cursor.execute("""
#                 SELECT id, name, schema_name, status, 
#                        subscription_plan_id
#                 FROM ecomm_superadmin_tenants
#                 WHERE schema_name = %s
#             """, [schema_name])
            
#             tenant = cursor.fetchone()
#         if not tenant:
#             return Response({'message': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

#         # Get subscription plan details if exists 5 is not hardcoded its column index
#         subscription_plan = None
#         if tenant[5]:  # subscription_plan_id
#             cursor.execute("""
#                 SELECT id, name, price, 
#                 FROM subscription_plans
#                 WHERE id = %s
#             """, [tenant[3]])
#             subscription_plan = cursor.fetchone()

#         print("subscription_plan:", subscription_plan)
#         # Prepare response
#         response_data = {
#             'message': f"Tenant with schema_name '{schema_name}' exists",
#             'tenant_id': tenant[0],
#             'tenant_name': tenant[1],
#             'schema_name': tenant[2],
#             'status': tenant[3],
#             'environment': tenant[4],
#             'default_url': default_url,
#             'redirect_to_iam': f"https://portal.turtleit.in/?currentUrl={application_url}"
#         }

#         if subscription_plan:
#             response_data['subscription_plan'] = {
#                 'id': subscription_plan[0],
#                 'name': subscription_plan[1],
#                 'price': subscription_plan[2],
#                 'max_users': subscription_plan[3],
#                 'max_storage': subscription_plan[4]
#             }

#         return Response(response_data, status=status.HTTP_200_OK)

#     except Exception as e:
#         print("Error:", e)
#         return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# @csrf_exempt
# @api_view(['POST'])
# @permission_classes([AllowAny])
# def check_tenant_exist(request):
#     if request.method != 'POST':
#         return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

#     try:
#         data = request.data
#         application_url = data.get('application_url')

#         if not application_url:
#             return Response({'error': 'application_url is required'}, status=status.HTTP_400_BAD_REQUEST)

#         url_obj = urlparse(application_url)
#         schema_name = url_obj.path.split('/')[1].lower()
#         default_url = f"{url_obj.scheme}://{url_obj.netloc}/"

#         with connection.cursor() as cursor:
#             cursor.execute("""
#                 SELECT id, name, schema_name, status, subscription_plan_id
#                 FROM ecomm_superadmin_tenants
#                 WHERE schema_name = %s
#             """, [schema_name])
#             tenant = cursor.fetchone()

#             if not tenant:
#                 return Response({'message': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

#             subscription_plan = None
#             subscription_plan_id = tenant[4]

#             if subscription_plan_id:
#                 cursor.execute("""
#                     SELECT id, name, price, max_users, storage_limit
#                     FROM subscription_plans
#                     WHERE id = %s
#                 """, [subscription_plan_id])
#                 subscription_plan = cursor.fetchone()

      

#         response_data = {
#             'message': f"Tenant with schema_name '{schema_name}' exists",
#             'tenant_id': tenant[0],
#             'tenant_name': tenant[1],
#             'schema_name': tenant[2],
#             'status': tenant[3],
#             'default_url': default_url,
#             'redirect_to_iam': f"http://localhost:3000/?currentUrl={application_url}"
#         }

#         if subscription_plan:
#             response_data['subscription_plan'] = {
#                 'id': subscription_plan[0],
#                 'name': subscription_plan[1],
#                 'price': subscription_plan[2],
#                 'max_users': subscription_plan[3],
#                 'max_storage': subscription_plan[4]
#             }

#         return Response(response_data, status=status.HTTP_200_OK)

#     except Exception as e:
#         print("Error:", e)
#         return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from urllib.parse import urlparse

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def get_subscription_plan_by_tenant(request):
    """
    API endpoint to get subscription plan data based on tenant_id.
    
    This endpoint retrieves subscription plan information for a specific tenant.
    
    Request body:
    - tenant_id: integer (required)
    
    Returns:
    - 200 OK: Subscription plan details if found
    - 400 Bad Request: If tenant_id is not provided
    - 404 Not Found: If tenant or subscription plan not found
    """
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    try:
        data = request.data
        tenant_id = data.get('tenant_id')
        
        if not tenant_id:
            return Response({'error': 'tenant_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to get the tenant by ID
        try:
            tenant = Tenant.objects.get(id=tenant_id)
        except Tenant.DoesNotExist:
            return Response({'error': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Get subscription plan if it exists
        subscription_plan_id = tenant.subscription_plan_id
        if not subscription_plan_id:
            return Response({'error': 'No subscription plan associated with this tenant'}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            subscription_plan = SubscriptionPlan.objects.get(id=subscription_plan_id)
            
            # Serialize the subscription plan
            plan_data = {
                "id": subscription_plan.id,
                "name": subscription_plan.name,
                "description": subscription_plan.description,
                "price": str(subscription_plan.price),
                "status": subscription_plan.status,
                "valid_from": subscription_plan.valid_from.isoformat(),
                "valid_until": subscription_plan.valid_until.isoformat() if subscription_plan.valid_until else None,
                "max_users": subscription_plan.max_users,
                "storage_limit": subscription_plan.storage_limit,
                "support_level": subscription_plan.support_level,
                "features": []
            }
            
            # Get feature entitlements for this plan
            feature_entitlements = PlanFeatureEntitlement.objects.filter(plan=subscription_plan)
            
            for entitlement in feature_entitlements:
                feature = entitlement.feature
                
                # Extract feature data
                feature_data = {
                    "id": feature.id,
                    "name": feature.name,
                    "key": feature.key,
                    "description": feature.description,
                    "subfeatures": []
                }
                
                # Add subfeatures if they exist
                if feature.granual_settings and 'subfeatures' in feature.granual_settings:
                    feature_data["subfeatures"] = feature.granual_settings['subfeatures']
                
                plan_data["features"].append(feature_data)
            
            # Prepare response data
            response_data = {
                'tenant_id': tenant.id,
                'tenant_name': tenant.name,
                'schema_name': tenant.schema_name,
                'subscription_plan': plan_data
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Subscription plan not found'}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        print("Error:", e)
        return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def check_tenant_exist(request):
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    try:
        data = request.data
        application_url = data.get('application_url')

        if not application_url:
            return Response({'error': 'application_url is required'}, status=status.HTTP_400_BAD_REQUEST)

        url_obj = urlparse(application_url)
        path_parts = url_obj.path.strip("/").split("/")

        if len(path_parts) < 1:
            return Response({'error': 'Invalid application URL'}, status=status.HTTP_400_BAD_REQUEST)

        schema_name = path_parts[0].lower()
        is_tenant_admin = len(path_parts) > 1 and path_parts[1].lower() == "tenant"

        default_url = f"{url_obj.scheme}://{url_obj.netloc}/"

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT id, name, schema_name, status, subscription_plan_id
                FROM ecomm_superadmin_tenants
                WHERE schema_name = %s
            """, [schema_name])
            tenant = cursor.fetchone()

            if not tenant:
                return Response({'message': 'Tenant not found'}, status=status.HTTP_404_NOT_FOUND)

            subscription_plan = None
            subscription_plan_id = tenant[4]

            if subscription_plan_id:
                cursor.execute("""
                    SELECT id, name, price, max_users, storage_limit
                    FROM subscription_plans
                    WHERE id = %s
                """, [subscription_plan_id])
                subscription_plan = cursor.fetchone()

        # Decide the login redirect path based on URL
        if is_tenant_admin:
            redirect_path = f"http://localhost:3000/{schema_name}/tenant-admin/login?currentUrl={application_url}"
        else:
            redirect_path = f"http://localhost:3000/{schema_name}/login?currentUrl={application_url}"

        response_data = {
            'message': f"Tenant with schema_name '{schema_name}' exists",
            'tenant_id': tenant[0],
            'tenant_name': tenant[1],
            'schema_name': tenant[2],
            'status': tenant[3],
            'default_url': default_url,
            'redirect_to_iam': redirect_path
        }

        if subscription_plan:
            response_data['subscription_plan'] = {
                'id': subscription_plan[0],
                'name': subscription_plan[1],
                'price': subscription_plan[2],
                'max_users': subscription_plan[3],
                'max_storage': subscription_plan[4]
            }

        return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        print("Error:", e)
        return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
