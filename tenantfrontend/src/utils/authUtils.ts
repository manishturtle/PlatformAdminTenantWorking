/**
 * Utility functions for authentication
 */

/**
 * Helper function to get the authentication token
 * @returns {string|null} The authentication token or null if not available
 */
export const getAuthToken = (): string | null => {
  try {
    const tokenData = localStorage.getItem('token');
    if (!tokenData) {
      console.log('No token found in localStorage');
      return null;
    }
    
    console.log('Raw token data from localStorage:', tokenData);
    
    // The token should be stored as a string in localStorage
    // It should be either the direct access token string or a stringified object
    
    // If it looks like a JSON object, try to parse it
    if (tokenData.startsWith('{') && tokenData.endsWith('}')) {
      try {
        const parsedToken = JSON.parse(tokenData);
        console.log('Token was stored as JSON, parsed:', parsedToken);
        
        // If it has an access property, use that
        if (parsedToken && typeof parsedToken === 'object' && parsedToken.access) {
          console.log('Using access property from parsed token');
          return parsedToken.access;
        }
        
        // Otherwise stringify it back
        console.log('No access property found in parsed token, using stringified version');
        return JSON.stringify(parsedToken);
      } catch (e) {
        // If parsing fails, use the raw token data
        console.log('Failed to parse token as JSON, using as-is');
        return tokenData;
      }
    }
    
    // If we get here, it's a regular string token (the access token directly)
    console.log('Using token as-is (direct string)');
    return tokenData;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Helper function to get the authorization header
 * @returns {Object} The authorization header object
 */
export const getAuthHeader = (): Record<string, string> => {
  const token = getAuthToken();
  console.log('Token from getAuthToken:', token);
  
  if (!token) {
    console.log('No token available, returning empty auth header');
    return {};
  }
  
  // At this point, token should always be a string from getAuthToken
  // But let's add a safety check just in case
  let tokenString = typeof token === 'string' ? token : String(token);
  
  // Remove 'Bearer ' prefix if it's already included in the token
  if (tokenString.startsWith('Bearer ')) {
    console.log('Token already has Bearer prefix, removing it');
    tokenString = tokenString.substring(7);
  }
  
  // Return the properly formatted Authorization header
  const authHeader = { 'Authorization': `Bearer ${tokenString}` };
  console.log('Final auth header:', authHeader);
  return authHeader;
};
