import React, { useState, useEffect } from 'react';
import { Container, Alert, Snackbar, CircularProgress, Box } from '@mui/material';
import RoleManagement from '../../components/role-management/RoleManagement';
import RoleList from '../../components/role-management/RoleList';
import { Role } from '../../components/role-management/types/role.types';
import { roleManagementApi } from '../../services/roleManagementApi';

const RoleManagementPage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
    open: boolean;
  }>({
    message: '',
    type: 'success',
    open: false,
  });

  // Fetch roles on component mount
  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await roleManagementApi.getRoles();
      setRoles(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch roles');
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({
      message,
      type,
      open: true,
    });
  };

  const handleSaveRole = async (role: Role) => {
    try {
      setLoading(true);
      if (role.id) {
        // Update existing role
        const response = await roleManagementApi.updateRole(role.id, role);
        setRoles(prev => prev.map(r => r.id === role.id ? response.data : r));
        showNotification('Role updated successfully', 'success');
      } else {
        // Create new role
        const response = await roleManagementApi.createRole(role);
        setRoles(prev => [...prev, response.data]);
        showNotification('Role created successfully', 'success');
      }
      setShowCreateForm(false);
      setSelectedRole(undefined);
    } catch (err) {
      showNotification('Failed to save role', 'error');
      console.error('Error saving role:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = async (role: Role) => {
    try {
      setLoading(true);
      const response = await roleManagementApi.getRole(role.id!);
      setSelectedRole(response.data);
      setShowCreateForm(true);
      setError(null);
    } catch (err) {
      showNotification('Failed to fetch role details', 'error');
      console.error('Error fetching role details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      setLoading(true);
      await roleManagementApi.deleteRole(roleId);
      setRoles(prev => prev.filter(role => role.id !== roleId));
      showNotification('Role deleted successfully', 'success');
    } catch (err) {
      showNotification('Failed to delete role', 'error');
      console.error('Error deleting role:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && roles.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {showCreateForm ? (
        <RoleManagement
          initialRole={selectedRole}
          onSave={handleSaveRole}
          onCancel={() => {
            setShowCreateForm(false);
            setSelectedRole(undefined);
          }}
        />
      ) : (
        <RoleList
          roles={roles}
          onEdit={handleEditRole}
          onDelete={handleDeleteRole}
          onCreateNew={() => {
            setSelectedRole(undefined);
            setShowCreateForm(true);
          }}
        />
      )}

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setNotification(prev => ({ ...prev, open: false }))} 
          severity={notification.type}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RoleManagementPage;
