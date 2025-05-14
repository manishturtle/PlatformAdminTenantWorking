/**
 * Authentication service for handling login, logout, and session management
 */

import { AUTH_API } from '../constants/apiConstants';

/**
 * Log out the current user by clearing all authentication data
 * @returns {Promise<boolean>}
 */
export const logoutUser = async (): Promise<boolean> => {
  try {
    // Clear all authentication-related data from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      localStorage.removeItem('temp_token');
      localStorage.removeItem('temp_user_id');
      localStorage.removeItem('is_tenant_admin');
      localStorage.removeItem('tenant_info');
    }
    
    // No need to make a backend request since we're using JWT tokens
    // which are stateless and don't need server-side invalidation
    console.log('User logged out successfully');
    
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    throw error;
  }
};

/**
 * Get the current authentication token from localStorage
 * @returns {string|null} The authentication token or null if not found
 */
export const getToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('token');
};

/**
 * Get the current refresh token from localStorage
 * @returns {string|null} The refresh token or null if not found
 */
export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem('refresh_token');
};

/**
 * Get the current user data from localStorage
 * @returns {Object|null} The user data or null if not found
 */
export const getCurrentUser = (): any | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }
  
  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
};

/**
 * Check if the user is authenticated
 * @returns {boolean} True if the user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * Check if the user is a platform admin
 * @returns {boolean} True if the user is a platform admin, false otherwise
 */
export const isPlatformAdmin = (): boolean => {
  const user = getCurrentUser();
  return user && (user.is_staff || user.is_superuser);
};

/**
 * Check if the user is a tenant admin
 * @returns {boolean} True if the user is a tenant admin, false otherwise
 */
export const isTenantAdmin = (): boolean => {
  const user = getCurrentUser();
  return user && user.profile && user.profile.is_tenant_admin;
};

/**
 * Set authentication data after successful login
 * @param {Object} authData - Authentication data from the backend
 * @returns {void}
 */
export const setAuthData = (authData: any): void => {
  if (!authData) return;
  
  if (typeof window === 'undefined') {
    return;
  }
  
  // Store token
  if (authData.token) {
    localStorage.setItem('token', authData.token);
  }
  
  // Store refresh token if available
  if (authData.refresh) {
    localStorage.setItem('refresh_token', authData.refresh);
  }
  
  // Store user data
  if (authData.user) {
    localStorage.setItem('user', JSON.stringify(authData.user));
  }
};
