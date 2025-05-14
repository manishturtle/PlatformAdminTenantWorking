import { jwtDecode } from 'jwt-decode';
import apiClient from './api/axiosInstance';

interface JwtPayload {
  exp: number;
  user_id: number;
  [key: string]: any;
}

interface TokenResponse {
  access: string;
  refresh: string;
}

export interface LoginCredentials {
  user_id?: string;
  password?: string;
}

export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const isTokenValid = () => {
  const token = getAuthToken();
  if (!token) return false;
  
  // Basic validation: JWT tokens should have 3 parts separated by dots
  if (!token.includes('.') || token.split('.').length !== 3) {
    console.error('Invalid token format: not a valid JWT structure');
    return false;
  }
  
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    return !isTokenExpired(decoded);
  } catch (error) {
    console.error('Failed to decode token:', error);
    // Remove invalid token from storage
    localStorage.removeItem('authToken');
    return false;
  }
};

export const logout = () => {
  localStorage.removeItem('authToken');
};

export const isTokenExpired = (tokenOrPayload?: string | JwtPayload) => {
  let decodedToken: JwtPayload | null = null;
  
  // Handle different input types
  if (!tokenOrPayload) {
    // No input provided, try to get from localStorage
    const token = getAuthToken();
    if (!token) return true;
    
    // Basic validation: JWT tokens should have 3 parts separated by dots
    if (!token.includes('.') || token.split('.').length !== 3) {
      console.error('Invalid token format: not a valid JWT structure');
      localStorage.removeItem('authToken');
      return true;
    }
    
    try {
      decodedToken = jwtDecode<JwtPayload>(token);
    } catch (error) {
      console.error('Failed to decode token:', error);
      localStorage.removeItem('authToken');
      return true;
    }
  } else if (typeof tokenOrPayload === 'string') {
    // Input is a string token
    // Basic validation: JWT tokens should have 3 parts separated by dots
    if (!tokenOrPayload.includes('.') || tokenOrPayload.split('.').length !== 3) {
      console.error('Invalid token format: not a valid JWT structure');
      return true;
    }
    
    try {
      decodedToken = jwtDecode<JwtPayload>(tokenOrPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return true;
    }
  } else {
    // Input is already a decoded token
    decodedToken = tokenOrPayload;
  }

  if (!decodedToken?.exp) {
    console.error('Invalid token format: missing expiration time');
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decodedToken.exp < currentTime;
};

export const login = async (credentials: LoginCredentials): Promise<{ success: boolean; token?: string; error?: string }> => {
  localStorage.removeItem('authToken');  // Clear existing token
  console.log('Attempting login with:', credentials.user_id);
  try {
    const response = await apiClient.post<TokenResponse>('/login/', {
        user_id: credentials.user_id,
        password: credentials.password,
    });

    if (response.status === 200 && response.data.access) {
      const token = response.data.access;
      localStorage.setItem('authToken', token); 
      console.log('Login successful, token stored.');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`; 
      return { success: true, token: token };
    } else {
      console.error('Login response missing access token:', response);
      return { success: false, error: 'Login failed: Invalid response from server.' };
    }
  } catch (error: any) {
    console.error('Login API call failed:', { message: error.message, code: error.code, response: error.response ? error.response.data : 'No response' });
    let errorMessage = 'Login failed due to a network or server error.';
    if (error.response) {
        if (error.response.status === 401) {
            errorMessage = 'Invalid username or password.';
        } else {
            errorMessage = `Login failed: Server responded with status ${error.response.status}`;
        }
        console.error('Server response:', error.response.data);
    } else if (error.request) {
        errorMessage = 'Login failed: No response received from server.';
    }
    return { success: false, error: errorMessage };
  }
};