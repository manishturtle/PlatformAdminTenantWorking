import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  CardHeader,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  Divider,
  Stack,
  FormHelperText,
  Container
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Grid as MuiGrid } from '@mui/material';

// Create a properly typed Grid component that accepts 'item' prop
interface ExtendedGridProps extends React.ComponentProps<typeof MuiGrid> {
  item?: boolean;
  container?: boolean;
  xs?: number | boolean;
  sm?: number | boolean;
  md?: number | boolean;
  lg?: number | boolean;
  xl?: number | boolean;
  spacing?: number | string;
}

const Grid = (props: ExtendedGridProps) => <MuiGrid {...props} />;
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Download as DownloadIcon,
  Link as LinkIcon,
  Save as SaveIcon,
  DragIndicator as DragIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  FileDownload as FileDownloadIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { SOPStep, SOPStepFormData, SOP } from '../../types/sop';
import { sopApi } from '@/services/api';

interface SOPStepsScreenProps {
  sopId: number;
  sopName?: string;
}

// Interface for editable step data
interface EditableStep extends SOPStep {
  isEditing: boolean;
  editData: {
    StepName: string;
    Comments: string;
    URL: string;
  };
  selectedFile: File | null;
  saving: boolean;
  errors: Record<string, string>;
}

// Interface for step reordering data
interface ReorderStepData {
  StepId: number;
  Sequence: number;
}

const SOPStepsScreen: React.FC<SOPStepsScreenProps> = ({ sopId, sopName }) => {
  // State for steps list with editing capabilities
  const [steps, setSteps] = useState<EditableStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for drag and drop
  const [isDragging, setIsDragging] = useState(false);
  const [draggedStep, setDraggedStep] = useState<number | null>(null);
  
  // State for details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedStep, setSelectedStep] = useState<SOPStep | null>(null);
  const [dialogEditMode, setDialogEditMode] = useState(false);
  const [dialogEditData, setDialogEditData] = useState<{
    StepName: string;
    Comments: string;
    Prerequisites: string;
    Postrequisites: string;
    Duration: number;
    URL: string;
  }>({ 
    StepName: '',
    Comments: '',
    Prerequisites: '',
    Postrequisites: '',
    Duration: 1,
    URL: ''
  });
  const [dialogSelectedFile, setDialogSelectedFile] = useState<File | null>(null);
  const [dialogErrors, setDialogErrors] = useState<Record<string, string>>({});
  
  // State for dialog and form
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<SOPStepFormData>({
    Sequence: 1,
    StepName: '',
    Comments: '',
    Prerequisites: '',
    Postrequisites: '',
    Duration: 1,
    URL: ''
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Ref for drag and drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  
  // State for notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Load steps when sopId changes
  useEffect(() => {
    if (sopId) {
      loadSteps();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sopId]);
  
  // Load steps from API
  const loadSteps = async () => {
    if (!sopId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await sopApi.getStepsBySOP(sopId);
      
      // Convert SOPStep[] to EditableStep[]
      const editableSteps = response.results.map(step => ({
        ...step,
        isEditing: false,
        editData: {
          StepName: step.StepName,
          Comments: step.Comments || '',
          URL: step.URL || ''
        },
        selectedFile: null,
        saving: false,
        errors: {}
      }));
      
      setSteps(editableSteps);
    } catch (err) {
      console.error('Error loading steps:', err);
      setError('Failed to load steps. Please try again later.');
      setSteps([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Utility functions
  const isValidURL = (url: string): boolean => {
    if (!url) return true; // Empty URL is valid (optional field)
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };
  
  const truncateText = (text: string | null, maxLength: number = 50): string => {
    if (!text) return 'N/A';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };
  
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Handle document download with authentication
  const handleDownloadDocument = async (stepId: number) => {
    try {
      const blob = await sopApi.downloadStepDocument(stepId);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      
      // Get the step to use its filename
      const step = steps.find(s => s.StepId === stepId);
      const filename = step?.FileName || `document_${stepId}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      setNotification({
        message: 'Failed to download document. Please try again.',
        type: 'error'
      });
    }
  };
  
  // Drag start handler
  const handleDragStart = (index: number) => {
    dragItem.current = index;
    setIsDragging(true);
    setDraggedStep(index);
  };
  
  // Drag enter handler
  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };
  
  // Drag end handler
  const handleDragEnd = async () => {
    setIsDragging(false);
    setDraggedStep(null);
    
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      return;
    }
    
    // Create a copy of the steps array
    const stepsCopy = [...steps];
    
    // Get the dragged item
    const draggedItemContent = stepsCopy[dragItem.current];
    
    // Remove the dragged item from the array
    stepsCopy.splice(dragItem.current, 1);
    
    // Insert the dragged item at the new position
    stepsCopy.splice(dragOverItem.current, 0, draggedItemContent);
    
    // Update the Sequence field for each step
    const updatedSteps = stepsCopy.map((step, index) => ({
      ...step,
      Sequence: index + 1
    }));
    
    // Update the state with the new order
    setSteps(updatedSteps);
    
    // Prepare data for the API call
    const reorderData = updatedSteps.map(step => ({
      StepId: step.StepId,
      Sequence: step.Sequence
    }));
    
    try {
      // Call the API to update the order in the backend
      await sopApi.reorderSteps(sopId, reorderData);
      
      setNotification({
        message: 'Steps reordered successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error reordering steps:', err);
      setNotification({
        message: 'Failed to reorder steps. Please try again.',
        type: 'error'
      });
      
      // Reload the steps to reset the order
      const response = await sopApi.getStepsBySOP(sopId);
      const editableSteps = response.results.map(step => ({
        ...step,
        isEditing: false,
        editData: {
          StepName: step.StepName,
          Comments: step.Comments || '',
          URL: step.URL || ''
        },
        selectedFile: null,
        saving: false,
        errors: {}
      }));
      
      setSteps(editableSteps);
    }
    
    // Reset the drag refs
    dragItem.current = null;
    dragOverItem.current = null;
  };
  
  // Toggle edit mode for a step
  const handleToggleEdit = (index: number) => {
    const updatedSteps = [...steps];
    updatedSteps[index].isEditing = !updatedSteps[index].isEditing;
    
    // Reset edit data when toggling edit mode
    if (updatedSteps[index].isEditing) {
      updatedSteps[index].editData = {
        StepName: updatedSteps[index].StepName,
        Comments: updatedSteps[index].Comments || '',
        URL: updatedSteps[index].URL || ''
      };
      updatedSteps[index].selectedFile = null;
      updatedSteps[index].errors = {};
    }
    
    setSteps(updatedSteps);
  };
  
  // Handle edit field changes
  const handleEditChange = (index: number, field: string, value: string) => {
    const updatedSteps = [...steps];
    updatedSteps[index].editData = {
      ...updatedSteps[index].editData,
      [field]: value
    };
    setSteps(updatedSteps);
  };
  
  // Handle file selection for a step
  const handleStepFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const updatedSteps = [...steps];
      updatedSteps[index].selectedFile = e.target.files[0];
      setSteps(updatedSteps);
    }
  };
  
  // Validate step edit data
  const validateStepEdit = (index: number): boolean => {
    const step = steps[index];
    const errors: Record<string, string> = {};
    
    if (!step.editData.StepName.trim()) {
      errors.StepName = 'Step name is required';
    }
    
    if (step.editData.URL && !isValidURL(step.editData.URL)) {
      errors.URL = 'Please enter a valid URL';
    }
    
    const updatedSteps = [...steps];
    updatedSteps[index].errors = errors;
    setSteps(updatedSteps);
    
    return Object.keys(errors).length === 0;
  };
  
  // Save edited step
  const handleSaveStep = async (index: number) => {
    if (!validateStepEdit(index)) {
      return;
    }
    
    const step = steps[index];
    const updatedSteps = [...steps];
    updatedSteps[index].saving = true;
    setSteps(updatedSteps);
    
    try {
      const updateData: SOPStepFormData = {
        Sequence: step.Sequence,
        StepName: step.editData.StepName,
        Comments: step.editData.Comments,
        Prerequisites: step.Prerequisites || '',
        Postrequisites: step.Postrequisites || '',
        Duration: step.Duration,
        URL: step.editData.URL
      };
      
      if (step.selectedFile) {
        updateData.document = step.selectedFile;
      }
      
      await sopApi.updateStep(step.StepId, updateData);
      
      // Update the step with the new data
      const updatedSteps = [...steps];
      updatedSteps[index] = {
        ...updatedSteps[index],
        StepName: step.editData.StepName,
        Comments: step.editData.Comments,
        URL: step.editData.URL,
        isEditing: false,
        saving: false
      };
      
      setSteps(updatedSteps);
      
      setNotification({
        message: 'Step updated successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error updating step:', err);
      
      const updatedSteps = [...steps];
      updatedSteps[index].saving = false;
      setSteps(updatedSteps);
      
      setNotification({
        message: 'Failed to update step. Please try again.',
        type: 'error'
      });
    }
  };
  
  // Add a new blank step directly to the UI and call the API
  const handleAddStep = async () => {
    // Create a new blank step with the next sequence number
    const newSequence = steps.length + 1;
    
    // Show loading indicator
    setLoading(true);
    
    try {
      // Prepare the data for the new step - completely blank with only sequence number
      const newStepData: SOPStepFormData = {
        Sequence: newSequence,
        StepName: '',
        Comments: '',
        Prerequisites: '',
        Postrequisites: '',
        Duration: 1,
        URL: ''
      };
      
      // Call the API to create the new step
      const createdStep = await sopApi.createStep(sopId, newStepData);
      
      // Add the new step to the UI
      const newEditableStep: EditableStep = {
        ...createdStep,
        isEditing: true, // Start in edit mode
        editData: {
          StepName: '', // Blank field
          Comments: '', // Blank field
          URL: '' // Blank field
        },
        selectedFile: null,
        saving: false,
        errors: {}
      };
      
      // Update the steps array
      setSteps([...steps, newEditableStep]);
      
      // Show success notification
      setNotification({
        message: 'New step added successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error adding new step:', err);
      setNotification({
        message: 'Failed to add new step. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle form submission for adding a new step
  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const submitData: SOPStepFormData = {
        ...formData,
        document: selectedFile || undefined
      };
      
      await sopApi.createStep(sopId, submitData);
      
      // Reload steps to get the new step
      await loadSteps();
      setOpenDialog(false);
      
      setNotification({
        message: 'Step added successfully',
        type: 'success'
      });
    } catch (err) {
      console.error('Error adding step:', err);
      setNotification({
        message: 'Failed to add step. Please try again.',
        type: 'error'
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle form field changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
    
    // Clear validation error when field is changed
    if (name && formErrors[name as string]) {
      setFormErrors(prev => ({
        ...prev,
        [name as string]: ''
      }));
    }
  };
  
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };
  
  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.StepName.trim()) {
      errors.StepName = 'Step Name is required';
    }
    
    if (formData.Duration <= 0) {
      errors.Duration = 'Duration must be greater than 0';
    }
    
    if (formData.URL && !isValidURL(formData.URL)) {
      errors.URL = 'Please enter a valid URL';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  

  

  
  // Handle step deletion
  const handleDeleteStep = async (step: SOPStep) => {
    if (!sopId || !window.confirm(`Are you sure you want to delete "${step.StepName}"?`)) {
      return;
    }
    
    try {
      await sopApi.deleteStep(step.StepId);
      
      // Refresh the step list
      await loadSteps();
      setNotification({ message: 'Step deleted successfully', type: 'success' });
    } catch (err) {
      console.error('Error deleting step:', err);
      setNotification({ message: 'Failed to delete step. Please try again.', type: 'error' });
    }
  };
  

  

  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        {/* <Typography variant="h5" component="h1">
          {sopName ? `Steps for ${sopName}` : 'SOP Steps'}
        </Typography> */}
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
          disabled={!sopId}
        >
          Add Step
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : steps.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1">No steps found</Typography>
        </Paper>
      ) : (
        <Container maxWidth="lg" sx={{ mt: 2 }}>
          <Grid container spacing={3}>
            {steps.map((step, index) => (
              <Grid item key={step.StepId} xs={12} md={6} lg={4} xl={3} sx={{ display: 'flex', justifyContent: 'center' }}>
                <Card 
                  sx={{
                    mb: 2,
                    position: 'relative',
                    border: isDragging && draggedStep === index ? '2px dashed #1976d2' : '1px solid #e0e0e0',
                    bgcolor: step.isEditing ? '#fffde7' : isDragging && draggedStep === index ? 'rgba(25, 118, 210, 0.08)' : 'background.paper',
                    transition: 'all 0.3s ease',
                    height: '180px',
                    minHeight: '180px',
                    maxHeight: '180px',
                    width: '300px',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': {
                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                    },
                    overflow: 'hidden'
                  }}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      left: 0, 
                      top: 0, 
                      bottom: 0, 
                      width: '40px', 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'grab',
                      color: 'text.secondary',
                      zIndex: 2,
                      '&:hover': { color: 'primary.main' }
                    }}
                  >
                    <DragIcon />
                  </Box>
                  
                  <CardHeader
                    sx={{ pb: 0 }}
                    title={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ ml: 4, fontWeight: 'bold' }}>
                          Step {step.Sequence}
                        </Typography>
                      </Box>
                    }
                    action={
                      <Box>
                        {step.isEditing && (
                          <Tooltip title="Cancel">
                            <IconButton size="small" onClick={() => handleToggleEdit(index)}>
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    }
                  />
                  
                  <CardContent sx={{ pt: 0, flexGrow: 1, overflow: 'hidden', width: '100%' }}>
                    {!step.isEditing && (
                      <Box sx={{ pl: 4, width: '100%' }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            mb: 2
                          }}
                        >
                          {step.StepName || 'No name provided'}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary">
                          Duration: {step.Duration} days
                        </Typography>
                      </Box>
                    )}
                    {step.isEditing ? (
                      <Box sx={{ pl: 4, width: '100%' }}>
                        <TextField
                          fullWidth
                          label="Step Name"
                          value={step.editData.StepName}
                          onChange={(e) => handleEditChange(index, 'StepName', e.target.value)}
                          margin="normal"
                          error={!!step.errors.StepName}
                          helperText={step.errors.StepName}
                        />
                        
                        <TextField
                          fullWidth
                          label="Comments"
                          value={step.editData.Comments}
                          onChange={(e) => handleEditChange(index, 'Comments', e.target.value)}
                          margin="normal"
                          multiline
                          rows={3}
                        />
                        
                        <TextField
                          fullWidth
                          label="URL"
                          value={step.editData.URL}
                          onChange={(e) => handleEditChange(index, 'URL', e.target.value)}
                          margin="normal"
                          error={!!step.errors.URL}
                          helperText={step.errors.URL}
                        />
                        
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Document
                          </Typography>
                          <input
                            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                            id={`document-upload-${step.StepId}`}
                            type="file"
                            onChange={(e) => handleStepFileChange(index, e)}
                            style={{ display: 'none' }}
                          />
                          <label htmlFor={`document-upload-${step.StepId}`}>
                            <Button
                              variant="outlined"
                              component="span"
                              startIcon={<UploadIcon />}
                            >
                              {step.selectedFile ? 'Change Document' : 'Upload Document'}
                            </Button>
                          </label>
                          {step.selectedFile && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              Selected file: {step.selectedFile.name}
                            </Typography>
                          )}
                          {!step.selectedFile && step.OriginalFileName && (
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ mr: 1 }}>
                                Current document: {step.OriginalFileName}
                              </Typography>
                              <Tooltip title="Download Document">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  href={sopApi.getStepDocumentUrl(step.StepId)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <DownloadIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          )}
                        </Box>
                        
                        {step.errors.general && (
                          <Alert severity="error" sx={{ mt: 2 }}>
                            {step.errors.general}
                          </Alert>
                        )}
                      </Box>
                    ) : (
                      /* Detailed information is now only shown in the details dialog */
                      <Box sx={{ pl: 4, width: '100%' }}>
                        <Typography 
                          variant="body1" 
                          sx={{ 
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            mb: 2
                          }}
                        >
                          {step.StepName || 'No name provided'}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary">
                          Duration: {step.Duration} days
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                  
                  <CardActions sx={{ px: 2, pb: 2, mt: 'auto', justifyContent: 'flex-end' }}>
                    <Stack direction="row" spacing={1}>
                      {!step.isEditing && (
                        <>
                          {step.URL && (
                            <Tooltip title="Open URL">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                component="a" 
                                href={step.URL} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                sx={{ pl: 2.5 }} 
                              >
                                <LinkIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {step.DocumentPath && (
                            <Tooltip title="Download Document">
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={() => handleDownloadDocument(step.StepId)}
                              >
                                <FileDownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          <Tooltip title="View Details">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => {
                                setSelectedStep(step);
                                setDetailsDialogOpen(true);
                              }}
                            >
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Edit">
                            <IconButton 
                              size="small" 
                              color="primary" 
                              onClick={() => {
                                const step = steps[index];
                                setSelectedStep(step);
                                setDialogEditMode(true);
                                setDialogEditData({
                                  StepName: step.StepName,
                                  Comments: step.Comments || '',
                                  Prerequisites: step.Prerequisites || '',
                                  Postrequisites: step.Postrequisites || '',
                                  Duration: step.Duration,
                                  URL: step.URL || ''
                                });
                                setDialogSelectedFile(null);
                                setDialogErrors({});
                                setDetailsDialogOpen(true);
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" onClick={() => handleDeleteStep(step)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Stack>
                    
                    {step.isEditing && (
                      <Box sx={{ display: 'flex', ml: 'auto' }}>
                        <Tooltip title="Save">
                          <IconButton
                            color="primary"
                            onClick={() => handleSaveStep(index)}
                            disabled={step.saving}
                          >
                            {step.saving ? <CircularProgress size={20} /> : <SaveIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      )}
      
      {/* Add/Edit Step Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Step</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="StepName"
              label="Step Name"
              name="StepName"
              value={formData.StepName}
              onChange={handleFormChange}
              error={!!formErrors.StepName}
              helperText={formErrors.StepName}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="Prerequisites"
              label="Prerequisites"
              name="Prerequisites"
              multiline
              rows={2}
              value={formData.Prerequisites}
              onChange={handleFormChange}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="Postrequisites"
              label="Postrequisites"
              name="Postrequisites"
              multiline
              rows={2}
              value={formData.Postrequisites}
              onChange={handleFormChange}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="Comments"
              label="Comments"
              name="Comments"
              multiline
              rows={3}
              value={formData.Comments}
              onChange={handleFormChange}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="URL"
              label="URL"
              name="URL"
              value={formData.URL}
              onChange={handleFormChange}
              error={!!formErrors.URL}
              helperText={formErrors.URL}
            />
            
            <TextField
              margin="normal"
              required
              fullWidth
              id="Duration"
              label="Duration (days)"
              name="Duration"
              type="number"
              value={formData.Duration}
              onChange={handleFormChange}
              error={!!formErrors.Duration}
              helperText={formErrors.Duration}
              InputProps={{ inputProps: { min: 1 } }}
            />
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Document
              </Typography>
              <input
                accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                id="document-upload"
                type="file"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="document-upload">
                <Button variant="outlined" component="span">
                  {selectedFile ? 'Change Document' : 'Upload Document'}
                </Button>
              </label>
              {selectedFile && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Selected file: {selectedFile.name}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleFormSubmit} 
            variant="contained" 
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
      {notification && (
        <Snackbar
          open={true}
          autoHideDuration={6000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseNotification} severity={notification.type} sx={{ width: '100%' }}>
            {notification.message}
          </Alert>
        </Snackbar>
      )}

      {/* Step Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false);
          setDialogEditMode(false);
        }}
        maxWidth="md"
        fullWidth
      >
        {selectedStep && (
          <>
            <DialogTitle>
              <Typography variant="h6">
                {dialogEditMode ? 'Edit Step' : `Step ${selectedStep.Sequence}: ${selectedStep.StepName}`}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              {dialogEditMode ? (
                <Box component="form" sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="StepName"
                    label="Step Name"
                    value={dialogEditData.StepName}
                    onChange={(e) => setDialogEditData({...dialogEditData, StepName: e.target.value})}
                    error={!!dialogErrors.StepName}
                    helperText={dialogErrors.StepName}
                  />
                  
                  <TextField
                    margin="normal"
                    fullWidth
                    id="Prerequisites"
                    label="Prerequisites"
                    multiline
                    rows={2}
                    value={dialogEditData.Prerequisites}
                    onChange={(e) => setDialogEditData({...dialogEditData, Prerequisites: e.target.value})}
                  />
                  
                  <TextField
                    margin="normal"
                    fullWidth
                    id="Postrequisites"
                    label="Postrequisites"
                    multiline
                    rows={2}
                    value={dialogEditData.Postrequisites}
                    onChange={(e) => setDialogEditData({...dialogEditData, Postrequisites: e.target.value})}
                  />
                  
                  <TextField
                    margin="normal"
                    fullWidth
                    id="Comments"
                    label="Comments"
                    multiline
                    rows={3}
                    value={dialogEditData.Comments}
                    onChange={(e) => setDialogEditData({...dialogEditData, Comments: e.target.value})}
                  />
                  
                  <TextField
                    margin="normal"
                    fullWidth
                    id="URL"
                    label="URL"
                    value={dialogEditData.URL}
                    onChange={(e) => setDialogEditData({...dialogEditData, URL: e.target.value})}
                    error={!!dialogErrors.URL}
                    helperText={dialogErrors.URL}
                  />
                  
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="Duration"
                    label="Duration (days)"
                    name="Duration"
                    type="number"
                    value={dialogEditData.Duration}
                    onChange={(e) => setDialogEditData({...dialogEditData, Duration: parseInt(e.target.value)})}
                    error={!!dialogErrors.Duration}
                    helperText={dialogErrors.Duration}
                    InputProps={{ inputProps: { min: 1 } }}
                  />
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Document
                    </Typography>
                    <input
                      accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                      id="dialog-document-upload"
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setDialogSelectedFile(e.target.files[0]);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="dialog-document-upload">
                      <Button
                        variant="outlined"
                        component="span"
                        startIcon={<UploadIcon />}
                      >
                        {dialogSelectedFile ? 'Change Document' : selectedStep.DocumentPath ? 'Replace Document' : 'Upload Document'}
                      </Button>
                    </label>
                    {dialogSelectedFile && (
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        Selected file: {dialogSelectedFile.name}
                      </Typography>
                    )}
                    {!dialogSelectedFile && selectedStep.DocumentPath && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          Current document: {selectedStep.OriginalFileName || 'Document'}
                        </Typography>
                        <Tooltip title="Download Document">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleDownloadDocument(selectedStep.StepId)}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Prerequisites:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedStep.Prerequisites || 'None'}
                    </Typography>

                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Postrequisites:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedStep.Postrequisites || 'None'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Comments:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedStep.Comments || 'None'}
                    </Typography>

                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Duration:
                    </Typography>
                    <Typography variant="body1" paragraph>
                      {selectedStep.Duration} days
                    </Typography>

                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      Document:
                    </Typography>
                    {selectedStep.DocumentPath ? (
                      <Button
                        variant="outlined"
                        startIcon={<FileDownloadIcon />}
                        onClick={() => handleDownloadDocument(selectedStep.StepId)}
                        sx={{ mb: 2 }}
                      >
                        Download Document
                      </Button>
                    ) : (
                      <Typography variant="body1" paragraph>
                        No document attached
                      </Typography>
                    )}

                    <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                      URL:
                    </Typography>
                    {selectedStep.URL ? (
                      <Link 
                        href={selectedStep.URL} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        sx={{ wordBreak: 'break-all' }}
                      >
                        {selectedStep.URL}
                      </Link>
                    ) : (
                      <Typography variant="body1">
                        No URL provided
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions>
              {dialogEditMode ? (
                <>
                  <Button 
                    onClick={() => {
                      setDialogEditMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="contained"
                    color="primary" 
                    onClick={() => {
                      // Validate form
                      const errors: Record<string, string> = {};
                      
                      if (!dialogEditData.StepName.trim()) {
                        errors.StepName = 'Step name is required';
                      }
                      
                      if (dialogEditData.URL && !isValidURL(dialogEditData.URL)) {
                        errors.URL = 'Please enter a valid URL';
                      }
                      
                      if (Object.keys(errors).length > 0) {
                        setDialogErrors(errors);
                        return;
                      }
                      
                      // Find step index
                      const stepIndex = steps.findIndex(s => s.StepId === selectedStep.StepId);
                      if (stepIndex !== -1) {
                        // Update step data
                        const updatedSteps = [...steps];
                        updatedSteps[stepIndex].editData = {
                          StepName: dialogEditData.StepName,
                          Comments: dialogEditData.Comments,
                          Prerequisites: dialogEditData.Prerequisites,
                          Postrequisites: dialogEditData.Postrequisites,
                          Duration: dialogEditData.Duration,
                          URL: dialogEditData.URL
                        };
                        updatedSteps[stepIndex].selectedFile = dialogSelectedFile;
                        setSteps(updatedSteps);
                        
                        // Save the step
                        handleSaveStep(stepIndex).then(() => {
                          setDialogEditMode(false);
                          setDetailsDialogOpen(false);
                        });
                      }
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
                  <Button 
                    color="primary" 
                    onClick={() => {
                      setDialogEditMode(true);
                      setDialogEditData({
                        StepName: selectedStep.StepName,
                        Comments: selectedStep.Comments || '',
                        Prerequisites: selectedStep.Prerequisites || '',
                        Postrequisites: selectedStep.Postrequisites || '',
                        Duration: selectedStep.Duration,
                        URL: selectedStep.URL || ''
                      });
                      setDialogSelectedFile(null);
                      setDialogErrors({});
                    }}
                  >
                    Edit
                  </Button>
                </>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default SOPStepsScreen;
