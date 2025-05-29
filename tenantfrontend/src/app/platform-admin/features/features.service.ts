import axios from "axios";
import { getAuthHeader } from "../../../utils/authUtils";

const API_BASE_URL =
  "https://bedevcockpit.turtleit.in/api/platform-admin/subscription";

export interface Feature {
  id: number;
  name: string;
  key: string;
  description: string;
  application_name: string;
  application_slug: string;
  is_active: boolean;
  granual_settings: Record<string, any>;
}

export const featuresService = {
  async uploadFeatures(file: File, applicationName: string) {
    const formData = new FormData();
    formData.append("yaml_file", file);
    formData.append("application_name", applicationName);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/features/upload_yaml/`,
        formData,
        {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async getFeatures() {
    try {
      const response = await axios.get(`${API_BASE_URL}/features/`, {
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async getFeaturesByApplication(applicationName: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/features/`, {
        params: { application_name: applicationName },
        headers: getAuthHeader(),
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },
};
