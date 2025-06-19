/**
 * Extracts the tenant slug from the current URL
 * Example: For URL 'https://example.com/tenant-slug/dashboard', returns 'tenant-slug'
 * @returns {string} The tenant slug from the URL
 */
export const getTenantFromUrl = (): string => {
  // This is a simplified example. In a real app, you would extract the tenant from the URL
  // For example: https://tenant1.yourdomain.com -> 'tenant1'
  if (typeof window === 'undefined') return '';
  
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  
  // If localhost, use a default tenant for development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'default-tenant';
  }
  
  // Otherwise, return the first subdomain
  return parts.length > 1 ? parts[0] : 'default-tenant';
};

/**
 * Gets the base URL for API requests based on the current tenant
 * @returns {string} The base API URL with the tenant prefix
 */
export const getTenantApiBaseUrl = (): string => {
  // For development, use the hardcoded URL
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000/api';
  }
  
  // In production, use the actual domain
  const tenant = getTenantFromUrl();
  return `${window.location.protocol}//${window.location.host}/api/${tenant}`;
};

/**
 * Returns the authentication headers for API requests
 * @returns {object} The authentication headers
 */
export const getAuthHeaders = () => {
  const token = getCookie('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    'X-CSRFToken': getCookie('csrftoken') || '',
  };
};

/**
 * Handles API errors by logging and re-throwing the error
 * @param {object} error The API error
 */
export const handleApiError = (error: any) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.error('API Error Response:', error.response.data);
    throw new Error(error.response.data.message || 'An error occurred');
  } else if (error.request) {
    // The request was made but no response was received
    console.error('API Request Error:', error.request);
    throw new Error('No response from server');
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('API Error:', error.message);
    throw error;
  }
};
