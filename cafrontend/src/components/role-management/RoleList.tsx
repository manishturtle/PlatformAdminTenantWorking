import React from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Role } from './types/role.types';
import { features_permissions } from '../../my_features';

interface RoleListProps {
  roles: Role[];
  onEdit: (role: Role) => void;
  onDelete: (roleId: string) => void;
  onCreateNew: () => void;
}

const RoleList: React.FC<RoleListProps> = ({ roles, onEdit, onDelete, onCreateNew }) => {
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return '-';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '-';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(dateObj);
  };

  const getStatusColor = (status: string): 'success' | 'error' | 'default' => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getModulesList = (role: Role) => {
    if (!role.modulePermissions?.length) return null;

    // Filter modules that have at least one permission enabled
    const activeModules = role.modulePermissions.filter(mp => 
      mp.create || mp.read || mp.update || mp.delete || 
      mp.fieldPermissions.some(fp => fp.read || fp.edit)
    );
    
    if (activeModules.length === 0) return null;

    return activeModules.map((mp) => {
      // Find the module name from the ID
      const moduleId = parseInt(mp.moduleName);
      
      const module = features_permissions?.modules?.find(m => m.id === moduleId);
      const displayName = module?.name || mp.moduleName;
      
      return (
        <Chip
          key={mp.moduleName}
          label={displayName}
          size="small"
          sx={{
            bgcolor: 'primary.50',
            color: 'primary.main',
            border: '1px solid',
            borderColor: 'primary.200',
            mr: 0.5,
            mb: 0.5
          }}
        />
      );
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Roles
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Manage user roles and permissions
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateNew}
          sx={{ textTransform: 'uppercase' }}
        >
          CREATE ROLE
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Role Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Users</TableCell>
              <TableCell>Modules</TableCell>
              <TableCell>Last Modified</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>{role.name}</TableCell>
                <TableCell>
                  <Chip
                    label={role.status || 'Active'}
                    color={getStatusColor(role.status || 'active')}
                    size="small"
                    sx={{
                      textTransform: 'capitalize',
                      minWidth: '80px',
                      justifyContent: 'center'
                    }}
                  />
                </TableCell>
                <TableCell>{role.users || 0}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {getModulesList(role)}
                  </Box>
                </TableCell>
                <TableCell>{formatDate(role.lastModified)}</TableCell>
                <TableCell align="right">
                  <IconButton
                    onClick={() => onEdit(role)}
                    size="small"
                    sx={{ color: 'primary.main' }}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => role.id && onDelete(role.id)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RoleList;
