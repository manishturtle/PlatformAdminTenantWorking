import { axiosInstance } from './axiosInstance';
import { Credential } from '@/types/credential';

export interface CredentialListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Credential[];
}

const credentialApi = {
  // Fetch credentials for a specific customer with pagination
  getCustomerCredentials: async (
    customerId: number,
    page: number,
    page_size: number
  ): Promise<CredentialListResponse> => {
    const response = await axiosInstance.get('/credentials/', {
      params: { CustomerId: customerId, page, page_size }
    });
    return response.data;
  },

  // Other CRUD methods can be added here
};

export default credentialApi;
