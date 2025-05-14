import { ServiceTicketTask, ServiceTicketTaskListResponse } from '@/types/serviceTicketTask';
import { axiosInstance } from './axiosInstance';

export interface ServiceTicketTaskFilters {
  ServiceTicketId?: number;
  TaskServiceAgent?: number;
  TaskStatus?: string;
  start_date_start?: string;
  start_date_end?: string;
  closure_date_start?: string;
  closure_date_end?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export const serviceTicketTaskApi = {
  // Get all tasks for a specific service ticket
  getTasksByServiceTicket: async (serviceTicketId: number): Promise<ServiceTicketTask[]> => {
    try {
      const response = await axiosInstance.get(`/servicetickets/tasks/by_service_ticket/`, {
        params: { service_ticket_id: serviceTicketId }
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching tasks for service ticket ${serviceTicketId}:`, error);
      throw error;
    }
  },

  // Get all service ticket tasks with pagination and filters
  getServiceTicketTasks: async (filters: ServiceTicketTaskFilters = {}): Promise<ServiceTicketTaskListResponse> => {
    try {
      const response = await axiosInstance.get('/servicetickets/tasks/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching service ticket tasks:', error);
      throw error;
    }
  },

  // Get a specific service ticket task by ID
  getServiceTicketTask: async (id: number): Promise<ServiceTicketTask> => {
    try {
      const response = await axiosInstance.get(`/servicetickets/tasks/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching service ticket task ${id}:`, error);
      throw error;
    }
  },

  // Create a new service ticket task
  createServiceTicketTask: async (data: Partial<ServiceTicketTask>): Promise<ServiceTicketTask> => {
    try {
      const response = await axiosInstance.post('/servicetickets/tasks/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating service ticket task:', error);
      throw error;
    }
  },

  // Update an existing service ticket task
  updateServiceTicketTask: async (id: number, data: Partial<ServiceTicketTask>): Promise<ServiceTicketTask> => {
    try {
      const response = await axiosInstance.put(`/servicetickets/tasks/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating service ticket task ${id}:`, error);
      throw error;
    }
  },

  // Delete a service ticket task
  deleteServiceTicketTask: async (id: number): Promise<void> => {
    try {
      await axiosInstance.delete(`/servicetickets/tasks/${id}/`);
    } catch (error) {
      console.error(`Error deleting service ticket task ${id}:`, error);
      throw error;
    }
  },

  // Reorder tasks for a service ticket
  reorderTasks: async (serviceTicketId: number, taskOrder: number[]): Promise<ServiceTicketTask[]> => {
    try {
      const response = await axiosInstance.post('/servicetickets/tasks/reorder/', {
        service_ticket_id: serviceTicketId,
        task_order: taskOrder
      });
      return response.data;
    } catch (error) {
      console.error(`Error reordering tasks for service ticket ${serviceTicketId}:`, error);
      throw error;
    }
  }
};

export default serviceTicketTaskApi;
