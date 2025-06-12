from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Feature, FeatureGroup, SubscriptionPlan, PlanFeatureEntitlement
from .serializers import (
    FeatureSerializer, FeatureGroupSerializer, 
    ApplicationFeaturesSerializer, YAMLFeatureSerializer,
    SubscriptionPlanSerializer, PlanFeatureEntitlementSerializer,
    SubscriptionPlanChangeSerializer
)
from django.utils import timezone
import uuid
import yaml
from django.db import transaction
from ecomm_superadmin.models import Application, Tenant, TenantSubscriptionLicenses
from django.db import connection
from rest_framework.decorators import api_view
from rest_framework import status
from urllib.parse import urlparse
from django.views.decorators.csrf import csrf_exempt

from rest_framework.permissions import AllowAny
from rest_framework.decorators import permission_classes, authentication_classes
import json 
from ecomm_superadmin.platform_admin_jwt import PlatformAdminJWTAuthentication
from ecomm_tenant.ecomm_tenant_admins.tenant_jwt import TenantAdminJWTAuthentication


# Create your views here.

class FeatureGroupViewSet(viewsets.ModelViewSet):
    authentication_classes = [PlatformAdminJWTAuthentication]
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
    authentication_classes = [PlatformAdminJWTAuthentication]
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
    authentication_classes = [PlatformAdminJWTAuthentication]
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer

    def retrieve(self, request, *args, **kwargs):
        """Get a subscription plan with its features grouped by application"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        response_data = serializer.data

        # Get all features for this plan
        plan_features = PlanFeatureEntitlement.objects.filter(plan=instance).select_related('feature')
        
        # Group features by application
        grouped_features = {}
        
        for entitlement in plan_features:
            feature = entitlement.feature
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
                    'granual_settings': entitlement.granual_settings,
                    'is_active': feature.is_active,
                    'created_at': feature.created_at,
                    'updated_at': feature.updated_at
                }
                grouped_features[app_id]['features'].append(feature_data)
            except Application.DoesNotExist:
                continue
        
        response_data['applications'] = list(grouped_features.values())
        return Response(response_data)

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
            # Get detailed_entitlements from request data
            detailed_entitlements = self.request.data.get('detailed_entitlements', {})
            
            # Convert detailed_entitlements to the format expected by granular_settings
            granular_settings = {}
            for feature_id, settings in detailed_entitlements.items():
                try:
                    feature_id = int(feature_id)  # Ensure feature_id is an integer
                    granular_settings[feature_id] = settings
                except (ValueError, TypeError):
                    continue
            
            # Update the serializer data with granular_settings
            serializer.validated_data['granular_settings'] = granular_settings
            
            # Save the subscription plan first to get the ID
            plan = serializer.save()
            
            # Create or update feature entitlements for each feature in detailed_entitlements
            for feature_id, settings in granular_settings.items():
                try:
                    feature = Feature.objects.get(id=feature_id)
                    
                    # Prepare granual_settings for PlanFeatureEntitlement
                    granual_settings = settings.get('granual_settings', {}) if isinstance(settings, dict) else {}
                    
                    # First try to get existing entitlement
                    entitlement = PlanFeatureEntitlement.objects.filter(
                        plan=plan,
                        feature=feature
                    ).first()
                    
                    if entitlement:
                        # Update existing entitlement
                        entitlement.granual_settings = granual_settings
                        entitlement.save()
                    else:
                        # Create new entitlement
                        PlanFeatureEntitlement.objects.create(
                            plan=plan,
                            feature=feature,
                            granual_settings=granual_settings
                        )
                        
                except (Feature.DoesNotExist, ValueError, TypeError) as e:
                    print(f"Error processing feature {feature_id}: {str(e)}")
                    continue

    def perform_update(self, serializer):
        """Update an existing subscription plan and its feature entitlements"""
        with transaction.atomic():
            # Get detailed_entitlements from request data if provided
            if 'detailed_entitlements' in self.request.data:
                detailed_entitlements = self.request.data.get('detailed_entitlements', {})
                
                # Convert detailed_entitlements to the format expected by granular_settings
                granular_settings = {}
                for feature_id, settings in detailed_entitlements.items():
                    try:
                        feature_id = int(feature_id)  # Ensure feature_id is an integer
                        granular_settings[feature_id] = settings
                    except (ValueError, TypeError):
                        continue
                
                # Update the serializer data with granular_settings
                serializer.validated_data['granular_settings'] = granular_settings
                
                # Save the subscription plan first to get the ID
                plan = serializer.save()
                
                # Update feature entitlements for each feature in detailed_entitlements
                for feature_id, settings in granular_settings.items():
                    try:
                        feature = Feature.objects.get(id=feature_id)
                        
                        # Prepare granual_settings for PlanFeatureEntitlement
                        granual_settings = settings.get('granual_settings', {}) if isinstance(settings, dict) else {}
                        
                        # First try to get existing entitlement
                        entitlement = PlanFeatureEntitlement.objects.filter(
                            plan=plan,
                            feature=feature
                        ).first()
                        
                        if entitlement:
                            # Update existing entitlement
                            entitlement.granual_settings = granual_settings
                            entitlement.save()
                        else:
                            # Create new entitlement
                            PlanFeatureEntitlement.objects.create(
                                plan=plan,
                                feature=feature,
                                granual_settings=granual_settings
                            )
                            
                    except (Feature.DoesNotExist, ValueError, TypeError) as e:
                        print(f"Error processing feature {feature_id}: {str(e)}")
                        continue
            else:
                # Just save without modifying entitlements if not provided in the update
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


from urllib.parse import urlparse

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([TenantAdminJWTAuthentication])
def change_subscription_plan(request):
    """Change a tenant's subscription plan (upgrade/downgrade/renewal)
    
    Request body:
    - tenant_id: ID of the tenant
    - new_plan_id: ID of the new subscription plan
    
    Cases handled:
    1. Same plan_id, different LOB -> Renewal with LOB change (new license)
    2. Same plan_id and LOB -> Simple Renewal (update snapshots)
    3. Different plan_id, different LOB -> New Subscription (new license)
    4. Different plan_id, same LOB -> Upgrade/Downgrade (update existing)
    5. No current subscription -> New Subscription
    """
    serializer = SubscriptionPlanChangeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    tenant = serializer.validated_data['tenant']
    new_plan = serializer.validated_data['new_plan']
    
    try:
        # Get current active subscription if exists
        current_subscription = TenantSubscriptionLicenses.objects.filter(
            tenant=tenant,
            license_status='active'
        ).first()
        
        print("current_subscription", current_subscription)
        
        if current_subscription:
            current_plan_id = current_subscription.subscription_plan.id
            current_lob = current_subscription.subscription_plan.line_of_business
            new_lob = new_plan.line_of_business
            
            print(f"Current Plan ID: {current_plan_id}, New Plan ID: {new_plan.id}")
            print(f"Current LOB: {current_lob}, New LOB: {new_lob}")

            
            # Case 1: Same plan_id, different LOB (Renewal with LOB change)
            if current_plan_id == new_plan.id and current_lob != new_lob:
                print("Case 1: Same plan_id, different LOB - Renewal with LOB change")
                # Create new license with new snapshots
                client_id = tenant.client.client_id if tenant.client else None
                new_subscription = create_new_subscription(
                    tenant=tenant,
                    new_plan=new_plan,
                    client_id=client_id,
                    created_by=request.user.id if request.user.is_authenticated else None
                )
                # Deactivate old subscription
                current_subscription.license_status = 'inactive'
                current_subscription.save()
                
                return Response({
                    'message': 'Successfully renewed subscription with new line of business',
                    'new_subscription_id': new_subscription.id,
                    'change_type': 'renewal'
                })

             
            # Case 2: Same plan_id and LOB (Simple Renewal)
            elif current_plan_id == new_plan.id and current_lob == new_lob:
                print("Case 2: Same plan_id and LOB - Simple Renewal")

                # Just update snapshots
                update_subscription_snapshots(current_subscription, new_plan)
                return Response({
                    'message': 'Successfully renewed subscription',
                    'subscription_id': current_subscription.id,
                    'change_type': 'renewal'
                })
            
            # Case 3: Different plan_id, different LOB (New Subscription)
            elif current_plan_id != new_plan.id and current_lob != new_lob:
                print("Case 3: Different plan_id and LOB - New Subscription")
                # Create new license with new snapshots
                client_id = tenant.client.client_id if tenant.client else None
                new_subscription = create_new_subscription(
                    tenant=tenant,
                    new_plan=new_plan,
                    client_id=client_id,
                    created_by=request.user.id if request.user.is_authenticated else None
                )
                # Deactivate old subscription
                current_subscription.license_status = 'inactive'
                current_subscription.save()
                
                return Response({
                    'message': 'Successfully created new subscription',
                    'new_subscription_id': new_subscription.id,
                    'change_type': 'new'
                })
            
            # Case 4: Different plan_id, same LOB (Upgrade/Downgrade)
            else:
                print("Case 4: Different plan_id, same LOB - Upgrade/Downgrade")
                # Update existing subscription
                current_subscription.subscription_plan = new_plan
                update_subscription_snapshots(current_subscription, new_plan)
                
                # Determine if it's an upgrade or downgrade
                # change_type = 'upgrade' if new_plan.price > current_subscription.subscription_plan.price else 'downgrade'
                change_type = 'upgrade/downgrade'

                return Response({
                    'message': f'Successfully {change_type}d subscription plan',
                    'subscription_id': current_subscription.id,
                    'change_type': change_type
                })
        
        else:
            # Case 5: No current subscription - create new one
            print("Case 5: No current subscription - creating new one")
            client_id = tenant.client.client_id if tenant.client else None
            new_subscription = create_new_subscription(
                tenant=tenant,
                new_plan=new_plan,
                client_id=client_id,
                created_by=request.user.id if request.user.is_authenticated else None
            )
            
            return Response({
                'message': 'Successfully created new subscription',
                'new_subscription_id': new_subscription.id,
                'change_type': 'new'
            })

    except Exception as e:
        print("Error:", e)
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def create_subscription_snapshots(new_plan):
    """Create subscription plan and features snapshots for a plan using raw SQL"""
    with connection.cursor() as cursor:
        # Get subscription plan details
        cursor.execute("""
            SELECT 
                id, name, price, max_users, storage_limit,
                transaction_limit, api_call_limit, session_type,
                support_level, line_of_business_id
            FROM subscription_plans
            WHERE id = %s
        """, [new_plan.id])
        
        plan_columns = [col[0] for col in cursor.description]
        plan_data = cursor.fetchone()
        
        if not plan_data:
            raise ValueError(f"Subscription plan with id {new_plan.id} not found")
            
        plan_dict = dict(zip(plan_columns, plan_data))
        
        # Create subscription plan snapshot
        subscription_plan_snapshot = {
            'id': plan_dict['id'],
            'name': plan_dict['name'],
            'price': str(plan_dict['price']),
            'max_users': plan_dict['max_users'],
            'storage_limit': plan_dict['storage_limit'],
            'transaction_limit': plan_dict['transaction_limit'],
            'api_call_limit': plan_dict['api_call_limit'],
            'session_type': plan_dict['session_type'],
            'support_level': plan_dict['support_level']
        }
        
        # Add line of business if available
        if plan_dict['line_of_business_id']:
            cursor.execute("""
                SELECT id, name FROM ecomm_superadmin_lineofbusiness 
                WHERE id = %s
            """, [plan_dict['line_of_business_id']])
            lob_data = cursor.fetchone()
            if lob_data:
                subscription_plan_snapshot['line_of_business'] = {
                    'id': lob_data[0],
                    'name': lob_data[1]
                }

        # Get features for this plan
        cursor.execute("""
            SELECT 
                f.id, f.key, f.name, f.description, 
                f.granual_settings::text as granual_settings_json,
                a.app_id, a.application_name
            FROM features f
            INNER JOIN plan_feature_entitlements pfe ON f.id = pfe.feature_id
            LEFT JOIN application a ON f.app_id = a.app_id
            WHERE pfe.plan_id = %s
        """, [new_plan.id])
        
        feature_columns = [col[0] for col in cursor.description]
        feature_rows = cursor.fetchall()
        
        # Transform features into the desired format
        features_dict = {}
        for row in feature_rows:
            feature_dict = dict(zip(feature_columns, row))
            feature_id = str(feature_dict['id'])
            
            # Parse granual_settings JSON
            granual_settings = {}
            try:
                if feature_dict.get('granual_settings_json'):
                    granual_settings = json.loads(feature_dict['granual_settings_json'])
            except (TypeError, json.JSONDecodeError) as e:
                print(f"Error parsing granual_settings for feature {feature_id}: {e}")
                granual_settings = {}
            
            # Extract subfeatures from granual_settings
            subfeatures = []
            if isinstance(granual_settings, dict) and 'subfeatures' in granual_settings:
                subfeatures = granual_settings['subfeatures']
            
            # Build the feature structure
            features_dict[feature_id] = {
                'id': feature_dict['id'],
                'key': feature_dict['key'],
                'name': feature_dict['name'],
                'app_id': feature_dict['app_id'],
                'is_active': True,  # Assuming all features from plan are active
                'description': feature_dict['description'],
                'subfeatures': subfeatures
            }
            
            # Add application info if available
            if feature_dict.get('app_id'):
                features_dict[feature_id]['application'] = {
                    'app_id': feature_dict['app_id'],
                    'name': feature_dict['application_name']
                }

        # Create the final features snapshot
        features_snapshot = features_dict
        
        return subscription_plan_snapshot, features_snapshot

def update_subscription_snapshots(subscription, new_plan):
    """Update subscription with new plan and feature snapshots using raw SQL"""
    subscription_plan_snapshot, features_snapshot = create_subscription_snapshots(new_plan)
    print("features:", features_snapshot)
    with connection.cursor() as cursor:
        cursor.execute("""
            UPDATE ecomm_superadmin_tenant_subscriptions_licenses
            SET 
                subscription_plan_snapshot = %s,
                features_snapshot = %s,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id
        """, [
            json.dumps(subscription_plan_snapshot),
            json.dumps(features_snapshot),
            subscription.id
        ])
        
        if not cursor.fetchone():
            raise Exception("Failed to update subscription snapshots")

def create_new_subscription(tenant, new_plan, client_id, created_by):
    """Create a new subscription with snapshots"""
    subscription_plan_snapshot, features_snapshot = create_subscription_snapshots(new_plan)
    
    return TenantSubscriptionLicenses.objects.create(
        tenant=tenant,
        subscription_plan=new_plan,
        license_key=str(uuid.uuid4()),
        license_status='active',
        valid_from=timezone.now(),
        client_id=client_id,
        company_id=1,  # Default company ID
        created_by=created_by,
        subscription_plan_snapshot=subscription_plan_snapshot,
        features_snapshot=features_snapshot
    )

@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([TenantAdminJWTAuthentication])
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

from psycopg2 import sql
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
            # First get the tenant data
            cursor.execute("""
                SELECT id, name, schema_name, status, client_id
                FROM ecomm_superadmin_tenants
                WHERE schema_name = %s
            """, [schema_name])
            tenant = cursor.fetchone()


            # Decide the login redirect path based on URL
            if is_tenant_admin:
                redirect_path = f"https://devcockpit.turtleit.in/{schema_name}/tenant-admin/login?currentUrl={application_url}"
            else:
                redirect_path = f"https://devcockpit.turtleit.in/{schema_name}/login?currentUrl={application_url}"

            response_data = {
                'message': f"Tenant with schema_name '{schema_name}'",
                'tenant_id': tenant[0],
                'tenant_name': tenant[1],
                'schema_name': tenant[2],
                'status': tenant[3],
                'default_url': default_url,
                'redirect_to_iam': redirect_path
               
            }

            return Response(response_data, status=status.HTTP_200_OK)

    except Exception as e:
        print("Error:", e)
        return Response({'error': 'Internal Server Error'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

