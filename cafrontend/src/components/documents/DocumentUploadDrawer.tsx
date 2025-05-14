import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Drawer,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Snackbar,
  TextField,
  Typography,
  Alert,
  AlertColor
} from '@mui/material';
import { Close as CloseIcon, CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { documentTypeApi, documentApi } from '../../services/api';
import { DocumentType } from '../../types/document';

interface DocumentUploadDrawerProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  onUploadSuccess?: () => void;
}

const DocumentUploadDrawer: React.FC<DocumentUploadDrawerProps> = ({
  open,
  onClose,
  customerId,
  onUploadSuccess
}) => {
  // State for form fields
  const [documentTypeId, setDocumentTypeId] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userDocuName, setUserDocuName] = useState<string>('');
  const [visibleToCustomer, setVisibleToCustomer] = useState<boolean>(false);
  
  // State for document types
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  
  // State for validation
  const [errors, setErrors] = useState<{
    documentType?: string;
    file?: string;
    userDocuName?: string;
  }>({});
  
  // State for notification
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: AlertColor;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load document types when drawer opens
  useEffect(() => {
    if (open) {
      fetchDocumentTypes();
    }
  }, [open]);

  const fetchDocumentTypes = async () => {
    setLoading(true);
    try {
      const response = await documentTypeApi.getDocumentTypes();
      setDocumentTypes(response.results);
    } catch (error) {
      console.error('Error fetching document types:', error);
      showNotification('Error loading document types', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentTypeChange = (event: SelectChangeEvent) => {
    setDocumentTypeId(event.target.value);
    // Clear error when value is selected
    if (event.target.value) {
      setErrors({ ...errors, documentType: undefined });
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      // Clear error when file is selected
      setErrors({ ...errors, file: undefined });
    }
  };

  const handleVisibleToCustomerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVisibleToCustomer(event.target.checked);
  };

  const validateForm = (): boolean => {
    const newErrors: { documentType?: string; file?: string } = {};
    
    if (!documentTypeId) {
      newErrors.documentType = 'Please select a document type';
    }
    
    if (!selectedFile) {
      newErrors.file = 'Please select a file to upload';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpload = async () => {
    // Validate form
    const validationErrors: { documentType?: string; file?: string } = {};
    
    if (!documentTypeId) {
      validationErrors.documentType = 'Please select a document type';
    }
    
    if (!selectedFile) {
      validationErrors.file = 'Please select a file to upload';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('CustomerId', customerId.toString());
      formData.append('DocumentTypeId', documentTypeId);
      formData.append('VisibleToCust', visibleToCustomer ? 'true' : 'false');
      
      // Set UserDocuName - use provided name or default to DocumentName
      formData.append('UserDocuName', userDocuName.trim() || selectedFile?.name || '');
      
      if (selectedFile) {
        formData.append('File', selectedFile);
      }
      
      await documentApi.uploadDocument(formData);
      
      showNotification('Document uploaded successfully', 'success');
      resetForm();
      
      // Call the onUploadSuccess callback if provided
      if (onUploadSuccess) {
        onUploadSuccess();
      }
      
      // Close the drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error uploading document:', error);
      showNotification('Error uploading document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setDocumentTypeId('');
    setSelectedFile(null);
    setUserDocuName('');
    setVisibleToCustomer(false);
    setErrors({});
  };

  const showNotification = (message: string, severity: AlertColor) => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 400 },
          padding: 3,
          marginTop: '64px', // Add margin to account for App Bar height
          height: 'calc(100% - 64px)', // Adjust height to account for App Bar
          maxHeight: 'calc(100% - 64px)', // Ensure content doesn't overflow
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">Upload Document</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 3 }}>
          <FormControl fullWidth error={!!errors.documentType} sx={{ mb: 3 }}>
            <InputLabel id="document-type-label">Document Type</InputLabel>
            <Select
              labelId="document-type-label"
              id="document-type"
              value={documentTypeId}
              label="Document Type"
              onChange={handleDocumentTypeChange}
              disabled={loading || uploading}
            >
              {documentTypes.map((docType) => (
                <MenuItem key={docType.DocumentTypeId} value={docType.DocumentTypeId.toString()}>
                  {docType.DocumentTypeName}
                </MenuItem>
              ))}
            </Select>
            {errors.documentType && (
              <FormHelperText>{errors.documentType}</FormHelperText>
            )}
          </FormControl>

          <TextField
            fullWidth
            label="Document Name (Optional)"
            value={userDocuName}
            onChange={(e) => setUserDocuName(e.target.value)}
            margin="normal"
            placeholder="Enter a user-friendly name (defaults to file name)"
            disabled={uploading}
            sx={{ mb: 2 }}
            helperText="Leave blank to use the file name"
          />

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Upload File
            </Typography>
            <Box
              sx={{
                border: '1px dashed',
                borderColor: errors.file ? 'error.main' : 'grey.400',
                borderRadius: 1,
                p: 2,
                textAlign: 'center',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                style={{ display: 'none' }}
                onChange={handleFileChange}
                disabled={uploading}
              />
              <CloudUploadIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body2" color="textSecondary">
                {selectedFile ? selectedFile.name : 'Click to select a file or drag and drop'}
              </Typography>
              {selectedFile && (
                <Typography variant="caption" display="block" color="textSecondary">
                  Size: {(selectedFile.size / 1024).toFixed(2)} KB
                </Typography>
              )}
            </Box>
            {errors.file && (
              <FormHelperText error>{errors.file}</FormHelperText>
            )}
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={visibleToCustomer}
                onChange={handleVisibleToCustomerChange}
                disabled={uploading}
              />
            }
            label="Visible to Customer"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ mr: 1 }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={uploading}
            startIcon={uploading ? <CircularProgress size={20} /> : undefined}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </Box>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Drawer>
  );
};

export default DocumentUploadDrawer;
