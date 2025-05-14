import axiosInstance from './axiosInstance';

/**
 * Get a list of documents with optional filtering
 * @param params Filter and pagination parameters
 * @returns Promise with document list response
 */
const getDocuments = async (params = {}) => {
  try {
    const response = await axiosInstance.get('/documents/', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Upload a new document
 * @param formData FormData containing document details and file
 * @returns Promise with upload response
 */
const uploadDocument = async (formData: FormData) => {
  try {
    const response = await axiosInstance.post('/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Get a specific document by ID
 * @param documentId Document ID
 * @returns Promise with document details
 */
const getDocument = async (documentId: number) => {
  try {
    const response = await axiosInstance.get(`/documents/${documentId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Update a document
 * @param documentId Document ID
 * @param data Updated document data
 * @returns Promise with updated document
 */
const updateDocument = async (documentId: number, data: any) => {
  try {
    const response = await axiosInstance.patch(`/documents/${documentId}/`, data);
    return response.data;
  } catch (error) {
    console.error(`Error updating document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 * @param documentId Document ID
 * @returns Promise with deletion response
 */
const deleteDocument = async (documentId: number) => {
  try {
    const response = await axiosInstance.delete(`/documents/${documentId}/`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error);
    throw error;
  }
};

const documentApi = {
  getDocuments,
  uploadDocument,
  getDocument,
  updateDocument,
  deleteDocument
};

export default documentApi;
