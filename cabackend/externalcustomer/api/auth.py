from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
import jwt
from datetime import datetime, timedelta
from customers.models import Customer
from ..serializers import PortalCustomerSerializer
from django.contrib.auth.hashers import check_password, make_password
from ..middleware import portal_auth_required

class PortalLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('Email')
        password = request.data.get('Password')

        if not email or not password:
            return Response({
                'error': 'Email and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = Customer.objects.get(Email=email)

            if not customer.AllowPortalAccess:
                return Response({
                    'error': 'Portal access is not enabled for this account'
                }, status=status.HTTP_403_FORBIDDEN)

            if customer.Password != password:  
                return Response({
                    'error': 'Invalid credentials'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Generate portal-specific token
            token = jwt.encode({
                'customer_id': customer.CustomerID,
                'exp': datetime.utcnow() + timedelta(days=1)
            }, settings.PORTAL_JWT_SECRET, algorithm='HS256')

            return Response({
                'token': token,
                'customer': PortalCustomerSerializer(customer).data
            })

        except Customer.DoesNotExist:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

class PortalOTPLoginView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        email = request.data.get('Email')
        otp = request.data.get('OTP')

        if not email or not otp:
            return Response({
                'error': 'Email and OTP are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = Customer.objects.get(Email=email)

            if not customer.AllowPortalAccess:
                return Response({
                    'error': 'Portal access is not enabled for this account'
                }, status=status.HTTP_403_FORBIDDEN)

            # Verify OTP (assuming you have OTP verification logic)
            if not verify_otp(email, otp):
                return Response({
                    'error': 'Invalid OTP'
                }, status=status.HTTP_401_UNAUTHORIZED)

            # Mark email as verified
            customer.EmailVerified = True
            customer.save()

            # Generate portal-specific token
            token = jwt.encode({
                'customer_id': customer.CustomerID,
                'exp': datetime.utcnow() + timedelta(days=1)
            }, settings.PORTAL_JWT_SECRET, algorithm='HS256')

            return Response({
                'token': token,
                'customer': PortalCustomerSerializer(customer).data
            })

        except Customer.DoesNotExist:
            return Response({
                'error': 'Customer not found'
            }, status=status.HTTP_404_NOT_FOUND)

class PortalProfileView(APIView):
    @portal_auth_required
    def get(self, request):
        # Customer is attached by the middleware
        return Response(CustomerSerializer(request.customer).data)

    @portal_auth_required
    def patch(self, request):
        # Only allow updating specific fields
        allowed_fields = ['FirstName', 'LastName', 'Phone']
        update_data = {
            k: v for k, v in request.data.items() 
            if k in allowed_fields
        }

        serializer = CustomerSerializer(
            request.customer,
            data=update_data,
            partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
