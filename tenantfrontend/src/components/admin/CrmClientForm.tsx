"use client";
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Grid
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { getAuthHeader } from '../../utils/authUtils';

interface CrmClientFormProps {
  clientId?: number;
  isEdit?: boolean;
}

interface FormData {
  client_name: string;
  contact_person_email: string;
}

const CrmClientForm: React.FC<CrmClientFormProps> = ({ clientId, isEdit = false }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(isEdit);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    client_name: '',
    contact_person_email: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Fetch client details if in edit mode
  useEffect(() => {
    if (isEdit && clientId) {
      const fetchClientDetails = async () => {
        try {
          setLoading(true);
          const authHeader = getAuthHeader();
          
          const response = await fetch(`http://localhost:8000/platform-admin/api/crm-clients/${clientId}/`, {
            headers: {
              ...authHeader,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            throw new Error('Failed to fetch client details');
          }
          
          const clientData = await response.json();
          setFormData({
            client_name: clientData.client_name || '',
            contact_person_email: clientData.contact_person_email || ''
          });
          setError(null);
        } catch (err: any) {
          console.error('Failed to fetch client details:', err);
          setError(err.message || 'Failed to fetch client details');
        } finally {
          setLoading(false);
        }
      };

      fetchClientDetails();
    }
  }, [isEdit, clientId]);

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.client_name.trim()) {
      errors.client_name = 'Client name is required';
    }
    if (!formData.contact_person_email.trim()) {
      errors.contact_person_email = 'Contact email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.contact_person_email)) {
      errors.contact_person_email = 'Invalid email format';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setProcessing(true);
      setError(null);
      
      // Log the form data being sent
      console.log('Submitting form data:', formData);
      
      const authHeader = getAuthHeader();
      
      const url = isEdit 
        ? `http://localhost:8000/platform-admin/api/crmclients/${clientId}/` 
        : 'http://localhost:8000/platform-admin/api/crmclients/';
      
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to ${isEdit ? 'update' : 'create'} client`);
      }
      
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/platform-admin/crmclients');
      }, 1500);
    } catch (err: any) {
      console.error(`Failed to ${isEdit ? 'update' : 'create'} client:`, err);
      
      // Try to extract more detailed error information
      let errorMessage = err.message || `Failed to ${isEdit ? 'update' : 'create'} client`;
      
      // Check if the error message contains a JSON string
      try {
        if (typeof errorMessage === 'string' && errorMessage.includes('{')) {
          const jsonStart = errorMessage.indexOf('{');
          const jsonPart = errorMessage.substring(jsonStart);
          const errorData = JSON.parse(jsonPart);
          
          // Format validation errors if present
          if (errorData.errors) {
            errorMessage = Object.entries(errorData.errors)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('\n');
          }
        }
      } catch (parseErr) {
        console.error('Error parsing error message:', parseErr);
      }
      
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setProcessing(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    router.push('/platform-admin/crmclients');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" component="h2" gutterBottom>
        {isEdit ? 'Edit CRM Client' : 'Create New CRM Client'}
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Client successfully {isEdit ? 'updated' : 'created'}!
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              label="Client Name"
              name="client_name"
              value={formData.client_name}
              onChange={handleInputChange}
              fullWidth
              required
              error={!!formErrors.client_name}
              helperText={formErrors.client_name}
              disabled={processing}
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              label="Contact Email"
              name="contact_person_email"
              type="email"
              value={formData.contact_person_email}
              onChange={handleInputChange}
              fullWidth
              required
              error={!!formErrors.contact_person_email}
              helperText={formErrors.contact_person_email}
              disabled={processing}
            />
          </Grid>
          
          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={processing}
            >
              {processing ? <CircularProgress size={24} /> : (isEdit ? 'Update Client' : 'Create Client')}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default CrmClientForm;
