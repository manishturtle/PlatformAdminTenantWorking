import apiClient from './axiosInstance';
import { CredentialType } from '@/types/credential';

// Define filters interface if not already defined in types
export interface CredentialTypeFilters {
  page?: number;
  page_size?: number;
  search?: string;
  include_inactive?: boolean;
}

export interface CredentialTypeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CredentialType[];
}

export const credentialTypeApi = {
  getCredentialTypes: async (filters?: CredentialTypeFilters): Promise<CredentialTypeListResponse> => {
    try {
      const response = await apiClient.get('/credential-types/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching credential types:', error);
      throw error;
    }
  },

  getCredentialType: async (id: number): Promise<CredentialType> => {
    try {
      const response = await apiClient.get(`/credential-types/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching credential type ${id}:`, error);
      throw error;
    }
  },

  createCredentialType: async (data: Partial<CredentialType>): Promise<CredentialType> => {
    try {
      const response = await apiClient.post('/credential-types/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating credential type:', error);
      throw error;
    }
  },

  updateCredentialType: async (id: number, data: Partial<CredentialType>): Promise<CredentialType> => {
    try {
      const response = await apiClient.put(`/credential-types/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating credential type ${id}:`, error);
      throw error;
    }
  },

  deleteCredentialType: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/credential-types/${id}/`);
    } catch (error) {
      console.error(`Error deleting credential type ${id}:`, error);
      throw error;
    }
  }
};

export default credentialTypeApi;
