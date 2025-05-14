import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Pagination,
  Tooltip,
  Snackbar,
  Alert,
  AlertColor
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import credentialTypeApi from '../../services/api/credentialTypeApi';
import credentialApi from '../../services/api/credentialApi';
import { Credential, CredentialFormData, CredentialType } from '../../types/credential';

interface CustomerCredentialsCardProps {
  customerId: number;
}

const PAGE_SIZE = 5;

const CustomerCredentialsCard: React.FC<CustomerCredentialsCardProps> = ({ customerId }) => {
  // State for credentials
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  
  // State for credential types (for dropdown)
  const [credentialTypes, setCredentialTypes] = useState<CredentialType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState<boolean>(false);
  
  // State for dialog
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogTitle, setDialogTitle] = useState<string>('');
  const [currentCredential, setCurrentCredential] = useState<Partial<CredentialFormData>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // State for password visibility
  const [visiblePasswords, setVisiblePasswords] = useState<Record<number, boolean>>({});
  
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
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Load credentials on component mount and when customerId or page changes
  useEffect(() => {
    if (customerId) {
      fetchCredentials();
    }
  }, [customerId, page]);

  // Load credential types for the dropdown
  useEffect(() => {
    fetchCredentialTypes();
  }, []);

  const fetchCredentials = async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const response = await credentialApi.getCustomerCredentials(customerId, page, PAGE_SIZE);
      setCredentials(response.results || []);
      setTotalCount(response.count || 0);
    } catch (error) {
      console.error('Error fetching credentials:', error);
      setCredentials([]);
      setTotalCount(0);
      showNotification('Error loading credentials. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCredentialTypes = async () => {
    setLoadingTypes(true);
    try {
      const response = await credentialTypeApi.getCredentialTypes(false);
      setCredentialTypes(response.results);
    } catch (error) {
      console.error('Error fetching credential types:', error);
    } finally {
      setLoadingTypes(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleOpenAddDialog = () => {
    // Initialize with all required fields and default values
    setCurrentCredential({
      ClientId: 1, // Default value as per requirements
      CompanyId: 1, // Default value as per requirements
      CredentialTypeId: undefined, // Will be selected by user
      UserName: '',
      Password: '',
      EmailOTP: '',
      MobileOTP: ''
    });
    setDialogTitle('Add Credential');
    setIsEditing(false);
    setEditId(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (credential: Credential) => {
    setCurrentCredential({
      ClientId: credential.ClientId,
      CompanyId: credential.CompanyId,
      CredentialTypeId: credential.CredentialTypeId,
      UserName: credential.UserName,
      Password: credential.Password,
      EmailOTP: credential.EmailOTP || '',
      MobileOTP: credential.MobileOTP || ''
    });
    setDialogTitle('Edit Credential');
    setIsEditing(true);
    setEditId(credential.CredentialId);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentCredential({
      ...currentCredential,
      [name]: value,
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value as number;
    setCurrentCredential({
      ...currentCredential,
      [name]: value,
    });
  };

  const handleTogglePasswordVisibility = (credentialId: number) => {
    setVisiblePasswords({
      ...visiblePasswords,
      [credentialId]: !visiblePasswords[credentialId]
    });
  };

  const handleSaveCredential = async () => {
    // Validate form fields
    if (!currentCredential.CredentialTypeId || !currentCredential.UserName || !currentCredential.Password) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    // Create a properly formatted credential object with all required fields
    const formattedCredential: CredentialFormData = {
      ClientId: 1, // Always use 1 as per requirements
      CompanyId: 1, // Always use 1 as per requirements
      CredentialTypeId: currentCredential.CredentialTypeId,
      UserName: currentCredential.UserName || '',
      Password: currentCredential.Password || ''
    };
    
    // Debug log
    console.log('Saving credential with data:', formattedCredential);

    try {
      if (isEditing && editId) {
        // For updating, we need to ensure the data is properly formatted
        await credentialApi.updateCredential(
          editId,
          formattedCredential
        );
        showNotification('Credential updated successfully', 'success');
      } else {
        // For creating, we need to ensure the customerId is properly passed
        const result = await credentialApi.createCredential(customerId, formattedCredential);
        console.log('Creation result:', result);
        showNotification('Credential created successfully', 'success');
      }
      handleCloseDialog();
      fetchCredentials();
    } catch (error: any) {
      console.error('Error saving credential:', error);
      // Display more detailed error message if available
      let errorMessage = 'Error saving credential';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          // Try to extract error messages from the response data
          const errorMessages = [];
          for (const key in error.response.data) {
            if (Array.isArray(error.response.data[key])) {
              errorMessages.push(`${key}: ${error.response.data[key].join(', ')}`);
            } else {
              errorMessages.push(`${key}: ${error.response.data[key]}`);
            }
          }
          if (errorMessages.length > 0) {
            errorMessage = errorMessages.join('; ');
          }
        }
      }
      
      showNotification(errorMessage, 'error');
    }
  };
  
  // Handle opening delete confirmation dialog
  const handleOpenDeleteDialog = (id: number) => {
    setDeleteId(id);
    setDeleteDialogOpen(true);
  };

  // Handle closing delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeleteId(null);
  };

  // Handle deleting credential
  const handleDeleteCredential = async () => {
    if (!deleteId) return;
    
    try {
      await credentialApi.deleteCredential(deleteId);
      showNotification('Credential deleted successfully', 'success');
      fetchCredentials();
    } catch (error: any) {
      console.error('Error deleting credential:', error);
      const errorMessage = error.response?.data?.detail || 'Error deleting credential';
      showNotification(errorMessage, 'error');
    } finally {
      handleCloseDeleteDialog();
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

  // Helper function to mask passwords
  const maskPassword = (password: string) => {
    return '•'.repeat(password.length);
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h6" component="h2">
            Customer Credentials
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Add Credential
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Credential Type</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Password</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : credentials.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No credentials found
                  </TableCell>
                </TableRow>
              ) : (
                credentials.map((credential) => (
                  <TableRow key={credential.CredentialId}>
                    <TableCell>{credential.credential_type_name}</TableCell>
                    <TableCell>{credential.UserName}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {visiblePasswords[credential.CredentialId] 
                          ? credential.Password 
                          : maskPassword(credential.Password)}
                        <IconButton 
                          size="small" 
                          onClick={() => handleTogglePasswordVisibility(credential.CredentialId)}
                          sx={{ ml: 1 }}
                        >
                          {visiblePasswords[credential.CredentialId] 
                            ? <VisibilityOffIcon fontSize="small" /> 
                            : <VisibilityIcon fontSize="small" />}
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            color="primary"
                            onClick={() => handleOpenEditDialog(credential)}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            color="error"
                            onClick={() => handleOpenDeleteDialog(credential.CredentialId)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        {credential.credential_type_url && (
                          <Tooltip title="Open URL">
                            <IconButton
                              color="primary"
                              onClick={() => window.open(credential.credential_type_url || '', '_blank')}
                            >
                              <LinkIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel id="credential-type-label">Credential Type</InputLabel>
            <Select
              labelId="credential-type-label"
              id="CredentialTypeId"
              name="CredentialTypeId"
              value={currentCredential.CredentialTypeId || ''}
              onChange={handleSelectChange as any}
              label="Credential Type"
              required
              disabled={loadingTypes}
            >
              {loadingTypes ? (
                <MenuItem value="">
                  <CircularProgress size={20} />
                </MenuItem>
              ) : (
                credentialTypes.map((type) => (
                  <MenuItem key={type.CredentialTypeId} value={type.CredentialTypeId}>
                    {type.CredentialTypeName}
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>

          <TextField
            margin="normal"
            name="UserName"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={currentCredential.UserName || ''}
            onChange={handleInputChange}
            required
          />

          <TextField
            margin="normal"
            name="Password"
            label="Password"
            type="text"
            fullWidth
            variant="outlined"
            value={currentCredential.Password || ''}
            onChange={handleInputChange}
            required
          />

          <TextField
            margin="normal"
            name="EmailOTP"
            label="Email OTP"
            type="text"
            fullWidth
            variant="outlined"
            value={currentCredential.EmailOTP || ''}
            onChange={handleInputChange}
            helperText="Optional: Enter Email ID where OTP will be received"
          />

          <TextField
            margin="normal"
            name="MobileOTP"
            label="Mobile OTP"
            type="text"
            fullWidth
            variant="outlined"
            value={currentCredential.MobileOTP || ''}
            onChange={handleInputChange}
            helperText="Optional: Enter mobile number where OTP will be received"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSaveCredential} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this credential? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteCredential} color="error" variant="contained">
            Delete
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
    </Card>
  );
};

export default CustomerCredentialsCard;
