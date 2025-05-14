import { ServiceAgent } from '@/types/customer';
import axiosInstance from './api/axiosInstance';

interface ServiceAgentListResponse {
    count: number;
    next: string | null;
    previous: string | null;
    results: ServiceAgent[];
}

export const serviceAgentApi = {
    getServiceAgents: async (): Promise<ServiceAgent[]> => {
        try {
            const response = await axiosInstance.get<ServiceAgentListResponse>('/serviceagents/');
            console.log('Service Agents API Response:', response.data);
            if (!response.data.results) {
                console.warn('No results array in response:', response.data);
                return [];
            }
            return response.data.results;
        } catch (error) {
            console.error('Error fetching service agents:', error);
            throw error;
        }
    }
};
