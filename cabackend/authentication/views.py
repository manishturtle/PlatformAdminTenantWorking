from django.shortcuts import render
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

# Create your views here.

class LoginView(APIView):
    """
    API endpoint for user authentication.
    """
    permission_classes = []
    
    def post(self, request):
        user_id = request.data.get('user_id')
        password = request.data.get('password')
        
        print(f"Login attempt for user: {user_id}")
        
        # Check credentials against predefined values
        if (user_id == settings.AUTH_USER_CREDENTIALS['USER_ID'] and 
            password == settings.AUTH_USER_CREDENTIALS['PASSWORD']):
            
            # Generate JWT token
            refresh = RefreshToken()
            
            # Add custom claims
            refresh['user_id'] = user_id
            
            # Print token for debugging
            token_response = {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user_id': user_id
            }
            print(f"Generated token for user {user_id}")
            
            return Response(token_response, status=status.HTTP_200_OK)
        
        # Return 401 for invalid credentials
        print(f"Invalid credentials for user: {user_id}")
        return Response(
            {'error': 'Invalid credentials'}, 
            status=status.HTTP_401_UNAUTHORIZED
        )
