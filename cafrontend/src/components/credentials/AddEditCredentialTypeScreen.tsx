import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Snackbar,
  Alert,
  TextField,
  Typography
} from '@mui/material';
import { useRouter } from 'next/router';
import { CredentialTypeFormData } from '../../types/credential';
import { credentialTypeApi } from '../../services/api';

interface CredentialType {
  id?: number;
  CredentialTypeName: string;
  Status: string;
}

interface AddEditCredentialTypeScreenProps {
  credentialTypeId?: number;
}

const AddEditCredentialTypeScreen: React.FC<AddEditCredentialTypeScreenProps> = ({ credentialTypeId }) => {
  const router = useRouter();
  const isEditMode = Boolean(credentialTypeId);
  
  const [formData, setFormData] = useState<CredentialTypeFormData>({
    CredentialTypeName: '',
    Status: 'Active'
  });
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch credential type data if in edit mode
  useEffect(() => {
    if (isEditMode && credentialTypeId) {
      fetchCredentialType(credentialTypeId);
    }
  }, [isEditMode, credentialTypeId]);

  // Fetch credential type data
  const fetchCredentialType = async (id: number) => {
    try {
      setLoading(true);
      const response = await credentialTypeApi.getCredentialTypeById(id);
      setFormData({
        CredentialTypeName: response.CredentialTypeName,
        Status: response.Status
      });
    } catch (err) {
      setError('Failed to fetch credential type data');
    } finally {
      setLoading(false);
    }
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.CredentialTypeName.trim()) {
      newErrors.CredentialTypeName = 'Credential Type Name is required';
    }
    
    setError(newErrors.CredentialTypeName || null);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      if (isEditMode && credentialTypeId) {
        await credentialTypeApi.updateCredentialType(credentialTypeId, formData);
        setSnackbar({
          open: true,
          message: 'Credential Type updated successfully!',
          severity: 'success'
        });
      } else {
        await credentialTypeApi.createCredentialType(formData);
        setSnackbar({
          open: true,
          message: 'Credential Type created successfully!',
          severity: 'success'
        });
      }
      router.push('/credential-types');
    } catch (err) {
      setError('Failed to save credential type');
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    router.push('/credential-types');
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditMode ? 'Edit Credential Type' : 'Add New Credential Type'}
        </Typography>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Credential Type Name"
                  name="CredentialTypeName"
                  value={formData.CredentialTypeName}
                  onChange={handleChange}
                  error={Boolean(error)}
                  helperText={error}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <Typography variant="subtitle1" gutterBottom>
                    Status
                  </Typography>
                  <RadioGroup
                    row
                    name="Status"
                    value={formData.Status}
                    onChange={handleChange}
                  >
                    <FormControlLabel value="Active" control={<Radio />} label="Active" />
                    <FormControlLabel value="Inactive" control={<Radio />} label="Inactive" />
                  </RadioGroup>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleCancel}
                  sx={{ mr: 2 }}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={saving}
                  startIcon={saving && <CircularProgress size={20} color="inherit" />}
                >
                  {saving ? 'Saving...' : isEditMode ? 'Update' : 'Create'}
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AddEditCredentialTypeScreen;
