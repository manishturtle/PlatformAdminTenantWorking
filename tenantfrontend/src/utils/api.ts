import axios from 'axios';

// Create an Axios instance with default config
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: false,  // Changed to false to avoid CORS preflight issues
});

// Add a request interceptor to include auth token in requests
api.interceptors.request.use(
  (config) => {
    // Get tenant from URL if available
    let tenant = null;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const pathParts = path.split('/').filter(Boolean);
      if (pathParts.length > 0 && pathParts[0] !== 'platform-admin') {
        tenant = pathParts[0];
      }
    }

    // Don't add auth token for authentication endpoints
    const isAuthEndpoint = config.url?.includes('/auth/login/') || 
                          config.url?.includes('/auth/check-user/') || 
                          config.url?.includes('/auth/check-email/') ||
                          config.url?.includes('/api/') ||
                          config.url?.includes('/auth/tenant-admin/auth/');
    
    if (!isAuthEndpoint) {
      // Get the auth token - handle both string and JSON object formats
      let token = null;
      try {
        const tokenData = localStorage.getItem('token');
        if (tokenData) {
          try {
            // Try to parse as JSON (JWT format)
            const parsedToken = JSON.parse(tokenData);
            if (parsedToken && parsedToken.access) {
              token = parsedToken.access;
            }
          } catch (e) {
            // Not JSON, use as is
            token = tokenData;
          }
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    // Add tenant context headers if tenant is available
    if (tenant) {
      config.headers['X-Tenant-Name'] = tenant;
      config.headers['X-Tenant-Admin'] = 'true';
    }
    
    // Add tenant to URL if it's a tenant-specific request
    // IMPORTANT: Only add tenant if it's not already in the URL and not a platform-admin request
    if (tenant && 
        config.url && 
        !config.url?.includes('/platform-admin/') && 
        !isAuthEndpoint && 
        !config.url?.startsWith(`/${tenant}/`)) {  // Check if URL already starts with tenant
      
      // Modify URL to include tenant
      if (config.url?.startsWith('/')) {
        config.url = `/${tenant}${config.url}`;
      } else {
        config.url = `/${tenant}/${config.url}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Get tenant from URL if available
        const path = window.location.pathname;
        const pathParts = path.split('/').filter(Boolean);
        if (pathParts.length > 0 && pathParts[0] !== 'login') {
          // Redirect to tenant-specific login
          window.location.href = `/${pathParts[0]}/login`;
        } else {
          // Redirect to main login
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Check if a user exists in the system
 * @param {string} email - Email to check
 * @param {string} tenantName - Optional tenant name for tenant context
 * @returns {Promise<Object>} Response data
 */
export const checkUserExists = async (email: string, tenantName: string | null = null): Promise<any> => {
  let url;
  let headers: Record<string, string> = {};
  
  // Determine the URL based on context
  if (tenantName) {
    // Check if we're in tenant admin context (from URL or localStorage)
    const isTenantAdmin = typeof window !== 'undefined' && window.location.pathname.includes('/tenant-admin/');
    
    if (isTenantAdmin) {
      // Tenant admin path with tenant in URL
      // Format: /api/{tenant_slug}/tenant-admin/auth/check-user/
      url = `/api/${tenantName}/tenant-admin/auth/check-user/`;
      
      // Add tenant-specific headers
      headers = {
        'X-Tenant-Admin': 'true',
        'X-Tenant-Name': tenantName,
        'Content-Type': 'application/json'
      };
      
      console.log(`Using tenant admin URL for tenant ${tenantName}:`, url);
    } else {
      // Regular tenant user path
      // Format: /api/{tenant_slug}/tenant/auth/check-user/
      url = `/api/${tenantName}/tenant/auth/check-user/`;
      
      // Add tenant-specific headers
      headers = {
        'X-Tenant-Name': tenantName,
        'Content-Type': 'application/json'
      };
      
      console.log(`Using tenant user URL for tenant ${tenantName}:`, url);
    }
  } else {
    // Platform admin path - using the correct URL structure
    url = '/platform-admin/api/auth/check-user/';
    
    // Add platform admin header
    headers = {
      'Content-Type': 'application/json',
      'X-Platform-Admin': 'true'
    };
    
    console.log('Using platform admin URL:', url);
  }
  
  try {
    console.log('Making API request to:', url);
    console.log('With headers:', headers);
    console.log('And payload:', { email });
    
    // Make the request with proper headers
    const response = await api.post(url, { email }, { 
      headers
    });
    
    console.log('API response received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error in checkUserExists:', error);
    
    // For tenant admin, try an alternative URL pattern if the first one fails
    if (tenantName && axios.isAxiosError(error) && error.response?.status === 404) {
      console.log('First URL pattern failed, trying alternative URL pattern...');
      
      try {
        // Try alternative URL pattern: /{tenant_slug}/api/tenant-admin/auth/check-user/
        const alternativeUrl = `/${tenantName}/api/tenant-admin/auth/check-user/`;
        console.log('Trying alternative URL:', alternativeUrl);
        
        const alternativeResponse = await api.post(alternativeUrl, { email }, { headers });
        console.log('Alternative URL response:', alternativeResponse.data);
        return alternativeResponse.data;
      } catch (altError) {
        console.error('Alternative URL also failed:', altError);
      }
    }
    
    // Return a default response to prevent UI errors
    return {
      exists: false,
      is_staff: false,
      message: 'Error checking user existence. Please try again.'
    };
  }
};

/**
 * Login platform admin
 * @param {Object} credentials - Login credentials (email, password)
 * @returns {Promise<Object>} Login response with token and user data
 */
export const loginPlatformAdmin = async (credentials: { email: string, password: string }): Promise<any> => {
  try {
    const { email, password } = credentials;
    
    const url = '/platform-admin/api/auth/login/';
    const headers = {
      'X-Platform-Admin': 'true',
      'Content-Type': 'application/json'
    };
    
    console.log('Making platform admin login request to:', url);
    console.log('With headers:', headers);
    
    const response = await api.post(url, {
      email,
      password
    }, { headers });
    
    return response.data;
  } catch (error) {
    console.error('Login platform admin error:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      throw new Error(error.response.data?.detail || error.response.data?.message || 'Login failed');
    }
    throw error;
  }
};

/**
 * Verify 2FA token
 * @param {string} userId - User ID
 * @param {string} token - Token from authenticator app
 * @returns {Promise<Object>} Verification response with token and user data
 */
export const verifyTwoFactorLogin = async (userId: string, token: string): Promise<any> => {
  try {
    const response = await api.post('/platform-admin/api/auth/2fa/auth/', {
      user_id: userId,
      token
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

export default api;
