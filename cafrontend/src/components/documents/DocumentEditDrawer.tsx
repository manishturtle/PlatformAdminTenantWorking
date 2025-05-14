import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  Snackbar,
  Typography,
  Alert,
  AlertColor,
  Divider,
  Paper,
  TextField
} from '@mui/material';
import { 
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  AttachFile as AttachFileIcon 
} from '@mui/icons-material';
import { documentApi } from '../../services/api';
import { Document } from '../../types/document';

interface DocumentEditDrawerProps {
  open: boolean;
  onClose: () => void;
  documentId: number | null;
  onUpdateSuccess?: () => void;
}

const DocumentEditDrawer: React.FC<DocumentEditDrawerProps> = ({
  open,
  onClose,
  documentId,
  onUpdateSuccess
}) => {
  // State for document data
  const [document, setDocument] = useState<Document | null>(null);
  const [visibleToCustomer, setVisibleToCustomer] = useState<boolean>(false);
  const [userDocuName, setUserDocuName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  
  // State for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // Load document when drawer opens
  useEffect(() => {
    if (open && documentId) {
      fetchDocument();
    } else {
      // Reset state when drawer closes
      setDocument(null);
      setVisibleToCustomer(false);
    }
  }, [open, documentId]);

  const fetchDocument = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const response = await documentApi.getDocumentById(documentId);
      setDocument(response);
      setVisibleToCustomer(response.VisibleToCust);
      setUserDocuName(response.UserDocuName || '');
    } catch (error) {
      console.error('Error fetching document:', error);
      showNotification('Error loading document', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVisibleToCustomerChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVisibleToCustomer(event.target.checked);
  };

  const handleUserDocuNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUserDocuName(event.target.value);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async () => {
    if (!documentId) return;
    
    setSaving(true);
    try {
      // If there's a file selected, upload a new version
      if (selectedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('VisibleToCust', visibleToCustomer ? 'true' : 'false');
        formData.append('UserDocuName', userDocuName.trim() || selectedFile.name || document?.OriginalName || '');
        formData.append('File', selectedFile);
        
        const updatedDoc = await documentApi.updateDocumentWithFile(documentId, formData);
        setDocument(updatedDoc);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        showNotification('New document version uploaded successfully', 'success');
      } else {
        // Just update metadata
        await documentApi.updateDocument(documentId, {
          VisibleToCust: visibleToCustomer,
          UserDocuName: userDocuName.trim() || document?.OriginalName || '',
          DocumentStatus: document?.DocumentStatus
        });
        
        showNotification('Document updated successfully', 'success');
      }
      
      // Call the onUpdateSuccess callback if provided
      if (onUpdateSuccess) {
        onUpdateSuccess();
      }
      
      // Close the drawer after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating document:', error);
      showNotification('Error updating document', 'error');
    } finally {
      setSaving(false);
      setUploading(false);
    }
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
          <Typography variant="h6">Edit Document</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : document ? (
          <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Original File Name: {document.OriginalName || document.DocumentName}
            </Typography>
            
            <TextField
              fullWidth
              label="Document Name"
              value={userDocuName}
              onChange={handleUserDocuNameChange}
              margin="normal"
              placeholder="Enter a user-friendly name for this document"
              disabled={saving}
              sx={{ mb: 2 }}
            />
            
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Document Type: {document.document_type_name || 'Unknown'}
            </Typography>
            
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Version: {document.Version}
            </Typography>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Status: {document.DocumentStatus}
            </Typography>
            
            <FormControl component="fieldset" sx={{ mt: 2, mb: 3 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={visibleToCustomer}
                    onChange={handleVisibleToCustomerChange}
                    disabled={saving}
                  />
                }
                label="Visible to Customer"
              />
            </FormControl>

            <Divider sx={{ my: 3 }} />
            
            <Typography variant="subtitle1" gutterBottom>
              Upload New Version
            </Typography>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            {selectedFile ? (
              <Paper variant="outlined" sx={{ p: 2, mt: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachFileIcon sx={{ mr: 1 }} />
                    <Typography variant="body2" noWrap sx={{ maxWidth: '180px' }}>
                      {selectedFile.name}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={handleClearFile}>
                    Clear
                  </Button>
                </Box>
              </Paper>
            ) : (
              <Button
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                onClick={handleBrowseClick}
                sx={{ mt: 1, mb: 3 }}
                disabled={saving || uploading}
              >
                Browse Files
              </Button>
            )}
          </Box>
        ) : (
          <Typography variant="body1" sx={{ textAlign: 'center', my: 4 }}>
            No document found.
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
          <Button
            variant="outlined"
            onClick={onClose}
            sx={{ mr: 1 }}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleSave}
            disabled={loading || saving || !document || uploading}
            startIcon={(saving || uploading) ? <CircularProgress size={20} /> : undefined}
          >
            {uploading ? 'Uploading...' : saving ? 'Saving...' : selectedFile ? 'Upload & Save' : 'Save Changes'}
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

export default DocumentEditDrawer;
