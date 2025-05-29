import axios from "axios";
import { LineOfBusiness } from "@/types/lineOfBusiness";
import { getAuthToken } from "@/utils/auth";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://bedevcockpit.turtleit.in";
const BASE_URL = `${API_URL}/platform-admin/api/lines-of-business`;

// Helper function to get headers with auth token
const getHeaders = () => {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

// Get all lines of business
export const getLineOfBusinesses = async (): Promise<LineOfBusiness[]> => {
  try {
    const response = await axios.get(BASE_URL, { headers: getHeaders() });
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && typeof response.data === "object") {
      // Check if response has results property (common in DRF pagination)
      if (Array.isArray(response.data.results)) {
        return response.data.results;
      }
      // If it's an object but not paginated, it might be a single item
      // or another structure, log it for debugging
      console.log("API Response structure:", response.data);
      return [];
    }
    // Default to empty array if response format is unexpected
    return [];
  } catch (error) {
    console.error("Error fetching lines of business:", error);
    throw error;
  }
};

// Get active lines of business
export const getActiveLineOfBusinesses = async (): Promise<
  LineOfBusiness[]
> => {
  try {
    const response = await axios.get(`${BASE_URL}/active/`, {
      headers: getHeaders(),
    });
    // Handle different response formats
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data && typeof response.data === "object") {
      // Check if response has results property (common in DRF pagination)
      if (Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching active lines of business:", error);
    throw error;
  }
};

// Get a single line of business by ID
export const getLineOfBusinessById = async (
  id: number
): Promise<LineOfBusiness> => {
  try {
    const response = await axios.get(`${BASE_URL}/${id}/`, {
      headers: getHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching line of business with ID ${id}:`, error);
    throw error;
  }
};

// Create a new line of business
export const createLineOfBusiness = async (
  data: Partial<LineOfBusiness>
): Promise<LineOfBusiness> => {
  try {
    const response = await axios.post(BASE_URL + "/", data, {
      headers: getHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error("Error creating line of business:", error);
    throw error;
  }
};

// Update an existing line of business
export const updateLineOfBusiness = async (
  id: number,
  data: Partial<LineOfBusiness>
): Promise<LineOfBusiness> => {
  try {
    const response = await axios.put(`${BASE_URL}/${id}/`, data, {
      headers: getHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error(`Error updating line of business with ID ${id}:`, error);
    throw error;
  }
};

// Delete a line of business
export const deleteLineOfBusiness = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${BASE_URL}/${id}/`, { headers: getHeaders() });
  } catch (error) {
    console.error(`Error deleting line of business with ID ${id}:`, error);
    throw error;
  }
};
