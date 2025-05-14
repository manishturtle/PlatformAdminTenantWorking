import apiClient from './axiosInstance';
import { Process, ProcessFormData } from '@/types/process';

export interface ProcessListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Process[];
}

export const processApi = {
  // Get all processes with pagination and search
  getProcesses: async (page: number = 1, pageSize: number = 10, search: string = ''): Promise<ProcessListResponse> => {
    try {
      const response = await apiClient.get('/processes/', {
        params: {
          page,
          page_size: pageSize,
          search
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching processes:', error);
      throw error;
    }
  },

  // Get a specific process by ID
  getProcess: async (id: number): Promise<Process> => {
    try {
      const response = await apiClient.get(`/processes/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching process ${id}:`, error);
      throw error;
    }
  },

  // Alias for getProcess to maintain compatibility with both naming conventions
  getProcessById: async (processId: number): Promise<Process> => {
    try {
      const response = await apiClient.get(`/processes/${processId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching process ${processId}:`, error);
      throw error;
    }
  },

  // Create a new process
  createProcess: async (data: ProcessFormData): Promise<Process> => {
    try {
      const response = await apiClient.post('/processes/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating process:', error);
      throw error;
    }
  },

  // Update an existing process
  updateProcess: async (id: number, data: ProcessFormData): Promise<Process> => {
    try {
      const response = await apiClient.put(`/processes/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating process ${id}:`, error);
      throw error;
    }
  },

  // Delete a process
  deleteProcess: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/processes/${id}/`);
    } catch (error) {
      console.error(`Error deleting process ${id}:`, error);
      throw error;
    }
  }
};

export default processApi;
