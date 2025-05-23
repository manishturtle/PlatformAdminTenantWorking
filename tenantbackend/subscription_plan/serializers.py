from rest_framework import serializers
from .models import Feature, FeatureGroup, SubscriptionPlan, PlanFeatureEntitlement
from ecomm_superadmin.models import Application
import yaml
from django.db import transaction



class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'name', 'key', 'description', 'granual_settings', 'is_active', 'app_id']

class FeatureGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureGroup
        fields = ['id', 'name', 'description', 'app_id']

class ApplicationFeaturesSerializer(serializers.Serializer):
    app_id = serializers.IntegerField()
    feature_groups = FeatureGroupSerializer(many=True, read_only=True)

class YAMLFeatureSerializer(serializers.Serializer):
    yaml_file = serializers.FileField()
    application_name = serializers.CharField(required=True)

    def validate(self, data):
        yaml_file = data.get('yaml_file')
        if not yaml_file:
            raise serializers.ValidationError({"yaml_file": "This field is required."})

        try:
            content = yaml_file.read().decode('utf-8')
            yaml_data = yaml.safe_load(content)
            yaml_file.seek(0)
            
            # Get application_name from YAML
            yaml_app_name = yaml_data.get('application_name')
            if not yaml_app_name:
                raise serializers.ValidationError({
                    "yaml_file": "YAML must contain application_name field"
                })
            
            # Get application by name and its app_id
            try:
                application = Application.objects.get(application_name=yaml_app_name)
                data['app_id'] = application.app_id
                data['yaml_data'] = yaml_data
            except Application.DoesNotExist:
                raise serializers.ValidationError({
                    "application_name": f"Application with name '{yaml_app_name}' does not exist"
                })

            return data

        except yaml.YAMLError as e:
            raise serializers.ValidationError({
                "yaml_file": f"Invalid YAML format: {str(e)}"
            })
        except Exception as e:
            raise serializers.ValidationError({
                "yaml_file": f"Error processing YAML file: {str(e)}"
            })

    @transaction.atomic
    def create(self, validated_data):
        app_id = validated_data['app_id']
        yaml_data = validated_data['yaml_data']
        
        created_features = []
        updated_features = []
        errors = []

        # Create default group
        default_group = FeatureGroup.objects.create(
            app_id=app_id,
            name='Default Group',
            description='Default feature group'
        )

        for feature_data in yaml_data.get('feature_groups', []):
            feature_key = feature_data.get('key')
            if not feature_key:
                errors.append(f"Missing key in feature: {feature_data}")
                continue

            try:
                feature = Feature.objects.filter(
                    app_id=app_id,
                    key=feature_key
                ).first()

                feature_data = {
                    'app_id': app_id,
                    'name': feature_data.get('name'),
                    'key': feature_key,
                    'description': feature_data.get('description', ''),
                    'granual_settings': feature_data.get('granual_settings', {}),
                    'is_active': feature_data.get('is_active', True)
                }

                if feature:
                    for key, value in feature_data.items():
                        setattr(feature, key, value)
                    feature.save()
                    updated_features.append(feature_key)
                else:
                    Feature.objects.create(**feature_data)
                    created_features.append(feature_key)

            except Exception as e:
                errors.append(f"Error with feature {feature_key}: {str(e)}")

        # Get application for response
        application = Application.objects.get(app_id=app_id)
        return {
            'created_features': created_features,
            'updated_features': updated_features,
            'errors': errors,
            'application': application
        }

class SubscriptionPlanSerializer(serializers.ModelSerializer):
    line_of_business_name = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = SubscriptionPlan
        fields = '__all__'
    def get_line_of_business_name(self, obj):
        if obj.line_of_business:
            return obj.line_of_business.name
        return None
        
    def validate_name(self, value):
        """
        Check that the subscription plan name is unique.
        """
        # Get the current instance if we're updating an existing record
        instance = getattr(self, 'instance', None)
        
        # Check if a plan with this name already exists
        if SubscriptionPlan.objects.filter(name=value).exists():
            # If we're updating and the name hasn't changed, it's valid
            if instance and instance.name == value:
                return value
            # Otherwise, it's a duplicate name
            raise serializers.ValidationError("A subscription plan with this name already exists.")
        
        return value

class PlanFeatureEntitlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanFeatureEntitlement
        fields = '__all__'


class SubscriptionPlanChangeSerializer(serializers.Serializer):
    tenant_id = serializers.IntegerField(required=True)
    new_plan_id = serializers.IntegerField(required=True)
    
    def validate(self, data):
        from ecomm_superadmin.models import Tenant
        from .models import SubscriptionPlan
        
        try:
            tenant = Tenant.objects.get(id=data['tenant_id'])
            data['tenant'] = tenant
        except Tenant.DoesNotExist:
            raise serializers.ValidationError({'tenant_id': 'Tenant not found'})
            
        try:
            new_plan = SubscriptionPlan.objects.get(id=data['new_plan_id'])
            if new_plan.status != 'active':
                raise serializers.ValidationError({'new_plan_id': 'Selected plan is not active'})
            data['new_plan'] = new_plan
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError({'new_plan_id': 'Subscription plan not found'})
            
        return data
