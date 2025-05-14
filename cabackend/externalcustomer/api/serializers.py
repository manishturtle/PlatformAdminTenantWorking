from rest_framework import serializers
from django.contrib.auth.hashers import make_password
from customers.models import Customer
from rest_framework_simplejwt.tokens import RefreshToken

class CustomerPortalSerializer(serializers.ModelSerializer):
    """Base serializer for customer portal operations"""
    class Meta:
        model = Customer
        fields = ['CustomerID', 'Email', 'FirstName', 'LastName', 'Phone', 'EmailVerified', 'MobileVerified', 'AllowPortalAccess']
        read_only_fields = ['CustomerID', 'EmailVerified', 'MobileVerified', 'AllowPortalAccess']

class CustomerCheckEmailSerializer(serializers.Serializer):
    Email = serializers.EmailField()

class CustomerLoginSerializer(serializers.Serializer):
    Email = serializers.EmailField()
    Password = serializers.CharField(write_only=True)

class RequestOTPSerializer(serializers.Serializer):
    Email = serializers.EmailField()

class CustomerSetPasswordSerializer(serializers.Serializer):
    Email = serializers.EmailField()
    Password = serializers.CharField()
    Mode = serializers.ChoiceField(choices=['login', 'signup'], required=False, default='login')

class CustomerOTPSerializer(serializers.Serializer):
    Email = serializers.EmailField()
    Mode = serializers.ChoiceField(choices=['login', 'signup'], required=False, default='login')
    OTP = serializers.CharField(max_length=6)

class CustomerSignupSerializer(serializers.ModelSerializer):
    Password = serializers.CharField(write_only=True)
    token = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ['Email', 'Password', 'FirstName', 'LastName', 'Phone', 'EmailVerified', 'MobileVerified', 'AllowPortalAccess', 'token']
        extra_kwargs = {
            'FirstName': {'required': True},
            'LastName': {'required': True},
            'Phone': {'required': True},
            'EmailVerified': {'read_only': True},
            'MobileVerified': {'read_only': True}
        }

    def validate_Email(self, value):
        if Customer.objects.filter(Email=value).exists():
            raise serializers.ValidationError("A customer with this email already exists.")
        return value

    def validate_Phone(self, value):
        if not value.strip():
            raise serializers.ValidationError("Phone number is required.")
        return value

    def create(self, validated_data):
        # Password is already hashed by frontend
        validated_data['AllowPortalAccess'] = True  # Enable portal access by default for self-signup
        validated_data['EmailVerified'] = False
        validated_data['MobileVerified'] = False
        validated_data['CustomerType'] = 'New'  # Set as New customer by default
        validated_data['Source'] = 'Online Portal'  # Set source as Online Portal
        customer = super().create(validated_data)
        return customer

    def get_token(self, customer):
        if not customer.CustomerID:
            # For temporary customer objects during signup
            return None
        refresh = RefreshToken()
        refresh['CustomerID'] = customer.CustomerID
        refresh['Email'] = customer.Email
        return str(refresh.access_token)
