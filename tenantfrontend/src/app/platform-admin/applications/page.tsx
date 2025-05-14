'use client';
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility,
  VisibilityOff,
  Close as CloseIcon
} from '@mui/icons-material';

interface Application {
  app_id: number;
  application_name: string;
  client_id: number;
  company_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  default_url?: string;
  secret_key?: string;
  endpoint_url?: string;
  app_description?: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [defaultUrl, setDefaultUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [appDescription, setAppDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:8000/platform-admin/api/applications/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      setApplications(data.results);
      setError('');
    } catch (err) {
      setError('Error fetching applications');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!newAppName.trim()) {
      newErrors.application_name = 'Application name is required';
    }

    if (!defaultUrl.trim()) {
      newErrors.app_default_url = 'Default URL is required';
    } else if (!defaultUrl.startsWith('http://') && !defaultUrl.startsWith('https://')) {
      newErrors.app_default_url = 'URL must start with http:// or https://';
    }

    if (!secretKey.trim()) {
      newErrors.app_secret_key = 'Secret key is required';
    } else if (secretKey.length < 6) {
      newErrors.app_secret_key = 'Secret key must be at least 6 characters long';
    }

    if (!endpointUrl.trim()) {
      newErrors.app_endpoint_route = 'Endpoint URL is required';
    } else if (!endpointUrl.startsWith('/')) {
      newErrors.app_endpoint_route = 'Endpoint must start with a slash (/)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch('http://localhost:8000/platform-admin/api/applications/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          application_name: newAppName,
          app_default_url: defaultUrl,
          app_secret_key: secretKey,
          app_endpoint_route: endpointUrl,
          description: appDescription,
        }),
      });

      if (response.ok) {
        // Refresh the applications list
        fetchApplications();
        // Reset form fields
        setNewAppName('');
        setDefaultUrl('');
        setSecretKey('');
        setEndpointUrl('');
        setAppDescription('');
        setErrors({});
        // Close the modal
        setOpenDialog(false);
      } else {
        const errorData = await response.json();
        const newErrors: { [key: string]: string } = {};
        
        // Handle backend validation errors
        Object.keys(errorData).forEach(key => {
          newErrors[key] = Array.isArray(errorData[key]) 
            ? errorData[key][0] 
            : errorData[key];
        });
        
        setErrors(newErrors);
      }
    } catch (error) {
      console.error('Error creating application:', error);
      setErrors({ general: 'Failed to create application. Please try again.' });
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h1">
          Applications
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Application
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.app_id}>
                <TableCell>{app.application_name}</TableCell>
                <TableCell>{app.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                <TableCell>{new Date(app.updated_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Application</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Application Name"
            value={newAppName}
            onChange={(e) => setNewAppName(e.target.value)}
            fullWidth
            helperText={errors.application_name || "Example: My Application"}
            error={!!errors.application_name}
          />
          <TextField
            label="Default URL"
            value={defaultUrl}
            onChange={(e) => setDefaultUrl(e.target.value)}
            fullWidth
            margin="normal"
            helperText={errors.app_default_url || "Base URL of the application (e.g., https://myapp.com)"}
            error={!!errors.app_default_url}
            autoComplete="off"
            type="url"
          />
          <TextField
            label="Secret Key"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            fullWidth
            margin="normal"
            helperText={errors.app_secret_key || "Secret key for API authentication (min 6 characters)"}
            error={!!errors.app_secret_key}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleTogglePassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <TextField
            margin="dense"
            label="Endpoint URL"
            fullWidth
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            helperText={errors.app_endpoint_route || "Enter the endpoint URL of your application (e.g., '/login')"}
            error={!!errors.app_endpoint_route}
          />

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            helperText={errors.description || "Enter a description for your application"}
            error={!!errors.description}
          />

          {errors.general && (
            <Typography color="error" sx={{ mt: 2 }}>
              {errors.general}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: '16px 24px' }}>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="secondary"
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={{ ml: 2 }}
          >
            Create Application
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
