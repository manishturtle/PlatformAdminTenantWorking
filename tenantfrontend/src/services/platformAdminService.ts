/**
 * Platform Admin Service
 * Handles all API calls for the platform admin section
 */

import { PLATFORM_ADMIN_API } from '../constants/apiConstants';
import { getAuthHeader } from '../utils/authUtils';

/**
 * Fetch all tenants
 * @returns Promise with tenant data
 */
export const fetchTenants = async () => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(PLATFORM_ADMIN_API.TENANTS, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenants: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error('Error fetching tenants:', error);
    throw error;
  }
};

/**
 * Fetch a single tenant by ID
 * @param id Tenant ID
 * @returns Promise with tenant data
 */
export const fetchTenantById = async (id: string) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(`${PLATFORM_ADMIN_API.TENANTS}${id}/`, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching tenant ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new tenant
 * @param tenantData Tenant data to create
 * @returns Promise with created tenant data
 */
export const createTenant = async (tenantData: any) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(PLATFORM_ADMIN_API.TENANTS, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tenantData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create tenant: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
};

/**
 * Update an existing tenant
 * @param id Tenant ID
 * @param tenantData Updated tenant data
 * @returns Promise with updated tenant data
 */
export const updateTenant = async (id: string, tenantData: any) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(`${PLATFORM_ADMIN_API.TENANTS}${id}/`, {
      method: 'PUT',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tenantData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update tenant: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating tenant ${id}:`, error);
    throw error;
  }
};

/**
 * Fetch all CRM clients
 * @returns Promise with CRM client data
 */
export const fetchCrmClients = async () => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(PLATFORM_ADMIN_API.CRM_CLIENTS, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CRM clients: ${response.status}`);
    }
    
    const data = await response.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (error) {
    console.error('Error fetching CRM clients:', error);
    throw error;
  }
};

/**
 * Fetch a single CRM client by ID
 * @param id CRM client ID
 * @returns Promise with CRM client data
 */
export const fetchCrmClientById = async (id: string) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(`${PLATFORM_ADMIN_API.CRM_CLIENTS}${id}/`, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CRM client: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching CRM client ${id}:`, error);
    throw error;
  }
};

/**
 * Create a new CRM client
 * @param clientData CRM client data to create
 * @returns Promise with created CRM client data
 */
export const createCrmClient = async (clientData: any) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(PLATFORM_ADMIN_API.CRM_CLIENTS, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(clientData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to create CRM client: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating CRM client:', error);
    throw error;
  }
};

/**
 * Fetch platform settings
 * @returns Promise with platform settings data
 */
export const fetchPlatformSettings = async () => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(PLATFORM_ADMIN_API.SETTINGS, {
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch platform settings: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching platform settings:', error);
    throw error;
  }
};

/**
 * Update platform settings
 * @param settingsData Updated settings data
 * @returns Promise with updated settings data
 */
export const updatePlatformSettings = async (settingsData: any) => {
  try {
    const authHeader = getAuthHeader();
    const response = await fetch(PLATFORM_ADMIN_API.SETTINGS, {
      method: 'PUT',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settingsData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Failed to update platform settings: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating platform settings:', error);
    throw error;
  }
};
