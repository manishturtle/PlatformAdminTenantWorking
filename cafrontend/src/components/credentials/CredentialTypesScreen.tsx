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
  FormControlLabel,
  Switch,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  TablePagination,
  Tooltip,
  Snackbar,
  Alert,
  Container,
  Checkbox,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { CredentialType, CredentialTypeFormData } from '../../types/credential';
import { credentialTypeApi } from '@/services/api';

interface CredentialTypesScreenProps {
  inConfigPage?: boolean;
}

const PAGE_SIZE = 5;

const CredentialTypesScreen: React.FC<CredentialTypesScreenProps> = ({ inConfigPage = false }) => {
  const router = useRouter();
  
  // State for credential types
  const [credentialTypes, setCredentialTypes] = useState<CredentialType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(0); // 0-based for TablePagination
  const [rowsPerPage] = useState<number>(PAGE_SIZE);
  
  // State for dialog
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogTitle, setDialogTitle] = useState<string>('');
  const [currentCredentialType, setCurrentCredentialType] = useState<Partial<CredentialTypeFormData>>({});
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  // State for filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showInactive, setShowInactive] = useState<boolean>(false);
  
  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  // State for notification
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // Fetch credential types
  const fetchCredentialTypes = async () => {
    setLoading(true);
    try {
      try {
        // Try to fetch from the API
        const response = await credentialTypeApi.getCredentialTypes({
          include_inactive: showInactive,
          page: page + 1, // API uses 1-based indexing
          page_size: rowsPerPage,
          search: searchTerm
        });
        setCredentialTypes(response.results);
        setTotalCount(response.count);
        setError(null);
      } catch (apiError) {
        // If the API endpoint doesn't exist, use mock data
        console.warn('Credential types API endpoint not available, using mock data');
        const mockData = [
          { credentialtypeid: 1, credentialtypename: 'Password', is_active: true },
          { credentialtypeid: 2, credentialtypename: 'API Key', is_active: true },
          { credentialtypeid: 3, credentialtypename: 'OAuth Token', is_active: true },
          { credentialtypeid: 4, credentialtypename: 'SSH Key', is_active: false },
        ];
        
        // Filter mock data based on search term and active status
        let filteredData = [...mockData];
        if (!showInactive) {
          filteredData = filteredData.filter(item => item.is_active);
        }
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.credentialtypename.toLowerCase().includes(search)
          );
        }
        
        setCredentialTypes(filteredData);
        setTotalCount(filteredData.length);
        setError(null);
      }
    } catch (err) {
      console.error('Error handling credential types:', err);
      setError('Failed to load credential types. Please try again later.');
      setCredentialTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Load credential types on initial render and when filters change
  useEffect(() => {
    fetchCredentialTypes();
  }, [page, showInactive]);
  
  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchCredentialTypes();
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Handle page change
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  // Handle show inactive toggle
  const handleShowInactiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowInactive(event.target.checked);
    setPage(0); // Reset to first page when filter changes
  };
  
  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset to first page when search changes
  };

  // Handle adding a new credential type
  const handleAddCredentialType = () => {
    setCurrentCredentialType({
      CredentialTypeName: '',
      URL: '',
      Status: 'Active'
    });
    setDialogTitle('Add Credential Type');
    setIsEditing(false);
    setEditId(null);
    setDialogOpen(true);
  };

  // Handle editing a credential type
  const handleEditCredentialType = (id: number) => {
    const credentialType = credentialTypes.find(ct => ct.CredentialTypeId === id);
    if (credentialType) {
      setCurrentCredentialType({
        CredentialTypeName: credentialType.CredentialTypeName,
        URL: credentialType.URL,
        Status: credentialType.Status
      });
      setDialogTitle('Edit Credential Type');
      setIsEditing(true);
      setEditId(credentialType.CredentialTypeId);
      setDialogOpen(true);
    }
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setDialogOpen(false);
  };
  
  // Handle input change in the dialog
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentCredentialType({
      ...currentCredentialType,
      [name]: value,
    });
  };

  // Handle select change in the dialog
  const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value as string;
    setCurrentCredentialType({
      ...currentCredentialType,
      [name]: value,
    });
  };
  
  // Handle saving credential type
  const handleSaveCredentialType = async () => {
    // Validate form fields
    if (!currentCredentialType.CredentialTypeName) {
      setSnackbar({
        open: true,
        message: 'Please enter a credential type name',
        severity: 'error',
      });
      return;
    }

    try {
      if (isEditing && editId) {
        await credentialTypeApi.updateCredentialType(
          editId,
          currentCredentialType
        );
        setSnackbar({
          open: true,
          message: 'Credential type updated successfully',
          severity: 'success',
        });
      } else {
        await credentialTypeApi.createCredentialType(currentCredentialType as CredentialTypeFormData);
        setSnackbar({
          open: true,
          message: 'Credential type created successfully',
          severity: 'success',
        });
      }
      handleDialogClose();
      fetchCredentialTypes();
    } catch (error) {
      console.error('Error saving credential type:', error);
      setSnackbar({
        open: true,
        message: 'Error saving credential type',
        severity: 'error',
      });
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

  // Handle deleting credential type
  const handleDeleteCredentialType = async () => {
    if (!deleteId) return;
    
    try {
      await credentialTypeApi.deleteCredentialType(deleteId);
      setSnackbar({
        open: true,
        message: 'Credential type deleted successfully',
        severity: 'success',
      });
      fetchCredentialTypes();
    } catch (error) {
      console.error('Error deleting credential type:', error);
      setSnackbar({
        open: true,
        message: 'Error deleting credential type. It may be in use by one or more credentials.',
        severity: 'error',
      });
    } finally {
      handleCloseDeleteDialog();
    }
  };

  // Close snackbar
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ width: '100%' }}>
      {!inConfigPage ? (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Credential Types
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddCredentialType}
            >
              Add Credential Type
            </Button>
          </Box>
        </Container>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Credential Types
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddCredentialType}
            size="small"
          >
            Add Credential Type
          </Button>
        </Box>
      )}

      <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ flex: '1 1 300px', minWidth: '250px' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search credential types..."
            value={searchTerm}
            onChange={handleSearchChange}
            size={inConfigPage ? "small" : "medium"}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Box>
        <Box sx={{ flex: '0 0 auto' }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showInactive}
                onChange={handleShowInactiveChange}
                color="primary"
                size={inConfigPage ? "small" : "medium"}
              />
            }
            label="Show Inactive"
          />
        </Box>
      </Box>

      <Card sx={{ width: '100%', mb: 2 }}>
        <CardContent sx={{ p: inConfigPage ? 1 : 2 }}>
        <TableContainer>
          <Table aria-label="credential types table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="error">{error}</Typography>
                  </TableCell>
                </TableRow>
              ) : credentialTypes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography>No credential types found.</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                credentialTypes.map((credentialType) => (
                  <TableRow key={credentialType.CredentialTypeId}>
                    <TableCell>{credentialType.CredentialTypeId}</TableCell>
                    <TableCell>{credentialType.CredentialTypeName}</TableCell>
                    <TableCell>
                      {credentialType.URL ? (
                        <a href={credentialType.URL} target="_blank" rel="noopener noreferrer">
                          {credentialType.URL}
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        style={{
                          color: credentialType.Status === 'Active' ? 'green' : 'red',
                          fontWeight: 'bold',
                        }}
                      >
                        {credentialType.Status}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton
                          color="primary"
                          onClick={() => handleEditCredentialType(credentialType.CredentialTypeId)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {/* <Tooltip title="Delete">
                        <IconButton
                          color="error"
                          onClick={() => handleOpenDeleteDialog(credentialType.CredentialTypeId)}
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip> */}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
        />
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <TextField
            margin="normal"
            name="CredentialTypeName"
            label="Credential Type Name"
            type="text"
            fullWidth
            variant="outlined"
            value={currentCredentialType.CredentialTypeName || ''}
            onChange={handleInputChange}
            required
          />

          <TextField
            margin="normal"
            name="URL"
            label="URL (Optional)"
            type="url"
            fullWidth
            variant="outlined"
            value={currentCredentialType.URL || ''}
            onChange={handleInputChange}
          />

          <FormControl fullWidth margin="normal">
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              id="Status"
              name="Status"
              value={currentCredentialType.Status || 'Active'}
              onChange={handleSelectChange as any}
              label="Status"
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button onClick={handleSaveCredentialType} variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this credential type? This action cannot be undone.
          </Typography>
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            Note: If this credential type is in use by any credentials, the deletion will fail.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDeleteCredentialType} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
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
    </Box>
  );
};

export default CredentialTypesScreen;
