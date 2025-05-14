from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from .models import ServiceAgent
from servicecategory.models import ServiceCategory
from servicecategory.serializers import ServiceCategorySerializer
import re

class ServiceAgentSerializer(serializers.ModelSerializer):
    # Nested serializer for the ServiceCategory relationship - provides full category objects
    expert_categories = ServiceCategorySerializer(source='expertat', many=True, read_only=True)
    
    # String representation of the categories for simpler display
    expert_at_names = serializers.SerializerMethodField(read_only=True)
    
    # Password field (write-only)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    
    # Primary key list for the expertat field - provides just the IDs
    expertat = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    
    # For writing to the expertat field
    expertat_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        write_only=True,
        queryset=ServiceCategory.objects.all(),
        source='expertat',
        required=False
    )
    
    def get_expert_at_names(self, obj):
        """Return a list of category names for the agent's expertat field"""
        return [category.servicecategoryname for category in obj.expertat.all()]

    class Meta:
        model = ServiceAgent
        fields = [
            'serviceagentid',
            'serviceagentname',
            'emailid',
            'expertat',
            'expert_categories',
            'expert_at_names',
            'expertat_ids',
            'clientid',
            'companyid',
            'password',
            'allowportalaccess',
            'status',
            'created_at',
            'updated_at',
            'created_by',
            'updated_by'
        ]
        read_only_fields = ['serviceagentid', 'created_at', 'updated_at', 'created_by', 'updated_by']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_emailid(self, value):
        if value:
            # Basic email validation using regex
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, value):
                raise serializers.ValidationError("Please enter a valid email address.")
            
            # Check if email already exists (case-insensitive)
            if ServiceAgent.objects.filter(emailid__iexact=value).exists():
                if self.instance and self.instance.emailid and self.instance.emailid.lower() == value.lower():
                    # If this is an update and the email hasn't changed
                    return value
                raise serializers.ValidationError("This email address is already in use.")
        return value

    def validate(self, data):
        # If allowportalaccess is True, both email and password are required
        if data.get('allowportalaccess'):
            if not data.get('emailid'):
                raise serializers.ValidationError(
                    {"emailid": "Email is required when portal access is enabled"}
                )
            if not data.get('password') and not self.instance:
                raise serializers.ValidationError(
                    {"password": "Password is required when portal access is enabled"}
                )
        return data

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        # Extract the service categories IDs if provided
        service_categories = validated_data.pop('expertat', [])
        
        # Set default values for clientid and companyid if not provided
        validated_data.setdefault('clientid', ServiceAgent.CLIENT_ID)
        validated_data.setdefault('companyid', ServiceAgent.COMPANY_ID)
        
        # Set created_by and updated_by
        user = self.context.get('request').user
        validated_data['created_by'] = user.user_id if hasattr(user, 'user_id') else 'system'
        validated_data['updated_by'] = validated_data['created_by']
        
        # Create the service agent instance
        service_agent = super().create(validated_data)
        
        # Set the service categories if provided
        if service_categories:
            service_agent.expertat.set(service_categories)
        
        if password:
            service_agent.password = make_password(password)
            service_agent.save()
        
        return service_agent

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        # Extract the service categories IDs if provided
        service_categories = validated_data.pop('expertat', None)
        
        # Set default values for clientid and companyid if not provided
        validated_data.setdefault('clientid', ServiceAgent.CLIENT_ID)
        validated_data.setdefault('companyid', ServiceAgent.COMPANY_ID)
        
        # Set updated_by
        user = self.context.get('request').user
        validated_data['updated_by'] = user.user_id if hasattr(user, 'user_id') else 'system'
        
        # Update the service agent instance
        instance = super().update(instance, validated_data)
        
        # Update the service categories if provided
        if service_categories is not None:
            instance.expertat.set(service_categories)
        
        if password:
            instance.password = make_password(password)
            instance.save()
        
        return instance
