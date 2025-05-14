import apiClient from './axiosInstance';
import { SOP, SOPFormData, SOPStep, SOPStepFormData } from '@/types/sop';

export interface SOPListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SOP[];
}

export interface SOPStepListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: SOPStep[];
}

export interface SOPFilters {
  page?: number;
  page_size?: number;
  search?: string;
  include_inactive?: boolean;
  status?: string;
  ProcessId?: number;
}

export const sopApi = {
  // Get all SOPs with pagination and optional filters
  // This function can be called with either a filters object or individual parameters
  getSOPs: async (filtersOrPage?: SOPFilters | number, pageSize?: number, status?: string): Promise<SOPListResponse> => {
    try {
      let params: any = {};
      
      // Handle both object-style and parameter-style calls
      if (typeof filtersOrPage === 'object') {
        // Called with filters object
        params = filtersOrPage;
      } else if (typeof filtersOrPage === 'number') {
        // Called with individual parameters
        params = {
          page: filtersOrPage,
          page_size: pageSize || 10
        };
        
        if (status) {
          params.status = status;
        }
      }
      
      const response = await apiClient.get('/sops/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching SOPs:', error);
      throw error;
    }
  },

  // Get SOPs for a specific process
  getSOPsByProcess: async (processId: number, page: number = 1, pageSize: number = 10): Promise<SOPListResponse> => {
    try {
      const params = {
        page,
        page_size: pageSize,
        ProcessId: processId
      };
      const response = await apiClient.get('/sops/', { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching SOPs for process ${processId}:`, error);
      throw error;
    }
  },

  // Get a specific SOP by ID
  getSOP: async (id: number): Promise<SOP> => {
    try {
      const response = await apiClient.get(`/sops/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching SOP ${id}:`, error);
      throw error;
    }
  },

  // Create a new SOP
  createSOP: async (data: SOPFormData, processId?: number): Promise<SOP> => {
    try {
      const endpoint = processId ? `/processes/${processId}/sops/` : '/sops/';
      const response = await apiClient.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error('Error creating SOP:', error);
      throw error;
    }
  },

  // Update an existing SOP
  updateSOP: async (id: number, data: SOPFormData): Promise<SOP> => {
    try {
      // Only send the allowed fields to the backend
      const payload: any = {
        // Only include these fields that are allowed to be updated
        SOPName: data.SOPName,
        Description: data.Description || '',
        Status: data.Status,
        VersionEffectiveDate: data.VersionEffectiveDate,
        // Set a flag to indicate this is an edit operation to bypass uniqueness check
        is_edit_mode: true
      };
      
      console.log('Updating SOP payload:', payload);
      const response = await apiClient.put(`/sops/${id}/`, payload);
      console.log('SOP update response data:', response.data);
      return response.data;
    } catch (error) {
      console.error(`Error updating SOP ${id}:`, error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  },

  // Delete an SOP
  deleteSOP: async (id: number): Promise<void> => {
    try {
      await apiClient.delete(`/sops/${id}/`);
    } catch (error) {
      console.error(`Error deleting SOP ${id}:`, error);
      throw error;
    }
  },

  // Activate an SOP version
  activateSOP: async (id: number): Promise<void> => {
    try {
      await apiClient.post(`/sops/${id}/activate/`, {});
    } catch (error) {
      console.error(`Error activating SOP ${id}:`, error);
      throw error;
    }
  },

  // SOP Steps API Methods
  
  // Get steps for a specific SOP
  getStepsBySOP: async (sopId: number, page: number = 1, pageSize: number = 10): Promise<SOPStepListResponse> => {
    try {
      const params = {
        page,
        page_size: pageSize
      };
      const response = await apiClient.get(`/sops/${sopId}/steps/`, { params });
      return response.data;
    } catch (error) {
      console.error(`Error fetching steps for SOP ${sopId}:`, error);
      throw error;
    }
  },

  // Get a specific step by ID
  getStepById: async (stepId: number): Promise<SOPStep> => {
    try {
      const response = await apiClient.get(`/steps/${stepId}/`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching step ${stepId}:`, error);
      throw error;
    }
  },

  // Create a new step for a SOP
  createStep: async (sopId: number, data: SOPStepFormData): Promise<SOPStep> => {
    try {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('StepName', data.StepName);
      formData.append('Comments', data.Comments);
      formData.append('Prerequisites', data.Prerequisites);
      formData.append('Postrequisites', data.Postrequisites);
      formData.append('Duration', data.Duration.toString());
      
      // Always include the SOPId_id field when creating a step
      formData.append('SOPId_id', sopId.toString());
      
      if (data.URL) {
        formData.append('URL', data.URL);
      }
      
      if (data.document) {
        formData.append('document', data.document);
      }
      
      const response = await apiClient.post(`/sops/${sopId}/steps/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error creating step for SOP ${sopId}:`, error);
      throw error;
    }
  },

  // Update an existing step
  updateStep: async (stepId: number, data: SOPStepFormData, preserveVersion: boolean = true): Promise<SOPStep> => {
    try {
      // First, ensure we have the SOPId by fetching the step if needed
      let sopId = data.SOPId;
      
      if (!sopId) {
        // If SOPId is not provided, fetch the step to get its SOPId
        console.log('SOPId not provided in update data, fetching from step');
        try {
          const response = await apiClient.get(`/steps/${stepId}/`);
          if (response.data && response.data.SOPId) {
            sopId = response.data.SOPId;
          } else {
            throw new Error('Could not determine SOPId for step update');
          }
        } catch (error) {
          console.error('Error fetching step SOPId:', error);
          throw new Error('Failed to get SOPId for step update');
        }
      }
      
      // Now create the FormData with the SOPId included
      const formData = new FormData();
      formData.append('StepName', data.StepName);
      formData.append('Comments', data.Comments);
      formData.append('Prerequisites', data.Prerequisites);
      formData.append('Postrequisites', data.Postrequisites);
      formData.append('Duration', data.Duration.toString());
      
      // Include both SOPId and SOPId_id fields
      formData.append('SOPId', sopId.toString());
      formData.append('SOPId_id', sopId.toString());
      
      // Add preserveVersion flag to indicate whether to increment version or not
      formData.append('preserve_version', preserveVersion.toString());
      
      if (data.URL) {
        formData.append('URL', data.URL);
      }
      
      if (data.document) {
        formData.append('document', data.document);
      }
      
      const response = await apiClient.put(`/steps/${stepId}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`Error updating step ${stepId}:`, error);
      throw error;
    }
  },

  // Delete a step
  deleteStep: async (stepId: number): Promise<void> => {
    try {
      await apiClient.delete(`/steps/${stepId}/`);
    } catch (error) {
      console.error(`Error deleting step ${stepId}:`, error);
      throw error;
    }
  },

  // Get URL for step document (for reference only - not for direct use)
  getStepDocumentUrl: (stepId: number): string => {
    return `${apiClient.defaults.baseURL}/steps/${stepId}/download/`;
  },

  // Download a step document with authentication
  downloadStepDocument: async (stepId: number): Promise<Blob> => {
    try {
      const response = await apiClient.get(`/steps/${stepId}/download/`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error(`Error downloading document for step ${stepId}:`, error);
      throw error;
    }
  },
  
  // Reorder steps for a SOP
  reorderSteps: async (sopId: number, steps: { StepId: number; Sequence: number }[]): Promise<void> => {
    try {
      await apiClient.post(`/sops/${sopId}/steps/reorder/`, { steps });
    } catch (error) {
      console.error(`Error reordering steps for SOP ${sopId}:`, error);
      throw error;
    }
  }
};

export default sopApi;
