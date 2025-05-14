import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import { useRouter } from 'next/router';
import { Process, ProcessFormData, ProcessAudience, ProcessStatus } from '../../types/process';
import { processApi, serviceCategoryApi } from '../../services/api';
import { sopApi } from '../../services/api/sopApi';

interface AddEditProcessScreenProps {
  processId?: number; // Optional - if provided, we're editing an existing process
  onSuccess?: () => void; // Optional callback for when save is successful
  onCancel?: () => void; // Optional callback for when cancel is clicked
}

const AddEditProcessScreen: React.FC<AddEditProcessScreenProps> = ({
  processId,
  onSuccess,
  onCancel
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const isEditMode = !!processId;

  const [formData, setFormData] = useState<ProcessFormData>({
    ProcessName: '',
    Description: '',
    ProcessAudience: 'Individual',
    Status: 'Active'
  });
  
  // State for activation confirmation dialog
  const [showActivationDialog, setShowActivationDialog] = useState(false);
  const [processPendingActivation, setProcessPendingActivation] = useState<{
    id: number;
    data: ProcessFormData;
  } | null>(null);

  // Fetch process data if in edit mode
  useEffect(() => {
    if (isEditMode && processId) {
      fetchProcess(processId);
    }
  }, [processId, isEditMode]);

  const fetchProcess = async (id: number) => {
    setLoadingProcess(true);
    setError(null);
    try {
      const process = await processApi.getProcessById(id);
      setFormData({
        ProcessName: process.ProcessName,
        Description: process.Description || '',
        ProcessAudience: process.ProcessAudience,
        Status: process.Status
      });
    } catch (err: any) {
      console.error('Error fetching process:', err);
      setError('Failed to load process data. Please try again.');
    } finally {
      setLoadingProcess(false);
    }
  };

  const handleTextFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field when user types
    if (validationErrors[name as keyof ProcessFormData]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name as keyof ProcessFormData];
        return newErrors;
      });
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const name = e.target.name as keyof ProcessFormData;
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field when user changes selection
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.ProcessName.trim()) {
      errors.ProcessName = 'Process name is required';
    }

    // Process name validation
    if (formData.ProcessName.trim().length > 255) {
      errors.ProcessName = 'Process name cannot exceed 255 characters';
    }

    // Description validation (optional field)
    if (formData.Description && formData.Description.length > 1000) {
      errors.Description = 'Description cannot exceed 1000 characters';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to update related SOPs to inactive
  const updateRelatedSOPsToInactive = async (processId: number) => {
    try {
      // Get all SOPs for this process
      const sopsResponse = await sopApi.getSOPsByProcess(processId);
      const sops = sopsResponse.results;
      
      let updatedCount = 0;
      // Update each SOP to inactive
      for (const sop of sops) {
        if (sop.Status === 'Active') {
          // Only send the required fields to avoid 400 errors
          await sopApi.updateSOP(sop.SOPId, {
            SOPName: sop.SOPName,
            Description: sop.Description || '',
            VersionEffectiveDate: sop.VersionEffectiveDate,
            Status: 'Inactive',
            ProcessId: sop.ProcessId,
            Version: sop.Version,
            is_edit_mode: true,
            original_version: sop.Version // Include original version for uniqueness check bypass
          });
          console.log(`Updated SOP ${sop.SOPName} (ID: ${sop.SOPId}) to Inactive`);
          updatedCount++;
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating related SOPs:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  };
  
  // Helper function to update related SOPs to active
  const updateRelatedSOPsToActive = async (processId: number) => {
    try {
      // Get all SOPs for this process
      const sopsResponse = await sopApi.getSOPsByProcess(processId);
      const sops = sopsResponse.results;
      
      let updatedCount = 0;
      // Update each SOP to active
      for (const sop of sops) {
        if (sop.Status === 'Inactive') {
          // Only send the required fields to avoid 400 errors
          await sopApi.updateSOP(sop.SOPId, {
            SOPName: sop.SOPName,
            Description: sop.Description || '',
            VersionEffectiveDate: sop.VersionEffectiveDate,
            Status: 'Active',
            ProcessId: sop.ProcessId,
            Version: sop.Version,
            is_edit_mode: true,
            original_version: sop.Version // Include original version for uniqueness check bypass
          });
          console.log(`Updated SOP ${sop.SOPName} (ID: ${sop.SOPId}) to Active`);
          updatedCount++;
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating related SOPs:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  };
  
  // Helper function to update related Service Categories to inactive
  const updateRelatedServiceCategoriesToInactive = async (processId: number) => {
    try {
      // Get all Service Categories for this process
      // First we need to get all categories
      const categoriesResponse = await serviceCategoryApi.getServiceCategories();
      const categories = categoriesResponse.results.filter(cat => 
        cat.sop_details && 
        cat.sop_details.ProcessId === processId
      );
      
      let updatedCount = 0;
      // Update each Service Category to inactive
      for (const category of categories) {
        if (category.status === 'active') {
          await serviceCategoryApi.updateServiceCategory(category.servicecategoryid, {
            servicecategoryname: category.servicecategoryname,
            sopid: category.sopid,
            status: 'inactive'
          });
          console.log(`Updated Service Category ${category.servicecategoryname} (ID: ${category.servicecategoryid}) to inactive`);
          updatedCount++;
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating related Service Categories:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  };
  
  // Helper function to update related Service Categories to active
  const updateRelatedServiceCategoriesToActive = async (processId: number) => {
    try {
      // Get all Service Categories for this process
      // First we need to get all SOPs for this process to find related categories
      const sopsResponse = await sopApi.getSOPsByProcess(processId);
      const sops = sopsResponse.results;
      const sopIds = sops.map(sop => sop.SOPId);
      
      // Then get all categories
      const categoriesResponse = await serviceCategoryApi.getServiceCategories();
      const categories = categoriesResponse.results.filter(cat => 
        cat.sopid && sopIds.includes(cat.sopid)
      );
      
      let updatedCount = 0;
      // Update each Service Category to active
      for (const category of categories) {
        if (category.status === 'inactive') {
          await serviceCategoryApi.updateServiceCategory(category.servicecategoryid, {
            servicecategoryname: category.servicecategoryname,
            sopid: category.sopid,
            status: 'active'
          });
          console.log(`Updated Service Category ${category.servicecategoryname} (ID: ${category.servicecategoryid}) to active`);
          updatedCount++;
        }
      }
      
      return updatedCount;
    } catch (error) {
      console.error('Error updating related Service Categories:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isEditMode && processId) {
        // Check if status is being changed to Inactive
        const currentProcess = await processApi.getProcessById(processId);
        const isChangingToInactive = currentProcess.Status === 'Active' && formData.Status === 'Inactive';
        const isChangingToActive = currentProcess.Status === 'Inactive' && formData.Status === 'Active';
        
        // If status is changed to Active, show confirmation dialog
        if (isChangingToActive) {
          setProcessPendingActivation({
            id: processId,
            data: formData
          });
          setShowActivationDialog(true);
          setLoading(false);
          return; // Stop here and wait for dialog response
        }
        
        // Update existing process
        await processApi.updateProcess(processId, formData);
        
        // If status is changed to Inactive, update related entities
        if (isChangingToInactive) {
          let updatedSOPs = 0;
          let updatedCategories = 0;
          
          try {
            // Update related SOPs
            updatedSOPs = await updateRelatedSOPsToInactive(processId);
            
            // Update related Service Categories
            updatedCategories = await updateRelatedServiceCategoriesToInactive(processId);
            
            console.log(`Process set to Inactive. Updated ${updatedSOPs} SOPs and ${updatedCategories} Service Categories to Inactive.`);
          } catch (cascadeError) {
            console.error('Error during cascade update:', cascadeError);
            // We don't throw here to allow the process update to succeed even if cascade updates fail
          }
        }
      } else {
        // Create new process
        await processApi.createProcess(formData);
      }

      // Call success callback or redirect
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/configuration');
      }
    } catch (err: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} process:`, err);

      // Handle validation errors from the backend
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'object') {
          setValidationErrors(err.response.data);
        } else {
          setError(err.response.data.detail || `Failed to ${isEditMode ? 'update' : 'create'} process`);
        }
      } else {
        setError(err.message || `An error occurred while ${isEditMode ? 'updating' : 'creating'} the process`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push('/configuration');
    }
  };

  if (loadingProcess) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Handle activation confirmation dialog response
  const handleActivationConfirm = async (activateRelated: boolean) => {
    if (!processPendingActivation) return;
    
    try {
      setLoading(true);
      setShowActivationDialog(false);
      
      const { id, data } = processPendingActivation;
      
      // Update the process to Active
      await processApi.updateProcess(id, data);
      
      // If user confirmed, activate related SOPs and Service Categories
      if (activateRelated) {
        let updatedSOPs = 0;
        let updatedCategories = 0;
        
        try {
          // Update related SOPs to Active
          updatedSOPs = await updateRelatedSOPsToActive(id);
          
          // Update related Service Categories to Active
          updatedCategories = await updateRelatedServiceCategoriesToActive(id);
          
          console.log(`Process set to Active. Updated ${updatedSOPs} SOPs and ${updatedCategories} Service Categories to Active.`);
        } catch (cascadeError) {
          console.error('Error during cascade activation:', cascadeError);
          // We don't throw here to allow the process update to succeed even if cascade updates fail
        }
      }
      
      // Call success callback or redirect
      if (onSuccess) {
        onSuccess();
      } else {
        router.push('/configuration');
      }
    } catch (err: any) {
      console.error('Error during process activation:', err);
      setError(err.response?.data?.detail || 'Failed to update process');
    } finally {
      setLoading(false);
      setProcessPendingActivation(null);
    }
  };

  // Handle activation dialog cancel
  const handleActivationCancel = () => {
    setShowActivationDialog(false);
    setProcessPendingActivation(null);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          {isEditMode ? 'Edit Process' : 'Add New Process'}
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              label="Process Name"
              name="ProcessName"
              value={formData.ProcessName}
              onChange={handleTextFieldChange}
              error={!!validationErrors.ProcessName}
              helperText={validationErrors.ProcessName}
              disabled={loading}
              required
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="Description"
              name="Description"
              value={formData.Description || ''}
              onChange={handleTextFieldChange}
              error={!!validationErrors.Description}
              helperText={validationErrors.Description}
              disabled={loading}
              multiline
              rows={4}
              sx={{ mb: 2 }}
            />
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="process-audience-label">Process Audience</InputLabel>
              <Select
                labelId="process-audience-label"
                id="process-audience"
                name="ProcessAudience"
                value={formData.ProcessAudience}
                onChange={handleSelectChange}
                disabled={loading}
                label="Process Audience"
              >
                <MenuItem value="Individual">Individual</MenuItem>
                <MenuItem value="Business">Business</MenuItem>
                <MenuItem value="Both">Both</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="status"
                name="Status"
                value={formData.Status}
                onChange={handleSelectChange}
                disabled={loading}
                label="Status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              startIcon={loading && <CircularProgress size={20} color="inherit" />}
            >
              {isEditMode ? 'Update' : 'Create'}
            </Button>
          </Box>
        </form>
      </Paper>
      
      {/* Activation Confirmation Dialog */}
      <Dialog
        open={showActivationDialog}
        onClose={handleActivationCancel}
        aria-labelledby="activation-dialog-title"
        aria-describedby="activation-dialog-description"
      >
        <DialogTitle id="activation-dialog-title">
          Activate Related Items
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="activation-dialog-description">
            Do you want to also activate all related SOPs and Service Categories?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleActivationCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={() => handleActivationConfirm(false)} color="primary">
            No, Just Activate Process
          </Button>
          <Button onClick={() => handleActivationConfirm(true)} color="primary" variant="contained" autoFocus>
            Yes, Activate All
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AddEditProcessScreen;
