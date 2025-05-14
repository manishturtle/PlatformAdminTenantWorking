import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  FormHelperText,
  IconButton
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { useRouter } from 'next/router';
import { SOPStep, SOPStepFormData, SOP } from '../../types/sop';
import { sopApi } from '@/services/api';

interface AddEditStepScreenProps {
  sopId?: number;
  stepId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const AddEditStepScreen: React.FC<AddEditStepScreenProps> = ({
  sopId,
  stepId,
  onSuccess,
  onCancel
}) => {
  const router = useRouter();
  const isEditMode = !!stepId;
  
  // State for SOP details (needed for breadcrumb and title)
  const [sop, setSOP] = useState<SOP | null>(null);
  
  // Default form state
  const defaultFormState: SOPStepFormData = {
    Sequence: 0,
    StepName: '',
    Comments: '',
    Prerequisites: '',
    Postrequisites: '',
    Duration: 1,
    URL: ''
  };

  // State for form data
  const [formData, setFormData] = useState<SOPStepFormData>(defaultFormState);
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);
  
  // State for form validation
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // State for API operations
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Reset form to default state
  const resetForm = () => {
    setFormData(defaultFormState);
    setSelectedFile(null);
    setCurrentFileName(null);
    setFormErrors({});
  };

  // Handle form field changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      // Clear error for the field if it exists
      if (formErrors[name]) {
        setFormErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.StepName.trim()) {
      errors.StepName = 'Step name is required';
    }
    
    if (formData.Duration < 1) {
      errors.Duration = 'Duration must be at least 1 minute';
    }
    
    if (formData.URL && !isValidURL(formData.URL)) {
      errors.URL = 'Please enter a valid URL';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if URL is valid
  const isValidURL = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (isEditMode && stepId) {
        await sopApi.updateStep(stepId, formData);
        setNotification({ message: 'Step updated successfully', type: 'success' });
      } else if (sopId) {
        await sopApi.createStep(sopId, formData);
        setNotification({ message: 'Step created successfully', type: 'success' });
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving step:', err);
      setError('Failed to save step. Please try again.');
      setNotification({ message: 'Failed to save step', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel button
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };

  // Load SOP details
  useEffect(() => {
    const loadSOP = async () => {
      if (!sopId) return;
      
      try {
        const sopData = await sopApi.getSOP(sopId);
        setSOP(sopData);
      } catch (err) {
        console.error('Error loading SOP:', err);
        setError('Failed to load SOP details');
      }
    };
    
    loadSOP();
  }, [sopId]);

  // Load step data if in edit mode
  useEffect(() => {
    const loadStep = async () => {
      if (!stepId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const step = await sopApi.getStepById(stepId);
        
        setFormData({
          StepName: step.StepName,
          Comments: step.Comments || '',
          Prerequisites: step.Prerequisites || '',
          Postrequisites: step.Postrequisites || '',
          Duration: step.Duration,
          URL: step.URL || '',
          Sequence: step.Sequence
        });
        
        if (step.OriginalFileName) {
          setCurrentFileName(step.OriginalFileName);
        }
        
        // If step has a different SOP ID than provided, load that SOP
        if (sopId !== step.SOPId && step.SOPId) {
          const stepSop = await sopApi.getSOP(step.SOPId);
          setSOP(stepSop);
        }
      } catch (err) {
        console.error('Error loading step:', err);
        setError('Failed to load step details');
      } finally {
        setLoading(false);
      }
    };

    loadStep();
  }, [stepId, sopId]);

  return (
    <Box>
      <Paper elevation={1} sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h5" gutterBottom>
                {isEditMode ? 'Edit Step' : 'Add New Step'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ flex: 2 }}>
                <TextField
                  required
                  fullWidth
                  id="StepName"
                  name="StepName"
                  label="Step Name"
                  value={formData.StepName}
                  onChange={handleChange}
                  error={!!formErrors.StepName}
                  helperText={formErrors.StepName}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                id="Comments"
                name="Comments"
                label="Comments"
                value={formData.Comments}
                onChange={handleChange}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                id="Prerequisites"
                name="Prerequisites"
                label="Prerequisites"
                value={formData.Prerequisites}
                onChange={handleChange}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                id="Postrequisites"
                name="Postrequisites"
                label="Postrequisites"
                value={formData.Postrequisites}
                onChange={handleChange}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Box sx={{ flex: 2 }}>
                <TextField
                  fullWidth
                  id="URL"
                  name="URL"
                  label="URL"
                  value={formData.URL}
                  onChange={handleChange}
                  error={!!formErrors.URL}
                  helperText={formErrors.URL}
                />
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <TextField
                  required
                  fullWidth
                  id="Duration"
                  name="Duration"
                  label="Duration (minutes)"
                  type="number"
                  value={formData.Duration}
                  onChange={handleChange}
                  error={!!formErrors.Duration}
                  helperText={formErrors.Duration}
                  InputProps={{ inputProps: { min: 1 } }}
                />
              </Box>
            </Box>
            
            <Box>
              <Box sx={{ border: '1px dashed #ccc', p: 3, borderRadius: 1 }}>
                <input
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                  id="document-upload"
                  type="file"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="document-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                  >
                    {selectedFile ? 'Change Document' : 'Upload Document'}
                  </Button>
                </label>
                
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  {selectedFile ? (
                    <Typography variant="body2">
                      Selected file: <strong>{selectedFile.name}</strong>
                    </Typography>
                  ) : currentFileName ? (
                    <Typography variant="body2">
                      Current document: <strong>{currentFileName}</strong>
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No document selected
                    </Typography>
                  )}
                  <FormHelperText>
                    The file will be stored as <strong>{formData.StepName.replace(/ /g, '_')}.extension</strong> in the SOP folder
                  </FormHelperText>
                </Box>
              </Box>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} /> : undefined}
              >
                {submitting ? 'Saving...' : 'Save Step'}
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
      
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {notification ? (
          <Alert onClose={handleCloseNotification} severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

export default AddEditStepScreen;
