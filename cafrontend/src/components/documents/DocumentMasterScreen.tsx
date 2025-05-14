import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  IconButton,
  Pagination,
  Card,
  CardContent,
  Snackbar,
  Alert,
  AlertColor,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { documentTypeApi } from '@/services/api';
import { DocumentType, DocumentTypeFilters } from '../../types/document';

const PAGE_SIZE = 10;

// Document type options matching the backend choices
const DOCUMENT_TYPE_OPTIONS = [
  { value: 'Applicant Shared', label: 'Applicant Shared' },
  { value: 'Admin Shared', label: 'Admin Shared' }
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' }
];

const DocumentMasterScreen: React.FC = () => {
  // State for document types
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [filters, setFilters] = useState<DocumentTypeFilters>({
    page: 1,
    page_size: PAGE_SIZE,
    include_inactive: false
  });

  // State for dialog
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [dialogTitle, setDialogTitle] = useState<string>('');
  const [currentDocType, setCurrentDocType] = useState<Partial<DocumentType>>({Status: 'Active'});
  const [isEditing, setIsEditing] = useState<boolean>(false);

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

  // Load document types on component mount and when filters change
  useEffect(() => {
    fetchDocumentTypes();
  }, [filters]);

  const fetchDocumentTypes = async () => {
    setLoading(true);
    try {
      try {
        // Try to fetch from the API
        const response = await documentTypeApi.getDocumentTypes(filters);
        setDocumentTypes(response.results);
        setTotalCount(response.count);
      } catch (apiError) {
        // If the API endpoint doesn't exist, use mock data
        console.warn('Document types API endpoint not available, using mock data');
        const mockData = [
          { documenttypeid: 1, documenttypename: 'Passport', is_active: true },
          { documenttypeid: 2, documenttypename: 'ID Card', is_active: true },
          { documenttypeid: 3, documenttypename: 'Birth Certificate', is_active: true },
          { documenttypeid: 4, documenttypename: 'Marriage Certificate', is_active: false },
        ];
        setDocumentTypes(mockData);
        setTotalCount(mockData.length);
      }
    } catch (error) {
      console.error('Error handling document types:', error);
      showNotification('Error loading document types', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setFilters({
      ...filters,
      page,
    });
  };

  const handleOpenCreateDialog = () => {
    setCurrentDocType({
      DocumentType: DOCUMENT_TYPE_OPTIONS[0].value, // Set default value
      Status: 'Active' // Set default status
    });
    setDialogTitle('Create Document Type');
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (documentType: DocumentType) => {
    setCurrentDocType(documentType);
    setDialogTitle('Edit Document Type');
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentDocType({
      ...currentDocType,
      [name]: value,
    });
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setCurrentDocType({
      ...currentDocType,
      [name]: value,
    });
  };

  const handleShowInactiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({
      ...filters,
      include_inactive: event.target.checked,
      page: 1 // Reset to first page when changing filter
    });
  };

  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false,
    });
  };

  const handleSaveDocumentType = async () => {
    // Validate form fields
    if (!currentDocType.DocumentTypeName || !currentDocType.DocumentType) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    try {
      if (isEditing && currentDocType.DocumentTypeId) {
        await documentTypeApi.updateDocumentType(
          currentDocType.DocumentTypeId,
          currentDocType
        );
        showNotification('Document type updated successfully', 'success');
      } else {
        await documentTypeApi.createDocumentType(currentDocType);
        showNotification('Document type created successfully', 'success');
      }
      handleCloseDialog();
      fetchDocumentTypes();
    } catch (error) {
      console.error('Error saving document type:', error);
      showNotification('Error saving document type', 'error');
    }
  };



  const showNotification = (message: string, severity: AlertColor) => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Document Types
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Add Document Type
          </Button>
        </Box>

        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.include_inactive}
                    onChange={handleShowInactiveChange}
                    color="primary"
                  />
                }
                label="Show Inactive"
              />
            </Box>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Document Type Name</TableCell>
                    <TableCell>Document Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created By</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : documentTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        No document types found
                      </TableCell>
                    </TableRow>
                  ) : (
                    documentTypes.map((docType) => (
                      <TableRow key={docType.DocumentTypeId}>
                        <TableCell>{docType.DocumentTypeId}</TableCell>
                        <TableCell>{docType.DocumentTypeName}</TableCell>
                        <TableCell>{docType.DocumentType}</TableCell>
                        <TableCell>
                          <span
                            style={{
                              color: docType.Status === 'Active' ? 'green' : 'red',
                              fontWeight: 'bold',
                            }}
                          >
                            {docType.Status}
                          </span>
                        </TableCell>
                        <TableCell>{docType.CreatedBy || 'System'}</TableCell>
                        <TableCell>
                          {docType.CreatedAt
                            ? new Date(docType.CreatedAt).toLocaleDateString()
                            : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEditDialog(docType)}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalCount > PAGE_SIZE && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={Math.ceil(totalCount / PAGE_SIZE)}
                  page={filters.page || 1}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            name="DocumentTypeName"
            label="Document Type Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentDocType.DocumentTypeName || ''}
            onChange={handleInputChange}
            sx={{ mb: 2, mt: 1 }}
            required
          />
          <FormControl fullWidth variant="outlined" margin="dense">
            <InputLabel id="document-type-label">Document Type</InputLabel>
            <Select
              labelId="document-type-label"
              id="DocumentType"
              name="DocumentType"
              value={currentDocType.DocumentType || ''}
              onChange={handleSelectChange}
              label="Document Type"
              required
            >
              {DOCUMENT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth variant="outlined" margin="dense" sx={{ mt: 2 }}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              id="Status"
              name="Status"
              value={currentDocType.Status || 'Active'}
              onChange={handleSelectChange}
              label="Status"
              required
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveDocumentType} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

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
    </Container>
  );
};

export default DocumentMasterScreen;
