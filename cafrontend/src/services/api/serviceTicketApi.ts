import {ServiceTicket, ServiceTicketFormData, ServiceTicketListResponse } from '@/types/serviceticket';
import { axiosInstance } from './axiosInstance';

// Added from legacy API for type safety
export interface Customer {
  customerid: string;
  firstname: string;
  lastname: string;
}

export interface ServiceCategory {
  servicecategoryid: string;
  servicecategoryname: string;
}

export interface ServiceAgent {
  serviceagentid: string;
  firstname: string;
  lastname: string;
}

export interface ServiceTicketFilters {
  search?: string;
  customerid?: number;
  servicecategoryid?: number;
  serviceagentid?: number;
  creation_date_start?: string;
  creation_date_end?: string;
  target_date_start?: string;
  target_date_end?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export const serviceTicketApi = {
  // Get all service tickets with pagination and filters
  getServiceTickets: async (filters: ServiceTicketFilters = {}): Promise<ServiceTicketListResponse> => {
    try {
      console.log('Filters:', filters);
      const response = await axiosInstance.get('/servicetickets/', { params: filters });
      console.log('Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching service tickets:', error);
      throw error;
    }
  },

  // Get a specific service ticket by ID
  getServiceTicket: async (id: number): Promise<ServiceTicket> => {
    try {
      const response = await axiosInstance.get(`/servicetickets/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching service ticket ${id}:`, error);
      throw error;
    }
  },

  // Create a new service ticket
  createServiceTicket: async (data: ServiceTicketFormData): Promise<ServiceTicket> => {
    try {
      const response = await axiosInstance.post('/servicetickets/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating service ticket:', error);
      throw error;
    }
  },

  // Update an existing service ticket
  updateServiceTicket: async (id: number, data: Partial<ServiceTicketFormData>): Promise<ServiceTicket> => {
    try {
      console.log(`Updating service ticket ${id} with data:`, JSON.stringify(data, null, 2));
      // Ensure status field is included in the request
      if (!data.status) {
        console.warn('Status field is missing in update request!');
      }
      const response = await axiosInstance.put(`/servicetickets/${id}/`, data);
      console.log('Update response:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating service ticket ${id}:`, error);
      throw error;
    }
  },

  // Delete a service ticket
  deleteServiceTicket: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/servicetickets/${id}/`);
    } catch (error) {
      console.error(`Error deleting service ticket ${id}:`, error);
      throw error;
    }
  },

  // Legacy methods to maintain compatibility with existing code
  
  // Get all service tickets (legacy method returning AxiosResponse)
  getAll: async (filters: ServiceTicketFilters = {}): Promise<{ data: ServiceTicketListResponse }> => {
    try {
      // Build query parameters from filters
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      
      const response = await axiosInstance.get('/servicetickets/', { params });
      return response;
    } catch (error) {
      console.error('Error fetching service tickets:', error);
      throw error;
    }
  },

  // Get by ID (legacy method returning AxiosResponse)
  getById: async (id: number): Promise<{ data: ServiceTicket }> => {
    try {
      const response = await axiosInstance.get(`/servicetickets/${id}/`);
      return response;
    } catch (error) {
      console.error(`Error fetching service ticket ${id}:`, error);
      throw error;
    }
  },

  // Create (legacy method returning AxiosResponse)
  create: async (data: Partial<ServiceTicket>): Promise<{ data: ServiceTicket }> => {
    try {
      // Set default values
      const ticketData = {
        clientid: 1,
        companyid: 1,
        ...data
      };
      
      const response = await axiosInstance.post('/servicetickets/', ticketData);
      return response;
    } catch (error) {
      console.error('Error creating service ticket:', error);
      throw error;
    }
  },

  // Update (legacy method returning AxiosResponse)
  update: async (id: number, data: Partial<ServiceTicket>): Promise<{ data: ServiceTicket }> => {
    try {
      const response = await axiosInstance.put(`/servicetickets/${id}/`, data);
      return response;
    } catch (error) {
      console.error(`Error updating service ticket ${id}:`, error);
      throw error;
    }
  },

  // Delete (legacy method returning AxiosResponse)
  delete: async (id: number): Promise<{ data: void }> => {
    try {
      const response = await axiosInstance.delete(`/servicetickets/${id}/`);
      return response;
    } catch (error) {
      console.error(`Error deleting service ticket ${id}:`, error);
      throw error;
    }
  },
  // Fetch all customers
  getCustomers: async (): Promise<Customer[]> => {
    try {
      const response = await axiosInstance.get('/customers/');
      return response.data;
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  },

  // Fetch all service categories
  getServiceCategories: async (): Promise<ServiceCategory[]> => {
    try {
      const response = await axiosInstance.get('/servicecategories/');
      return response.data;
    } catch (error) {
      console.error('Error fetching service categories:', error);
      throw error;
    }
  },

  // Fetch all service agents
  getServiceAgents: async (): Promise<ServiceAgent[]> => {
    try {
      const response = await axiosInstance.get('/serviceagents/');
      return response.data;
    } catch (error) {
      console.error('Error fetching service agents:', error);
      throw error;
    }
  }
,

};

export default serviceTicketApi;
