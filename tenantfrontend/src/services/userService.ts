/**
 * User Service
 * Handles all API calls for regular tenant users
 */

import { USER_API } from '../constants/apiConstants';
import { getAuthHeader } from '../utils/authUtils';

/**
 * Fetch user profile
 * @param tenantSlug The tenant's unique slug
 * @returns Promise with user profile data
 */
export const fetchUserProfile = async (tenantSlug: string) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(USER_API.PROFILE(tenantSlug), {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

/**
 * Update user profile
 * @param tenantSlug The tenant's unique slug
 * @param profileData Updated profile data
 * @returns Promise with updated profile data
 */
export const updateUserProfile = async (tenantSlug: string, profileData: any) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(USER_API.PROFILE(tenantSlug), {
      method: 'PUT',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update user profile: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Fetch user dashboard data
 * @param tenantSlug The tenant's unique slug
 * @returns Promise with dashboard data
 */
export const fetchUserDashboard = async (tenantSlug: string) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(USER_API.DASHBOARD(tenantSlug), {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user dashboard: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching user dashboard:', error);
    throw error;
  }
};
