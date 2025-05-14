import random
import string
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .tokens import CustomerRefreshToken
from django.core.cache import cache
import jwt
from django.conf import settings
from customers.models import Customer
from services.email import emailApi
from ..serializers import PortalCustomerSerializer
from .serializers import (
    CustomerCheckEmailSerializer,
    CustomerLoginSerializer,
    CustomerOTPSerializer,
    CustomerSignupSerializer,
    RequestOTPSerializer,
    CustomerSetPasswordSerializer
)

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def get_cache_key(email, purpose):
    return f"portal_otp:{purpose}:{email}"

def get_rate_limit_key(email):
    return f"portal_otp_rate_limit:{email}"

class CustomerPortalCheckEmailView(APIView):
    authentication_classes = []  # Disable authentication
    permission_classes = [AllowAny]  # Allow any user to access

    def post(self, request):
        serializer = CustomerCheckEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['Email']
        try:
            customer = Customer.objects.get(Email=email)
            return Response({
                'exists': True,
                'allowPortalAccess': customer.AllowPortalAccess,
                'hasPassword': bool(customer.Password),
                'emailVerified': customer.EmailVerified,
                'mobileVerified': customer.MobileVerified
            })
        except Customer.DoesNotExist:
            return Response({
                'exists': False,
                'allowPortalAccess': False,
                'hasPassword': False
            })

class CustomerPortalLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerLoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['Email']
        password = serializer.validated_data['Password']

        try:
            customer = Customer.objects.get(Email=email)
            if not customer.AllowPortalAccess:
                return Response(
                    {'message': 'Portal access is not enabled for this account.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            print('=== Debug Info ===')
            print(f'Email: {email}')
            print(f'Received password (len={len(password)}): {password}')
            print(f'Stored password (len={len(customer.Password) if customer.Password else 0}): {customer.Password}')
            print(f'Password match: {password == customer.Password}')
            print('================')
            
            if not customer.Password:
                return Response(
                    {'error': 'No password set for this account'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if password != customer.Password:
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            refresh = RefreshToken.for_user(customer)
            return Response({
                'token': str(refresh.access_token),
                'customer': PortalCustomerSerializer(customer).data
            })

        except Customer.DoesNotExist:
            return Response(
                {'message': 'No account found with this email.'},
                status=status.HTTP_404_NOT_FOUND
            )

class CustomerPortalRequestOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerCheckEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['Email']

        # Check rate limiting
        rate_limit_key = get_rate_limit_key(email)
        if cache.get(rate_limit_key):
            return Response(
                {'message': 'Please wait before requesting another OTP.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            customer = Customer.objects.get(Email=email)
            if not customer.AllowPortalAccess:
                return Response(
                    {'message': 'Portal access is not enabled for this account.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Generate and store OTP
            otp = generate_otp()
            cache_key = get_cache_key(email, 'login')
            cache.set(cache_key, otp, timeout=300)  # 5 minutes expiry
            cache.set(rate_limit_key, True, timeout=45)  # Rate limit for 45 seconds

            # Send OTP email
            if not emailApi.send_otp_email(email, otp):
                return Response(
                    {'message': 'Failed to send OTP email. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            return Response({'message': 'OTP sent successfully.'})

        except Customer.DoesNotExist:
            return Response(
                {'message': 'No account found with this email.'},
                status=status.HTTP_404_NOT_FOUND
            )

class CustomerPortalVerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['Email']
        submitted_otp = serializer.validated_data['OTP']

        # Check if this is a signup flow
        signup_key = f'signup_data:{email}'
        signup_data = cache.get(signup_key)
        
        # Verify OTP
        purpose = 'signup' if signup_data else 'login'
        cache_key = get_cache_key(email, purpose)
        stored_otp = cache.get(cache_key)

        if not stored_otp or stored_otp != submitted_otp:
            return Response(
                {'message': 'Invalid or expired OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Clear OTP from cache
        cache.delete(cache_key)

        if signup_data:
            # For signup flow, create the customer
            try:
                # Get the next available CustomerID
                last_customer = Customer.objects.order_by('-CustomerID').first()
                next_id = int(last_customer.CustomerID) + 1 if last_customer else 1
                
                # Create the customer
                customer = Customer.objects.create(
                    CustomerID=str(next_id).zfill(6),
                    Email=signup_data['Email'],
                    Password=signup_data['Password'],
                    FirstName=signup_data['FirstName'],
                    LastName=signup_data['LastName'],
                    Phone=signup_data['Phone'],
                    CustomerType='Lead',
                    Source='Online Portal',
                    AllowPortalAccess=True,
                    EmailVerified=True,  # Always set EmailVerified to True after OTP verification
                    MobileVerified=False,
                    ClientId=1,
                    CompanyId=1,
                    CreatedAt=timezone.now(),
                    UpdatedAt=timezone.now(),
                    CreatedBy=signup_data['Email'],
                    UpdatedBy=signup_data['Email']
                )
                # Clear signup data from cache
                cache.delete(signup_key)
            except Exception as e:
                print(f'Error creating customer: {str(e)}')
                return Response(
                    {'message': 'Failed to create account. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        else:
            # For login flow, verify customer exists
            try:
                customer = Customer.objects.get(Email=email)
                if not customer.AllowPortalAccess:
                    return Response(
                        {'message': 'Portal access is not enabled for this account.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                customer.EmailVerified = True
                customer.save()
            except Customer.DoesNotExist:
                return Response(
                    {'message': 'No account found with this email.'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Generate JWT token
        refresh = CustomerRefreshToken.for_user(customer)

        # Return success response with token
        return Response({
            'token': str(refresh.access_token),
            'customer': PortalCustomerSerializer(customer).data
        })



class CustomerPortalSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerSignupSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Store signup data in cache
        signup_data = {
            'Email': serializer.validated_data['Email'],
            'Password': serializer.validated_data['Password'],
            'FirstName': serializer.validated_data['FirstName'],
            'LastName': serializer.validated_data['LastName'],
            'Phone': serializer.validated_data['Phone']
        }
        
        email = signup_data['Email']
        signup_key = f'signup_data:{email}'
        cache.set(signup_key, signup_data, timeout=300)  # 5 minutes expiry

        # Generate and store OTP for verification
        otp = generate_otp()
        cache_key = get_cache_key(email, 'signup')
        cache.set(cache_key, otp, timeout=300)  # 5 minutes expiry

        # Send verification OTP
        try:
            if not emailApi.send_otp_email(email, otp):
                return Response(
                    {'message': 'Failed to send OTP email. Please try again.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Create a temporary customer object for serialization
            customer = Customer(
                Email=email,
                FirstName=signup_data['FirstName'],
                LastName=signup_data['LastName'],
                Phone=signup_data['Phone'],
                EmailVerified=False,
                MobileVerified=False,
                AllowPortalAccess=True
            )

            # Return serialized data without saving
            serializer = CustomerSignupSerializer(customer)
            return Response({'message': 'OTP sent successfully.', 'customer': serializer.data})
        except Exception as e:
            print(f"Error in signup process: {str(e)}")
            return Response(
                {'message': 'An error occurred during signup. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CustomerPortalRequestSignupOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['Email']

        # Check rate limiting
        rate_limit_key = get_rate_limit_key(email)
        if cache.get(rate_limit_key):
            try:
                remaining_time = cache.ttl(rate_limit_key)
                if remaining_time is None:
                    remaining_time = 45
            except:
                remaining_time = 45
                
            return Response(
                {'message': f'Please wait {remaining_time} seconds before requesting another OTP.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Generate and store OTP
        try:
            otp = generate_otp()
            cache_key = get_cache_key(email, 'signup')
            cache.set(cache_key, otp, timeout=300)  # 5 minutes expiry
            cache.set(rate_limit_key, True, timeout=45)  # Rate limit for 45 seconds
        except Exception as e:
            print(f"Error generating/caching OTP: {str(e)}")
            return Response(
                {'message': 'Error generating OTP. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Send OTP email
        if not emailApi.send_otp_email(email, otp):
            return Response(
                {'message': 'Failed to send OTP email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': 'OTP sent successfully.'})

class CustomerPortalSetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerSetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['Email']
        password = serializer.validated_data['Password']

        try:
            customer = Customer.objects.get(Email=email)
            customer.Password = password
            customer.save()

            # Generate JWT token
            refresh = CustomerRefreshToken.for_user(customer)
            return Response({
                'token': str(refresh.access_token),
                'customer': PortalCustomerSerializer(customer).data
            })

        except Customer.DoesNotExist:
            return Response(
                {'message': 'No account found with this email.'},
                status=status.HTTP_404_NOT_FOUND
            )

class CustomerPortalResendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CustomerCheckEmailSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data['Email']

        # Check rate limiting
        rate_limit_key = get_rate_limit_key(email)
        if cache.get(rate_limit_key):
            try:
                remaining_time = cache.ttl(rate_limit_key)
                if remaining_time is None:
                    remaining_time = 45
            except:
                remaining_time = 45
                
            return Response(
                {'message': f'Please wait {remaining_time} seconds before requesting another OTP.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # Check if there's a pending signup
        signup_key = f'signup_data:{email}'
        signup_data = cache.get(signup_key)
        
        if not signup_data:
            # This is a login flow, verify customer exists
            try:
                customer = Customer.objects.get(Email=email)
                if not customer.AllowPortalAccess:
                    return Response(
                        {'message': 'Portal access is not enabled for this account.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                purpose = 'login'
            except Customer.DoesNotExist:
                return Response(
                    {'message': 'No account found with this email.'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            purpose = 'signup'

        # Generate and store new OTP
        try:
            otp = generate_otp()
            cache_key = get_cache_key(email, purpose)
            cache.set(cache_key, otp, timeout=300)  # 5 minutes expiry
            cache.set(rate_limit_key, True, timeout=45)  # Rate limit for 45 seconds
        except Exception as e:
            print(f"Error generating/caching OTP: {str(e)}")
            return Response(
                {'message': 'Error generating OTP. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Send OTP email
        if not emailApi.send_otp_email(email, otp):
            return Response(
                {'message': 'Failed to send OTP email. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response({'message': 'OTP sent successfully.'})
