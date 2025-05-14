import React, { useState, useEffect } from 'react';
import { getAllModules } from '../../my_features';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface Role {
  name: string;
  description: string;
  status: 'active' | 'inactive';
  modulePermissions: ModulePermission[];
}

interface ModulePermission {
  moduleName: string;
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

interface RoleManagementProps {
  initialRole?: Role;
  onSave: (role: Role, modules: any[]) => void;
  onCancel: () => void;
}

const RoleManagement: React.FC<RoleManagementProps> = ({
  initialRole,
  onSave,
  onCancel,
}) => {
  const [modules, setModules] = useState<any[]>([]);
  const [role, setRole] = useState<Role>(initialRole || {
    name: '',
    description: '',
    status: 'active',
    modulePermissions: [],
  });

  useEffect(() => {
    const loadModules = async () => {
      const result = await getAllModules();
      if (result.success) {
        console.log('Loaded modules:', result.modules); // Debug log
        setModules(result.modules);
        // Initialize module permissions if not already set
        if (!initialRole) {
          setRole(prev => ({
            ...prev,
            modulePermissions: result.modules.map(module => ({
              moduleName: String(module.id), // Store numeric ID as string
              moduleKey: module.key, // Store key for reference
              create: false,
              read: false,
              update: false,
              delete: false,
            })),
          }));
        }
      }
    };
    loadModules();
  }, [initialRole]);

  const handleModulePermissionChange = (
    moduleId: string,
    permission: 'create' | 'read' | 'update' | 'delete',
    checked: boolean
  ) => {
    setRole(prev => ({
      ...prev,
      modulePermissions: prev.modulePermissions.map(mp =>
        mp.moduleName === moduleId ? { ...mp, [permission]: checked } : mp
      ),
    }));
  };

  const handleSave = () => {
    // Pass both role and modules to onSave
    onSave(role, modules);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Role Name"
            value={role.name}
            onChange={(e) => setRole({ ...role, name: e.target.value })}
          />
        </Grid>

        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={role.status}
              label="Status"
              onChange={(e) => setRole({ ...role, status: e.target.value as 'active' | 'inactive' })}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            value={role.description}
            onChange={(e) => setRole({ ...role, description: e.target.value })}
            multiline
            rows={4}
          />
        </Grid>

        <Grid item xs={12}>
          <Typography variant="h6" sx={{ mb: 2 }}>Module Access</Typography>
          
          <Grid container spacing={3}>
            {role.modulePermissions?.map((mp) => {
              const module = modules.find(m => String(m.id) === mp.moduleName);
              const moduleName = module?.name || module?.key || mp.moduleName;
              
              return (
                <Grid item xs={12} md={6} key={mp.moduleName}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h6">{moduleName}</Typography>
                      <IconButton 
                        size="small" 
                        color="primary"
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Box>

                    <FormGroup>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={mp.read}
                            onChange={(e) => handleModulePermissionChange(mp.moduleName, 'read', e.target.checked)}
                          />
                        }
                        label="View"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={mp.create}
                            onChange={(e) => handleModulePermissionChange(mp.moduleName, 'create', e.target.checked)}
                          />
                        }
                        label="Create"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={mp.update}
                            onChange={(e) => handleModulePermissionChange(mp.moduleName, 'update', e.target.checked)}
                          />
                        }
                        label="Update"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={mp.delete}
                            onChange={(e) => handleModulePermissionChange(mp.moduleName, 'delete', e.target.checked)}
                          />
                        }
                        label="Delete"
                      />
                    </FormGroup>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Grid>
      </Grid>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Role
        </Button>
      </Box>
    </Box>
  );
};

export default RoleManagement;
