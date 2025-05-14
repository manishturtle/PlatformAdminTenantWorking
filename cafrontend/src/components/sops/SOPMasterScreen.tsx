import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  FormHelperText,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Check as CheckIcon, Visibility as VisibilityIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { Checkbox, FormControlLabel } from '@mui/material';
import { SOP, SOPFormData } from '../../types/sop';
import { sopApi, processApi, serviceCategoryApi } from '@/services/api';
import { Process } from '../../types/process';
import { useRouter } from 'next/router';
import { format as dateFormat } from 'date-fns';

interface SOPMasterScreenProps {
  processId?: number; // Optional: If provided, will only show SOPs for this process
  showAll?: boolean; // Optional: If true, will show all SOPs including inactive ones
}

const SOPMasterScreen: React.FC<SOPMasterScreenProps> = ({ processId, showAll: initialShowAll = false }) => {
  // State for showing inactive SOPs
  const [showInactive, setShowInactive] = useState(initialShowAll);
  const router = useRouter();
  // State for SOP list
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // State for processes
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loadingProcesses, setLoadingProcesses] = useState(false);
  
  // State for SOP form dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [formData, setFormData] = useState<SOPFormData>({
    SOPName: '',
    Description: '',
    VersionEffectiveDate: null,
    Status: 'Active'
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // State for notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  

  
  // Load SOPs on page changes, when processId changes, or when showInactive changes
  useEffect(() => {
    const loadSOPs = async () => {
      setLoading(true);
      setError(null);
      
      try {
        try {
          // Try to fetch from the API
          let response;
          
          if (processId) {
            // If processId is provided, filter SOPs by that process
            response = await sopApi.getSOPs({
              process_id: processId,
              page: page + 1, // API uses 1-based pagination
              page_size: rowsPerPage
            });
          } else {
            // Otherwise, get all SOPs (active only by default)
            response = await sopApi.getSOPs({
              page: page + 1,
              page_size: rowsPerPage,
              // If showInactive is true, don't filter by status
              // If showInactive is false, only show Active SOPs
              ...(showInactive ? {} : { Status: 'Active' })
            });
          }
          
          setSOPs(response.results);
          setTotalCount(response.count);
        } catch (apiError) {
          // If the API endpoint doesn't exist, use mock data
          console.warn('SOP API endpoint not available, using mock data');
          const mockData = [
            { 
              sopid: 1, 
              sopname: 'Income Tax Return Filing SOP', 
              description: 'Standard Operating Procedure for filing income tax returns', 
              versioneffectivedate: '2023-04-01', 
              status: 'Active',
              processid: 1,
              processname: 'Income Tax Return Filing'
            },
            { 
              sopid: 2, 
              sopname: 'GST Registration SOP', 
              description: 'Standard Operating Procedure for GST registration', 
              versioneffectivedate: '2023-03-15', 
              status: 'Active',
              processid: 2,
              processname: 'GST Registration'
            },
            { 
              sopid: 3, 
              sopname: 'TDS Filing SOP', 
              description: 'Standard Operating Procedure for TDS filing', 
              versioneffectivedate: '2023-05-10', 
              status: 'Active',
              processid: 3,
              processname: 'TDS Filing'
            },
            { 
              sopid: 4, 
              sopname: 'Company Registration SOP', 
              description: 'Standard Operating Procedure for company registration', 
              versioneffectivedate: '2023-02-20', 
              status: 'Inactive',
              processid: 4,
              processname: 'Company Registration'
            },
          ];
          
          // Filter mock data based on process ID if provided
          let filteredData = [...mockData];
          if (processId) {
            filteredData = filteredData.filter(sop => sop.processid === processId);
          }
          
          // Filter by status if not showing inactive
          if (!showInactive) {
            filteredData = filteredData.filter(sop => sop.status === 'Active');
          }
          
          // Handle pagination
          const startIndex = page * rowsPerPage;
          const endIndex = startIndex + rowsPerPage;
          const paginatedData = filteredData.slice(startIndex, endIndex);
          
          setSOPs(paginatedData);
          setTotalCount(filteredData.length);
        }
      } catch (err) {
        console.error('Error handling SOPs:', err);
        setError('Failed to load SOPs. Please try again later.');
        setSOPs([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadSOPs();
  }, [processId, page, rowsPerPage, showInactive]);
  
  // Load processes for the dropdown
  useEffect(() => {
    const loadProcesses = async () => {
      setLoadingProcesses(true);
      try {
        const response = await processApi.getProcesses(1, 100); // Get up to 100 processes
        setProcesses(response.results);
      } catch (err) {
        console.error('Error loading processes:', err);
        setProcesses([]);
      } finally {
        setLoadingProcesses(false);
      }
    };
    
    loadProcesses();
  }, []);
  
  // Handle page change
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  // Handle checkbox change for showing inactive SOPs
  const handleShowInactiveChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowInactive(event.target.checked);
    // Reset to first page when filter changes
    setPage(0);
  };
  
  // Handle rows per page change
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  

  
  // Open dialog for adding a new SOP
  const handleAddSOP = () => {
    setDialogTitle('Add New SOP');
    setEditingSOP(null);
    setFormData({
      SOPName: '',
      Description: '',
      // Set current date automatically for VersionEffectiveDate (will be hidden from UI)
      VersionEffectiveDate: new Date().toISOString().split('T')[0],
      Status: 'Active',
      ProcessId: processId || undefined
    });
    setFormErrors({});
    setOpenDialog(true);
  };
  
  // Open dialog for editing an existing SOP
  const handleEditSOP = async (sop: SOP) => {
    setDialogTitle('Edit SOP');
    setEditingSOP(sop);
    setFormData({
      SOPName: sop.SOPName,
      Description: sop.Description || '',
      VersionEffectiveDate: sop.VersionEffectiveDate,
      Status: sop.Status,
      ProcessId: sop.ProcessId
    });
    setFormErrors({});
    setOpenDialog(true);
  };
  
  // Handle form field changes
  const handleFormChange = (e: any) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name as string]: value
    }));
    
    // Clear validation error when field is changed
    if (name && formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.SOPName.trim()) {
      errors.SOPName = 'SOP Name is required';
    }
    
    if (!formData.ProcessId) {
      errors.ProcessId = 'Process is required';
    }
    
    if (formData.VersionEffectiveDate && isNaN(Date.parse(formData.VersionEffectiveDate))) {
      errors.VersionEffectiveDate = 'Invalid date format';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      // Always set the current date for VersionEffectiveDate
      const dataToSubmit = {
        ...formData,
        VersionEffectiveDate: new Date().toISOString().split('T')[0]
      };
      
      if (editingSOP) {
        // Update existing SOP
        await sopApi.updateSOP(editingSOP.SOPId, dataToSubmit);

        // If status is being changed to Inactive, update related service categories
        if (dataToSubmit.Status === 'Inactive' && editingSOP.Status !== 'Inactive') {
          try {
            // Get all service categories for this SOP
            const categoriesResponse = await serviceCategoryApi.getServiceCategories();
            const relatedCategories = categoriesResponse.results.filter(cat => cat.sopid === editingSOP.SOPId);

            // Update each related service category to Inactive
            for (const category of relatedCategories) {
              await serviceCategoryApi.updateServiceCategory(category.servicecategoryid, {
                servicecategoryname: category.servicecategoryname,
                sopid: category.sopid,
                status: 'Inactive'
              });
            }

            if (relatedCategories.length > 0) {
              setNotification({ 
                message: `SOP and ${relatedCategories.length} related service categories updated to Inactive`, 
                type: 'success' 
              });
            } else {
              setNotification({ message: 'SOP updated successfully', type: 'success' });
            }
          } catch (error) {
            console.error('Error updating service categories:', error);
            setNotification({ 
              message: 'SOP updated but failed to update some service categories', 
              type: 'warning' 
            });
          }
        } else {
          setNotification({ message: 'SOP updated successfully', type: 'success' });
        }
      } else {
        // Create new SOP
        if (!dataToSubmit.ProcessId) {
          setNotification({ message: 'Process ID is required', type: 'error' });
          return;
        }
        await sopApi.createSOP(dataToSubmit, dataToSubmit.ProcessId);
        setNotification({ message: 'SOP created successfully', type: 'success' });
      }
      
      // Refresh the SOP list
      let response;
      if (processId) {
        response = await sopApi.getSOPsByProcess(
          processId,
          page + 1,
          rowsPerPage
        );
      } else {
        response = await sopApi.getSOPs({
          page: page + 1,
          page_size: rowsPerPage,
          ...(showInactive ? {} : { Status: 'Active' })
        });
      }
      
      setSOPs(response.results);
      setTotalCount(response.count);
      setOpenDialog(false);
    } catch (err) {
      console.error('Error saving SOP:', err);
      setNotification({ message: 'Failed to save SOP. Please try again.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Navigate to SOP steps page
  const handleViewSOPDetails = (sop: SOP) => {
    router.push(`/sops/${sop.SOPId}/steps`);
  };

  // Handle SOP activation
  const handleActivateSOP = async (sop: SOP) => {
    
    try {
      await sopApi.activateSOP(sop.SOPId);
      
      // Refresh the SOP list
      let response;
      if (processId) {
        response = await sopApi.getSOPsByProcess(
          processId,
          page + 1,
          rowsPerPage
        );
      } else {
        response = await sopApi.getSOPs({
          page: page + 1,
          page_size: rowsPerPage,
          ...(showInactive ? {} : { Status: 'Active' })
        });
      }
      
      setSOPs(response.results);
      setNotification({ message: 'SOP activated successfully', type: 'success' });
    } catch (err) {
      console.error('Error activating SOP:', err);
      setNotification({ message: 'Failed to activate SOP. Please try again.', type: 'error' });
    }
  };
  
  // Handle SOP deletion
  const handleDeleteSOP = async (sop: SOP) => {
    if (!window.confirm(`Are you sure you want to delete "${sop.SOPName}" (Version ${sop.Version})?`)) {
      return;
    }
    
    try {
      await sopApi.deleteSOP(sop.SOPId);
      
      // Refresh the SOP list
      let response;
      if (processId) {
        response = await sopApi.getSOPsByProcess(
          processId,
          page + 1,
          rowsPerPage
        );
      } else {
        response = await sopApi.getSOPs({
          page: page + 1,
          page_size: rowsPerPage,
          ...(showInactive ? {} : { Status: 'Active' })
        });
      }
      
      setSOPs(response.results);
      setTotalCount(response.count);
      setNotification({ message: 'SOP deleted successfully', type: 'success' });
    } catch (err) {
      console.error('Error deleting SOP:', err);
      setNotification({ message: 'Failed to delete SOP. Please try again.', type: 'error' });
    }
  };
  
  // Close notification
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return dateFormat(new Date(dateString), 'dd/MM/yyyy');
    } catch (e) {
      return 'Invalid Date';
    }
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1">
          Standard Operating Procedures
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={showInactive}
                onChange={handleShowInactiveChange}
                color="primary"
              />
            }
            label="Show Inactive SOPs"
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddSOP}
          >
            Add SOP
          </Button>
        </Box>
      </Box>
      
      {/* Process dropdown removed as per requirements */}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="SOP table">
            <TableHead>
              <TableRow>
                <TableCell>SOP Name</TableCell>
                <TableCell>Process</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Effective Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : sops.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No SOPs found
                  </TableCell>
                </TableRow>
              ) : (
                sops.map(sop => (
                  <TableRow key={sop.SOPId} hover>
                    <TableCell>{sop.SOPName}</TableCell>
                    <TableCell>{sop.process?.ProcessName || 'N/A'}</TableCell>
                    <TableCell>{sop.Version}</TableCell>
                    <TableCell>{formatDate(sop.VersionEffectiveDate)}</TableCell>
                    <TableCell>
                      <Chip
                        label={sop.Status}
                        color={sop.Status === 'Active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditSOP(sop)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {sop.Status !== 'Active' && (
                        <Tooltip title="Activate">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleActivateSOP(sop)}
                          >
                            <CheckIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {/* <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteSOP(sop)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip> */}
                      
                      <Tooltip title="View Steps">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleViewSOPDetails(sop)}
                        >
                          <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      {/* Add/Edit SOP Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogTitle}</DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="SOPName"
              label="SOP Name"
              name="SOPName"
              value={formData.SOPName}
              onChange={handleFormChange}
              error={!!formErrors.SOPName}
              helperText={formErrors.SOPName}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="Description"
              label="Description"
              name="Description"
              multiline
              rows={4}
              value={formData.Description}
              onChange={handleFormChange}
            />
            
            {/* VersionEffectiveDate field removed - will be set automatically */}
            
            <FormControl fullWidth margin="normal" required>
              <InputLabel id="process-label">Process</InputLabel>
              <Select
                labelId="process-label"
                id="ProcessId"
                name="ProcessId"
                value={formData.ProcessId || ''}
                onChange={handleFormChange as any}
                label="Process"
                error={!!formErrors.ProcessId}
              >
                {loadingProcesses ? (
                  <MenuItem disabled>Loading processes...</MenuItem>
                ) : processes.length === 0 ? (
                  <MenuItem disabled>No processes available</MenuItem>
                ) : (
                  processes.map(process => (
                    <MenuItem key={process.ProcessId} value={process.ProcessId}>
                      {process.ProcessName}
                    </MenuItem>
                  ))
                )}
              </Select>
              {formErrors.ProcessId && (
                <FormHelperText error>{formErrors.ProcessId}</FormHelperText>
              )}
            </FormControl>
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                id="Status"
                name="Status"
                value={formData.Status}
                onChange={handleFormChange as any}
                label="Status"
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            
            {editingSOP && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Version: {editingSOP.Version} (cannot be changed)
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            disabled={submitting}
          >
            {submitting ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Notification Snackbar */}
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

export default SOPMasterScreen;
