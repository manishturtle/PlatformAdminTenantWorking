from rest_framework import serializers
from customers.models import Customer

class PortalCustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'CustomerID',
            'FirstName',
            'LastName',
            'Email',
            'Phone',
            'EmailVerified',
            'MobileVerified',
            'AllowPortalAccess'
        ]
        read_only_fields = ['CustomerID', 'EmailVerified', 'MobileVerified', 'AllowPortalAccess']

    def to_representation(self, instance):
        # Only return data if portal access is allowed
        if not instance.AllowPortalAccess:
            raise serializers.ValidationError('Portal access is not enabled for this account')
        return super().to_representation(instance)
