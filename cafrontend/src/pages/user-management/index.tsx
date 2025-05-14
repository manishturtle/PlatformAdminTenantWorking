import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Stack,
  Button,
  Chip,
  Checkbox,
  ListItemText,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import axios from 'axios';

// Styled component for status chip
const StatusChip = styled(Chip)(({ theme, status }: { theme: any, status: 'Active' | 'Inactive' }) => ({
  backgroundColor: status === 'Active' ? '#2E7D32' : '#D32F2F',
  color: status === 'Active' ? '#fff' : theme.palette.text.primary,
  fontWeight: 500,
  borderRadius: '16px',
  padding: '0 12px',
  '& .MuiChip-label': {
    padding: '4px 8px',
  },
}));

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface UserRole {
  id: number;
  user: number;
  role: number;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      await fetchUsers();
      await fetchRoles();
      await fetchUserRoles();
    };
  
    fetchData();
  }, []);


  const getAppIdFromLocalStorage = (): number | null => {
    const appIdString = localStorage.getItem('app_id');
    if (!appIdString) return null;
  
    const appId = parseInt(appIdString, 10);
    return isNaN(appId) ? null : appId;
  };

  

  const fetchUsers = async () => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.get('http://localhost:8020/api/management/tenant-users/',{
        params: { app_id },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setUsers(response.data.results);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.get('http://localhost:8020/api/management/roles/',{
        params: { app_id },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setRoles(response.data.results);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchUserRoles = async () => {
    try {
      const app_id = getAppIdFromLocalStorage();
      if (!app_id) {
        throw new Error('App ID not found in localStorage');
      }
      const response = await axios.get('http://localhost:8020/api/management/user-role-assignments/',{
        params: { app_id },
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      setUserRoles(response.data.results);
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const handleEditRoles = (user: User) => {
    setSelectedUser(user);
    const currentRoles = userRoles
      .filter(ur => ur.user === user.id)
      .map(ur => ur.role);
    setSelectedRoles(currentRoles);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedUser(null);
    setSelectedRoles([]);
  };

  const handleRoleChange = (event: any) => {
    const value = event.target.value as number[];
    setSelectedRoles(value);
  };

  const handleSubmitRoles = async () => {
    if (selectedUser) {
      try {
        const app_id = getAppIdFromLocalStorage();
        if (!app_id) {
          throw new Error('App ID not found in localStorage');
        }
        // Get current role assignments for the user
        const currentAssignments = userRoles.filter(ur => ur.user === selectedUser.id);
        const currentRoleIds = currentAssignments.map(ur => ur.role);
        
        // Determine which roles to add and which to remove
        const rolesToAdd = selectedRoles.filter(roleId => !currentRoleIds.includes(roleId));
        const assignmentsToRemove = currentAssignments.filter(ur => !selectedRoles.includes(ur.role));

        // Remove unselected roles
        await Promise.all(
          assignmentsToRemove.map(ur =>
            axios.delete(`http://localhost:8020/api/management/user-role-assignments/${ur.id}/`, {
              params: { app_id }, 
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            })
          )
        );

        // Add new roles
        await Promise.all(
          rolesToAdd.map(roleId =>
            axios.post('http://localhost:8020/api/management/user-role-assignments/', {
              user: selectedUser.id,
              role: roleId,
            }, 
            {
              params: { app_id }, 
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
              },
            })
          )
        );

        handleCloseDialog();
        fetchUserRoles();
      } catch (error) {
        console.error('Error updating roles:', error);
      }
    }
  };

  const getUserRoles = (userId: number) => {
    return userRoles
      .filter(ur => ur.user === userId)
      .map(ur => {
        const role = roles.find(r => r.id === ur.role);
        return role;
      })
      .filter(role => role !== undefined) as Role[];
  };

  const getFullName = (user: User) => {
    return `${user.first_name} ${user.last_name}`.trim() || 'N/A';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Current Roles</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
            users.map((user) => (
              
              <TableRow key={user.id}>
                <TableCell>{getFullName(user)}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <StatusChip
                    label={user.is_active ? 'Active' : 'Inactive'}
                    status={user.is_active ? 'Active' : 'Inactive'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {getUserRoles(user.id).map((role) => (
                      <Chip
                        key={role.id}
                        label={role.name}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Stack>
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => handleEditRoles(user)}
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Manage User Roles</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                User: {getFullName(selectedUser)}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Roles</InputLabel>
                <Select
                  multiple
                  value={selectedRoles}
                  onChange={handleRoleChange}
                  label="Roles"
                  renderValue={(selected) => (
                    <Stack direction="row" spacing={0.5} flexWrap="wrap">
                      {selected.map((roleId) => {
                        const role = roles.find(r => r.id === roleId);
                        return role ? (
                          <Chip
                            key={role.id}
                            label={role.name}
                            size="small"
                            sx={{ m: 0.5 }}
                          />
                        ) : null;
                      })}
                    </Stack>
                  )}
                >
                  {roles.map((role) => (
                    <MenuItem key={role.id} value={role.id}>
                      <Checkbox checked={selectedRoles.includes(role.id)} />
                      <ListItemText primary={role.name} secondary={role.description} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmitRoles}
            color="primary"
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;