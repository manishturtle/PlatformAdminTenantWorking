/**
 * Authentication utility functions
 */

/**
 * Get the authentication token from local storage
 * @returns The authentication token or null if not found
 */
export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

/**
 * Set the authentication token in local storage
 * @param token The authentication token to store
 */
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
};

/**
 * Remove the authentication token from local storage
 */
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
  }
};

/**
 * Check if the user is authenticated
 * @returns True if the user is authenticated, false otherwise
 */
export const isAuthenticated = (): boolean => {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem('token');
  }
  return false;
};

/**
 * Get the current user from local storage
 * @returns The user object or null if not found
 */
export const getCurrentUser = (): any | null => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
  }
  return null;
};
