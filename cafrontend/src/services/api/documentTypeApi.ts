import apiClient from './axiosInstance';
import { DocumentType, DocumentTypeFilters } from '@/types/document';

export interface DocumentTypeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DocumentType[];
}

export const documentTypeApi = {
  getDocumentTypes: async (filters?: DocumentTypeFilters): Promise<DocumentTypeListResponse> => {
    try {
      const response = await apiClient.get('/document-types/', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Error fetching document types:', error);
      throw error;
    }
  },

  getDocumentType: async (id: number): Promise<DocumentType> => {
    try {
      const response = await apiClient.get(`/document-types/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching document type ${id}:`, error);
      throw error;
    }
  },

  createDocumentType: async (data: Partial<DocumentType>): Promise<DocumentType> => {
    try {
      const response = await apiClient.post('/document-types/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating document type:', error);
      throw error;
    }
  },

  updateDocumentType: async (id: number, data: Partial<DocumentType>): Promise<DocumentType> => {
    try {
      const response = await apiClient.put(`/document-types/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating document type ${id}:`, error);
      throw error;
    }
  },

  deleteDocumentType: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/document-types/${id}/`);
    } catch (error) {
      console.error(`Error deleting document type ${id}:`, error);
      throw error;
    }
  }
};

export default documentTypeApi;
