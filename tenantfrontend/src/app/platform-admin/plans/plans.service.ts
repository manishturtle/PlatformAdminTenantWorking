import axios from "axios";
import { getAuthHeader } from "../../../utils/authUtils";

const API_BASE_URL =
  "https://bedevcockpit.turtleit.in/api/platform-admin/subscription";

export interface Plan {
  id?: number;
  name: string;
  description: string;
  status: "active" | "inactive" | "deprecated";
  price: number;
  valid_from: string;
  valid_until?: string;
  max_users: number;
  transaction_limit: number;
  api_call_limit: number;
  storage_limit: number;
  session_type: "concurrent" | "named";
  support_level: "basic" | "standard" | "premium";
  detailed_entitlements: Record<string, any>;
}

export const plansService = {
  async createPlan(planData: Plan) {
    try {
      const response = await axios.post(`${API_BASE_URL}/plans/`, planData, {
        headers: {
          ...getAuthHeader(),
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async getPlans() {
    try {
      const response = await axios.get(`${API_BASE_URL}/plans/`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  async getAvailableFeatures() {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/plans/available_features/`,
        {
          headers: {
            ...getAuthHeader(),
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },
};
