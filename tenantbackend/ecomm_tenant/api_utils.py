from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

class APIErrorResponse:
    """
    Standardized API error response utility.
    Provides consistent error response format across the application.
    """
    
    @staticmethod
    def tenant_not_found(tenant_slug):
        """
        Return a standardized error response for invalid tenant slug.
        
        Args:
            tenant_slug (str): The invalid tenant slug
            
        Returns:
            Response: DRF Response object with error details
        """
        error_data = {
            'error': 'tenant_not_found',
            'message': f'The tenant "{tenant_slug}" does not exist',
            'status_code': status.HTTP_404_NOT_FOUND
        }
        logger.warning(f"Tenant not found: {tenant_slug}")
        return Response(error_data, status=status.HTTP_404_NOT_FOUND)
    
    @staticmethod
    def validation_error(errors):
        """
        Return a standardized error response for validation errors.
        
        Args:
            errors (dict): Validation errors
            
        Returns:
            Response: DRF Response object with error details
        """
        error_data = {
            'error': 'validation_error',
            'message': 'The request contains invalid data',
            'errors': errors,
            'status_code': status.HTTP_400_BAD_REQUEST
        }
        return Response(error_data, status=status.HTTP_400_BAD_REQUEST)
    
    @staticmethod
    def permission_denied(message="You do not have permission to perform this action"):
        """
        Return a standardized error response for permission denied.
        
        Args:
            message (str): Custom error message
            
        Returns:
            Response: DRF Response object with error details
        """
        error_data = {
            'error': 'permission_denied',
            'message': message,
            'status_code': status.HTTP_403_FORBIDDEN
        }
        return Response(error_data, status=status.HTTP_403_FORBIDDEN)
    
    @staticmethod
    def not_found(message="Resource not found"):
        """
        Return a standardized error response for resource not found.
        
        Args:
            message (str): Custom error message
            
        Returns:
            Response: DRF Response object with error details
        """
        error_data = {
            'error': 'not_found',
            'message': message,
            'status_code': status.HTTP_404_NOT_FOUND
        }
        return Response(error_data, status=status.HTTP_404_NOT_FOUND)
    
    @staticmethod
    def server_error(message="An unexpected error occurred", exception=None):
        """
        Return a standardized error response for server errors.
        
        Args:
            message (str): Custom error message
            exception (Exception, optional): The exception that occurred
            
        Returns:
            Response: DRF Response object with error details
        """
        if exception:
            logger.error(f"Server error: {str(exception)}")
        
        error_data = {
            'error': 'server_error',
            'message': message,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR
        }
        return Response(error_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @staticmethod
    def custom_error(message, error_code, status_code):
        """
        Return a custom error response.
        
        Args:
            message (str): Error message
            error_code (str): Error code identifier
            status_code (int): HTTP status code
            
        Returns:
            Response: DRF Response object with error details
        """
        error_data = {
            'error': error_code,
            'message': message,
            'status_code': status_code
        }
        return Response(error_data, status=status_code)
