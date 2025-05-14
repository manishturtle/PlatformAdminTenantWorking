import { Customer } from '@/types/customer';
import { axiosInstance } from './axiosInstance';

interface CustomerListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}

export interface CustomerFilters {
  page?: number;
  page_size?: number;
  search?: string;
}

interface SearchCustomersParams {
  search: string;
  page: number;
  limit: number;
}

export const customerApi = {
  getCustomers: async (filters: CustomerFilters = {}): Promise<CustomerListResponse> => {
    const response = await axiosInstance.get('/customers/', { params: filters });
    // Ensure each customer has Password field defined (even if null)
    if (response.data && response.data.results) {
      response.data.results = response.data.results.map((customer: any) => ({
        ...customer,
        Password: customer.Password || null
      }));
    }
    return response.data;
  },

  searchCustomers: async (params: SearchCustomersParams): Promise<{ data: { customers: Customer[] } }> => {
    const response = await axiosInstance.get('/customers/', {
      params: {
        search: params.search,
        page: params.page,
        page_size: params.limit
      }
    });
    return {
      data: {
        customers: response.data.results.map((customer: any) => ({
          ...customer,
          Password: customer.Password || null
        }))
      }
    };
  },

  getCustomer: async (id: number): Promise<Customer> => {
    const response = await axiosInstance.get(`/customers/${id}/`);
    // Ensure Password field is defined (even if null)
    return {
      ...response.data,
      Password: response.data.Password || null
    };
  },
  
  getCustomerById: async (id: number): Promise<Customer> => {
    const response = await axiosInstance.get(`/customers/${id}/`);
    // Ensure Password field is defined (even if null)
    return {
      ...response.data,
      Password: response.data.Password || null
    };
  },

  createCustomer: async (customer: Partial<Customer>): Promise<Customer> => {
    const response = await axiosInstance.post('/customers/', customer);
    return response.data;
  },

  updateCustomer: async (id: number, customer: Partial<Customer>): Promise<Customer> => {
    const response = await axiosInstance.put(`/customers/${id}/`, customer);
    return response.data;
  },

  deleteCustomer: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/customers/${id}/`);
  },

  // Portal-related methods have been moved to portalApi.ts
  /*
  checkEmail: async (email: string): Promise<{ exists: boolean; allowPortalAccess: boolean; hasPassword: boolean }> => {
    const response = await axiosInstance.post('/customers/check-email/', { email });
    return response.data;
  },

  login: async (email: string, password: string): Promise<{ token: string; customer: Customer }> => {
    const response = await axiosInstance.post('/customers/login/', { email, password });
    return response.data;
  },

  requestOtp: async (email: string): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/customers/request-otp/', { email });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string): Promise<{ token: string; customer: Customer }> => {
    const response = await axiosInstance.post('/customers/verify-otp/', { email, otp });
    return response.data;
  },

  signup: async (data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  }): Promise<{ message: string }> => {
    const response = await axiosInstance.post('/customers/signup/', data);
    return response.data;
  }
  */
};

export default customerApi;
