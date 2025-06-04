import { Role, RolesResponse } from "../types/role";
import { getAuthHeader } from "../utils/authUtils";

/**
 * Fetch all roles for the tenant
 * @param tenantSlug The tenant slug
 * @returns Promise with roles data
 */
export const fetchRoles = async (tenantSlug: string): Promise<Role[]> => {
  try {
    const response = await fetch(
      `http://localhost:8000/api/${tenantSlug}/tenant-admin/roles/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch roles: ${response.statusText}`);
    }

    // Parse the response as RolesResponse format
    const data: RolesResponse = await response.json();

    // Return the results array which contains the roles
    return data.results;
  } catch (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
};
