import { ServiceAgent } from '@/types/serviceagent';
import apiClient from './axiosInstance';

export interface ServiceAgentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceAgent[];
}

export const serviceAgentApi = {
  // Get all service agents with pagination and search
  getServiceAgents: async (params: { page?: number; page_size?: number; search?: string } = {}): Promise<ServiceAgentListResponse> => {
    try {
      const response = await apiClient.get('/serviceagents/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching service agents:', error);
      throw error;
    }
  },

  // Get a specific service agent by ID
  getServiceAgent: async (id: number): Promise<ServiceAgent> => {
    try {
      const response = await apiClient.get(`/serviceagents/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching service agent ${id}:`, error);
      throw error;
    }
  },

  // Alias for getServiceAgent to maintain compatibility
  getServiceAgentById: async (id: number): Promise<ServiceAgent> => {
    try {
      const response = await apiClient.get(`/serviceagents/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching service agent ${id}:`, error);
      throw error;
    }
  },

  // Get all service agents (legacy method returning AxiosResponse)
  getAll: async (): Promise<{ data: ServiceAgentListResponse }> => {
    try {
      const response = await apiClient.get('/serviceagents/');
      return response;
    } catch (error) {
      console.error('Error fetching all service agents:', error);
      throw error;
    }
  },

  // Get by ID (legacy method returning AxiosResponse)
  getById: async (id: number): Promise<{ data: ServiceAgent }> => {
    try {
      const response = await apiClient.get(`/serviceagents/${id}/`);
      return response;
    } catch (error) {
      console.error(`Error fetching service agent ${id}:`, error);
      throw error;
    }
  },

  // Create a new service agent
  createServiceAgent: async (agent: Partial<ServiceAgent>): Promise<ServiceAgent> => {
    try {
      const response = await apiClient.post('/serviceagents/', agent);
      return response.data;
    } catch (error) {
      console.error('Error creating service agent:', error);
      throw error;
    }
  },

  // Create (legacy method returning AxiosResponse)
  create: async (data: ServiceAgent): Promise<{ data: ServiceAgent }> => {
    try {
      // Log the data we're sending to backend
      console.log('serviceAgentApi create - sending data:', data);
      const response = await apiClient.post('/serviceagents/', data);
      return response;
    } catch (error) {
      console.error('Error creating service agent:', error);
      throw error;
    }
  },

  // Update a service agent
  updateServiceAgent: async (id: number, agent: Partial<ServiceAgent>): Promise<ServiceAgent> => {
    try {
      // Create a modified data object that properly maps frontend to backend fields
      const backendData = {
        ...agent,
        // Ensure expertat_ids is provided for the backend when expertat is present
        expertat_ids: (agent as any).expertat_ids || agent.expertat,
      };
      
      // Determine the correct ID to use for the API endpoint
      // Prefer serviceagentid if available, fall back to id
      const updateId = agent.serviceagentid || id;
      
      // Log the data we're sending to backend
      console.log('serviceAgentApi updateServiceAgent - sending data:', backendData);
      console.log('serviceAgentApi updateServiceAgent - using ID:', updateId);
      
      const response = await apiClient.put(`/serviceagents/${updateId}/`, backendData);
      return response.data;
    } catch (error) {
      console.error(`Error updating service agent ${id}:`, error);
      throw error;
    }
  },

  // Update (legacy method returning AxiosResponse)
  update: async (id: number, data: ServiceAgent): Promise<{ data: ServiceAgent }> => {
    try {
      // Ensure we're using the correct ID field for the backend
      const updateId = data.serviceagentid || id;
      
      // Create a modified data object that properly maps frontend to backend fields
      const backendData = {
        ...data,
        // Ensure expertat_ids is provided as expertat for the backend when present
        expertat_ids: data.expertat_ids || data.expertat,
      };
      
      // Log the data we're sending to backend
      console.log('serviceAgentApi update - sending data:', backendData);
      console.log('serviceAgentApi update - using ID:', updateId);
      
      const response = await apiClient.put(`/serviceagents/${updateId}/`, backendData);
      return response;
    } catch (error) {
      console.error(`Error updating service agent ${id}:`, error);
      throw error;
    }
  },

  // Delete a service agent
  deleteServiceAgent: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/serviceagents/${id}/`);
    } catch (error) {
      console.error(`Error deleting service agent ${id}:`, error);
      throw error;
    }
  },

  // Delete (legacy method returning AxiosResponse)
  delete: async (id: number): Promise<{ data: void }> => {
    try {
      const response = await apiClient.delete(`/serviceagents/${id}/`);
      return response;
    } catch (error) {
      console.error(`Error deleting service agent ${id}:`, error);
      throw error;
    }
  }
};

export default serviceAgentApi;
