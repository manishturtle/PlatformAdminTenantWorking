import React, { useEffect, useState } from 'react';
import { Box, Alert, Snackbar, CircularProgress } from '@mui/material';
import { Role } from './types/role.types';
import { roleManagementApi } from '../../services/roleManagementApi';
import RoleList from './RoleList';
import RoleManagement from './RoleManagement';

const RoleManagementPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [availableModules, setAvailableModules] = useState<string[]>([]);
  const [showRoleForm, setShowRoleForm] = useState(false);

  // Fetch roles and modules on component mount
  useEffect(() => {
    fetchRoles();
    fetchModules();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleManagementApi.getRoles();
      setRoles(response.data);
    } catch (err) {
      setError('Failed to fetch roles');
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async () => {
    try {
      const response = await roleManagementApi.getMonitoredResources();
      setAvailableModules(response.data.map((resource: any) => resource.identifier));
    } catch (err) {
      console.error('Error fetching modules:', err);
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setShowRoleForm(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    setShowRoleForm(true);
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      setLoading(true);
      await roleManagementApi.deleteRole(roleId);
      setSuccess('Role deleted successfully');
      fetchRoles(); // Refresh the list
    } catch (err) {
      setError('Failed to delete role');
      console.error('Error deleting role:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async (role: Role) => {
    try {
      setLoading(true);
      if (role.id) {
        await roleManagementApi.updateRole(role.id, role);
        setSuccess('Role updated successfully');
      } else {
        await roleManagementApi.createRole(role);
        setSuccess('Role created successfully');
      }
      fetchRoles(); // Refresh the list
      setShowRoleForm(false);
    } catch (err) {
      setError('Failed to save role');
      console.error('Error saving role:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForm = () => {
    setShowRoleForm(false);
    setSelectedRole(null);
  };

  const handleCloseAlert = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading && !roles.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {showRoleForm ? (
        <RoleManagement
          initialRole={selectedRole || undefined}
          modules={availableModules}
          onSave={handleSaveRole}
          onCancel={handleCloseForm}
        />
      ) : (
        <RoleList
          roles={roles}
          onEdit={handleEditRole}
          onDelete={handleDeleteRole}
          onCreateNew={handleCreateRole}
        />
      )}

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseAlert} severity="success">
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RoleManagementPage;
