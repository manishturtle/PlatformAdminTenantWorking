from rest_framework import serializers
from .models import Customer
from serviceagent.models import ServiceAgent
from serviceagent.serializers import ServiceAgentSerializer
import re
from django.core.exceptions import ValidationError

class CustomerSerializer(serializers.ModelSerializer):
    account_owner = ServiceAgentSerializer(source='AccountOwner', read_only=True)
    account_owner_id = serializers.PrimaryKeyRelatedField(
        source='AccountOwner',
        queryset=ServiceAgent.objects.all(),
        required=False,
        allow_null=True,
        write_only=True
    )

    class Meta:
        model = Customer
        fields = [
            'CustomerID', 'ClientId', 'CompanyId', 'FirstName', 'LastName', 
            'Email', 'Phone', 'AadharCard', 'PANCard', 'Password', 'AllowPortalAccess', 'Source', 
            'CustomerType', 'ReferredBy', 'ChannelPartner', 'CreatedAt', 'CreatedBy', 'UpdatedAt', 'UpdatedBy',
            'EmailVerified', 'MobileVerified', 'account_owner', 'account_owner_id'
        ]
        read_only_fields = ['CustomerID', 'CreatedAt', 'UpdatedAt']
        extra_kwargs = {
            'ClientId': {'default': 1},
            'CompanyId': {'default': 1},
            'CreatedBy': {'default': 'system'},
            'UpdatedBy': {'default': 'system'}
        }
    
    def validate_FirstName(self, value):
        if not value:
            raise serializers.ValidationError("FirstName is required")
        if not re.match(r'^[A-Za-z\s]{2,100}$', value):
            raise serializers.ValidationError("FirstName must contain only letters and spaces, and be between 2-100 characters")
        return value
    
    def validate_LastName(self, value):
        if not value:
            raise serializers.ValidationError("LastName is required")
        if not re.match(r'^[A-Za-z\s]{2,100}$', value):
            raise serializers.ValidationError("LastName must contain only letters and spaces, and be between 2-100 characters")
        return value
    
    def validate_Email(self, value):
        # Skip validation if value is empty
        if not value:
            return value
            
        # Validate format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', value):
            raise serializers.ValidationError("Invalid email format")
            
        # Check for duplicates only if value is provided
        # Get the current instance if this is an update operation
        instance = getattr(self, 'instance', None)
        
        # If this is an update, exclude the current instance from the uniqueness check
        if instance:
            if Customer.objects.filter(Email=value).exclude(CustomerID=instance.CustomerID).exists():
                raise serializers.ValidationError("This email address is already registered")
        else:
            # This is a create operation
            if Customer.objects.filter(Email=value).exists():
                raise serializers.ValidationError("This email address is already registered")
            
        return value
    
    def validate_Phone(self, value):
        # Phone validation will be handled in validate() method
        if value and not re.match(r'^[0-9]{10}$', value):
            raise serializers.ValidationError("Phone must be a 10-digit number")
        return value
    
    def validate_AadharCard(self, value):
        # 1. If value is null/empty, skip all validation
        if not value:
            return value
            
        # Get the current instance if this is an update operation
        instance = getattr(self, 'instance', None)
        
        # 2. For create operation (instance is None)
        if not instance:
            # Validate format
            if not re.match(r'^[0-9]{12}$', value):
                raise serializers.ValidationError("AadharCard must be a 12-digit number")
            # Check for duplicates
            if Customer.objects.filter(AadharCard=value).exists():
                raise serializers.ValidationError("This Aadhar Card number is already registered")
        
        # 3. For update operation
        else:
            # Only validate if Aadhar card is being changed
            if value != instance.AadharCard:
                # Validate format
                if not re.match(r'^[0-9]{12}$', value):
                    raise serializers.ValidationError("AadharCard must be a 12-digit number")
                # Check for duplicates excluding current instance
                if Customer.objects.filter(AadharCard=value).exclude(CustomerID=instance.CustomerID).exists():
                    raise serializers.ValidationError("This Aadhar Card number is already registered")
        
        return value
    
    def validate_PANCard(self, value):
        # 1. If value is null/empty/whitespace, treat as null
        if value is None or not str(value).strip():
            return None
            
        # 2. Clean the value
        value = str(value).strip().upper()
            
        # 3. Validate format
        if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$', value):
            raise serializers.ValidationError("PANCard must be in the format ABCDE1234F")
            
        # 4. Get the current instance if this is an update operation
        instance = getattr(self, 'instance', None)
        
        # 5. For update operation, only check duplication if PAN is being changed
        if instance and value == instance.PANCard:
            return value
            
        # 6. Check for duplicates (for both create and update)
        existing_query = Customer.objects.filter(PANCard=value)
        if instance:
            existing_query = existing_query.exclude(CustomerID=instance.CustomerID)
            
        if existing_query.exists():
            raise serializers.ValidationError("This PAN Card number is already registered")
            
        return value
    
    def validate_Source(self, value):
        # Use the SOURCE_CHOICES from the model to ensure consistency
        valid_sources = [choice[0] for choice in Customer.SOURCE_CHOICES]
        if value and value not in valid_sources:
            raise serializers.ValidationError(f"Source must be one of: {', '.join(valid_sources)}")
        return value
    
    def validate_CustomerType(self, value):
        # Define valid types directly to match frontend options
        valid_types = ['Lead', 'Disqualified Lead', 'New', 'Active', 'Dormant']
        if not value:
            raise serializers.ValidationError("CustomerType is required")
        if value not in valid_types:
            raise serializers.ValidationError(f"CustomerType must be one of: {', '.join(valid_types)}")
        return value
        
    def validate(self, data):
        """Implement conditional field validation based on CustomerType"""
        errors = {}
        
        # FirstName and LastName are always required
        if not data.get('FirstName'):
            errors['FirstName'] = "First name is required"
            
        if not data.get('LastName'):
            errors['LastName'] = "Last name is required"
        
        # Get Source and CustomerType
        source = data.get('Source', '')
        customer_type = data.get('CustomerType', '')
        
        # For Channel Partner/Relative source with New/Active/Dormant type, both Email and Phone are optional
        is_channel_partner = source == 'Channel Partner/Relative'
        is_customer = customer_type in ['New', 'Active', 'Dormant']
        
        # Only enforce Email or Phone requirement if not Channel Partner customer
        if not (is_channel_partner and is_customer):
            if not data.get('Email') and not data.get('Phone'):
                errors['Email'] = "Either Email or Phone is required"
                errors['Phone'] = "Either Email or Phone is required"
        
        # Get CustomerType
        customer_type = data.get('CustomerType', '')
        
        # Apply conditional validation based on CustomerType
        if customer_type in ['Lead', 'Disqualified Lead']:
            # For Lead or Disqualified Lead: FirstName, LastName, and either Email or Phone are required
            # Source is also required
            if not data.get('Source'):
                errors['Source'] = "Source is required"
            
            # AadharCard and PANCard are optional for Lead/Disqualified Lead
            # No additional validation needed here
            
        elif customer_type in ['New', 'Active', 'Dormant']:
            # Source is required
            if not data.get('Source'):
                errors['Source'] = "Source is required"
            
            # For Channel Partner/Relative, Email and Phone are optional
            if data.get('Source') != 'Channel Partner/Relative':
                # Email is required for other sources
                if not data.get('Email'):
                    errors['Email'] = "Email is required"
                    
                # Phone is required for other sources
                if not data.get('Phone'):
                    errors['Phone'] = "Phone is required"
                
            # AadharCard and PANCard are optional but must be valid if provided
            # This is handled by the individual field validators
        
        # If there are validation errors, raise them
        if errors:
            raise serializers.ValidationError(errors)
            
        return data
