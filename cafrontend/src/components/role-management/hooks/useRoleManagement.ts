import { useState, useCallback, useEffect } from 'react';
import { Role, ModulePermission, FieldPermission } from '../types/role.types';
import { roleManagementApi } from '../../../services/roleManagementApi';

interface UseRoleManagementProps {
  initialRoleId?: string;
  availableModules: string[];
}

export const useRoleManagement = ({
  initialRoleId,
  availableModules,
}: UseRoleManagementProps) => {
  const [role, setRole] = useState<Role>({
    name: '',
    status: 'active',
    description: '',
    modulePermissions: availableModules.map((module) => ({
      moduleName: module,
      create: false,
      read: false,
      update: false,
      delete: false,
      fieldPermissions: [],
    })),
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial role if ID is provided
  useEffect(() => {
    if (initialRoleId) {
      fetchRole(initialRoleId);
    }
  }, [initialRoleId]);

  const fetchRole = async (roleId: string) => {
    try {
      setLoading(true);
      const response = await roleManagementApi.getRole(roleId);
      setRole(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch role');
      console.error('Error fetching role:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateRoleName = useCallback((name: string) => {
    setRole((prev) => ({ ...prev, name }));
  }, []);

  const updateRoleStatus = useCallback((status: 'active' | 'inactive') => {
    setRole((prev) => ({ ...prev, status }));
  }, []);

  const updateRoleDescription = useCallback((description: string) => {
    setRole((prev) => ({ ...prev, description }));
  }, []);

  const updateModulePermission = useCallback(
    (moduleName: string, permission: keyof ModulePermission, value: boolean) => {
      setRole((prev) => ({
        ...prev,
        modulePermissions: prev.modulePermissions.map((mp) =>
          mp.moduleName === moduleName ? { ...mp, [permission]: value } : mp
        ),
      }));
    },
    []
  );

  const updateFieldPermission = useCallback(
    (moduleName: string, fieldName: string, permission: keyof FieldPermission, value: boolean) => {
      setRole((prev) => ({
        ...prev,
        modulePermissions: prev.modulePermissions.map((mp) =>
          mp.moduleName === moduleName
            ? {
                ...mp,
                fieldPermissions: mp.fieldPermissions.map((fp) =>
                  fp.fieldName === fieldName ? { ...fp, [permission]: value } : fp
                ),
              }
            : mp
        ),
      }));
    },
    []
  );

  const resetRole = useCallback(() => {
    setRole({
      name: '',
      status: 'active',
      description: '',
      modulePermissions: availableModules.map((module) => ({
        moduleName: module,
        create: false,
        read: false,
        update: false,
        delete: false,
        fieldPermissions: [],
      })),
    });
  }, [availableModules]);

  const saveRole = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (role.id) {
        // Update existing role
        const response = await roleManagementApi.updateRole(role.id, role);
        setRole(response.data);
        return { success: true, message: 'Role updated successfully' };
      } else {
        // Create new role
        const response = await roleManagementApi.createRole(role);
        setRole(response.data);
        return { success: true, message: 'Role created successfully' };
      }
    } catch (err) {
      const errorMessage = 'Failed to save role';
      setError(errorMessage);
      console.error('Error saving role:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    try {
      setLoading(true);
      setError(null);
      await roleManagementApi.deleteRole(roleId);
      resetRole();
      return { success: true, message: 'Role deleted successfully' };
    } catch (err) {
      const errorMessage = 'Failed to delete role';
      setError(errorMessage);
      console.error('Error deleting role:', err);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return {
    role,
    loading,
    error,
    updateRoleName,
    updateRoleStatus,
    updateRoleDescription,
    updateModulePermission,
    updateFieldPermission,
    resetRole,
    saveRole,
    deleteRole,
  };
};

export default useRoleManagement;
