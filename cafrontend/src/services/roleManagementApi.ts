import axios from 'axios';
import { Role } from '../components/role-management/types/role.types';

const API_BASE_URL = 'http://localhost:8020/api/management';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

interface ApiRole {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  module_permissions: Array<{
    module_id: string;
    can_create: boolean;
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
    field_permissions: {
      [key: string]: {
        read: boolean;
        edit: boolean;
      };
    };
  }>;
  created_at: string;
  updated_at: string;
}

const transformApiRole = (apiRole: ApiRole): Role => ({
  id: apiRole.id,
  name: apiRole.name,
  description: apiRole.description,
  status: apiRole.is_active ? 'active' : 'inactive',
  users: 0, // This field is not provided by the API anymore
  lastModified: new Date(apiRole.updated_at),
  modulePermissions: apiRole.module_permissions.map(mp => ({
    moduleName: String(mp.module_id), // Convert module_id to string
    create: mp.can_create,
    read: mp.can_read,
    update: mp.can_update,
    delete: mp.can_delete,
    fieldPermissions: Object.entries(mp.field_permissions || {}).map(([fieldName, perms]) => ({
      fieldName,
      read: perms.read,
      edit: perms.edit
    }))
  }))
});

const transformToApiRole = (role: Role, modules: any[]) => ({
  name: role.name,
  description: role.description,
  is_active: role.status === 'active',
  module_permissions: role.modulePermissions
    .filter(mp => mp.create || mp.read || mp.update || mp.delete) // Only include modules with at least one permission
    .map(mp => {
      // The moduleName is already the numeric ID as a string
      const moduleId = parseInt(mp.moduleName);
      
      if (isNaN(moduleId)) {
        console.error('Invalid module ID:', mp.moduleName);
        return null;
      }

      // Find the module name from the modules list
      const module = modules?.find(m => String(m.id) === mp.moduleName);
      const moduleName = module?.name || module?.key || '';

      return {
        module_id: moduleId,
        name: moduleName, // Include the module name
        can_create: mp.create,
        can_read: mp.read,
        can_update: mp.update,
        can_delete: mp.delete,
        field_permissions: mp.fieldPermissions?.reduce((acc, fp) => ({
          ...acc,
          [fp.fieldName]: {
            read: fp.read,
            edit: fp.edit
          }
        }), {}) || {}
      };
    }).filter(Boolean)
});



const getAppIdFromLocalStorage = (): number | null => {
  const appIdString = localStorage.getItem('app_id');
  if (!appIdString) return null;

  const appId = parseInt(appIdString, 10);
  return isNaN(appId) ? null : appId;
};


export const roleManagementApi = {
  // Get all roles
  // getRoles: async (): Promise<ApiResponse<Role[]>> => {
  //   try {
  //     const response = await axios.get<ApiRole[]>(`${API_BASE_URL}/roles/`);
  //     // console.log("response",response);
      
  //     return { data: response.data?.map(transformApiRole) };
  //   } catch (error) {
  //     throw error;
  //   }
  // },

  getRoles: async (): Promise<ApiResponse<Role[]>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.get(`${API_BASE_URL}/roles/`, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      const results = response.data?.results || [];
  
      return { data: results.map(transformApiRole) }; 
    } catch (error) {
      throw error;
    }
  },  

  

  // Get a single role by ID
  getRole: async (roleId: string): Promise<ApiResponse<Role>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.get<ApiRole>(`${API_BASE_URL}/roles/${roleId}/`, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return { data: transformApiRole(response.data) };
    } catch (error) {
      throw error;
    }
  },

  // Create a new role
  createRole: async (role: Omit<Role, 'id'>): Promise<ApiResponse<Role>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const apiRole = transformToApiRole(role as Role);
      const response = await axios.post<ApiRole>(`${API_BASE_URL}/roles/`, apiRole, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return { data: transformApiRole(response.data), message: 'Role created successfully' };
    } catch (error) {
      throw error;
    }
  },

  // Update an existing role
  updateRole: async (roleId: string, role: Role): Promise<ApiResponse<Role>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const apiRole = transformToApiRole(role);
      const response = await axios.put<ApiRole>(`${API_BASE_URL}/roles/${roleId}/`, apiRole, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return { data: transformApiRole(response.data), message: 'Role updated successfully' };
    } catch (error) {
      throw error;
    }
  },

  // Delete a role
  deleteRole: async (roleId: string): Promise<ApiResponse<void>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      await axios.delete(`${API_BASE_URL}/roles/${roleId}/`, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return { data: undefined, message: 'Role deleted successfully' };
    } catch (error) {
      throw error;
    }
  },

  // Get module permission sets
  getModulePermissionSets: async (): Promise<ApiResponse<any[]>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.get(`${API_BASE_URL}/module-permissions/`, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return { data: response.data };
    } catch (error) {
      throw error;
    }
  },

  // Get user role assignments
  getUserRoleAssignments: async (): Promise<ApiResponse<any[]>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.get(`${API_BASE_URL}/user-role-assignments/`, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return { data: response.data };
    } catch (error) {
      throw error;
    }
  },

  // Assign role to user
  assignRoleToUser: async (userId: string, roleId: string): Promise<ApiResponse<any>> => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.post(`${API_BASE_URL}/user-role-assignments/`, {
        user: userId,
        role: roleId
      }, {
        params: { app_id }, 
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      return { data: response.data, message: 'Role assigned successfully' };
    } catch (error) {
      throw error;
    }
  }
};
