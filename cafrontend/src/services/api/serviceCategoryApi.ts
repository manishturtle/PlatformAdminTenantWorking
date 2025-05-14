import { ServiceCategory } from '@/types/servicecategory';
import { axiosInstance } from './axiosInstance';

interface ServiceCategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceCategory[];
}

export const serviceCategoryApi = {
  getServiceCategories: async (params: { page?: number; page_size?: number; search?: string } = {}, forDropdown: boolean = false): Promise<ServiceCategoryListResponse> => {
    const response = await axiosInstance.get('/servicecategories/', { params });
    return response.data;
  },

  getServiceCategory: async (id: number): Promise<ServiceCategory> => {
    const response = await axiosInstance.get(`/servicecategories/${id}/`);
    return response.data;
  },
  
  getServiceCategoryById: async (id: number): Promise<ServiceCategory> => {
    const response = await axiosInstance.get(`/servicecategories/${id}/`);
    return response.data;
  },

  createServiceCategory: async (category: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const response = await axiosInstance.post('/servicecategories/', category);
    return response.data;
  },

  updateServiceCategory: async (id: number, category: Partial<ServiceCategory>): Promise<ServiceCategory> => {
    const response = await axiosInstance.put(`/servicecategories/${id}/`, category);
    return response.data;
  },

  deleteServiceCategory: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/servicecategories/${id}/`);
  }
};

export default serviceCategoryApi;
