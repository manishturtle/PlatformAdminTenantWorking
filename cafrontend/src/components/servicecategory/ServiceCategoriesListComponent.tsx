import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Typography,
  Chip,
  Tooltip,
  CircularProgress,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { ServiceCategory } from '../../types/servicecategory';
import { serviceCategoryApi } from '@/services/api';
import ServiceCategoryDialog from './ServiceCategoryDialog';

const ServiceCategoriesListComponent: React.FC = () => {
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ServiceCategory | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  // Fetch service categories on component mount
  useEffect(() => {
    fetchServiceCategories();
  }, []);

  const fetchServiceCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get full service category data, not the dropdown-simplified version
      const response = await serviceCategoryApi.getServiceCategories({});
      // Ensure we're using the results array from the response
      setServiceCategories(response.results || []);
    } catch (error: any) {
      handleError(error);
      setServiceCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setSelectedCategory(undefined);
    setDialogOpen(true);
  };

  const handleEditClick = (category: ServiceCategory) => {
    setSelectedCategory(category);
    setDialogOpen(true);
  };

  const handleDeleteClick = (category: ServiceCategory) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      setActionInProgress(categoryToDelete.servicecategoryid);
      await serviceCategoryApi.deleteServiceCategory(categoryToDelete.servicecategoryid);
      handleSuccess('Service category deleted successfully');
      fetchServiceCategories();
    } catch (error: any) {
      handleError(error);
    } finally {
      setActionInProgress(null);
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedCategory(undefined);
  };

  const handleDialogSuccess = useCallback(async (formData: any) => {
    try {
      setActionInProgress(selectedCategory?.servicecategoryid || -1);
      
      let savedCategory;
      
      if (selectedCategory) {
        // Update existing category
        console.log('Updating service category:', selectedCategory.servicecategoryid, formData);
        savedCategory = await serviceCategoryApi.updateServiceCategory(
          selectedCategory.servicecategoryid,
          {
            ...formData,
            // Ensure proper casing for backend fields
            servicecategoryname: formData.servicecategoryname,
            sopid: formData.sopid,
            status: formData.status
          }
        );
        handleSuccess(`Service category updated successfully`);
      } else {
        // Create new category
        console.log('Creating new service category:', formData);
        savedCategory = await serviceCategoryApi.createServiceCategory({
          ...formData,
          // Ensure proper casing for backend fields
          servicecategoryname: formData.servicecategoryname,
          sopid: formData.sopid,
          status: formData.status
        });
        handleSuccess(`Service category created successfully`);
      }
      
      // Update local state with the saved category
      setServiceCategories(prev => {
        if (selectedCategory) {
          return prev.map(c => 
            c.servicecategoryid === savedCategory.servicecategoryid ? savedCategory : c
          );
        } else {
          return [...prev, savedCategory].sort((a, b) => a.servicecategoryid - b.servicecategoryid);
        }
      });
      
      // Close dialog and reset selection
      setDialogOpen(false);
      setSelectedCategory(undefined);
    } catch (error: any) {
      handleError(error);
    } finally {
      setActionInProgress(null);
    }
  }, [selectedCategory]);

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'success' : 'error';
  };

  const handleError = (error: any) => {
    const message = error?.response?.data?.detail || 'An error occurred';
    setError(message);
  };

  const handleSuccess = (message: string) => {
    setSuccessMessage(message);
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error !== null || successMessage !== null) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, successMessage]);

  if (loading && serviceCategories.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h1">
          Service Categories
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Add Service Category
        </Button>
      </Box>

      {/* Error Alert */}
      <Snackbar
        open={Boolean(error)}
        autoHideDuration={5000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error">
          {error || 'An error occurred'}
        </Alert>
      </Snackbar>

      {/* Success Alert */}
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert onClose={() => setSuccessMessage(null)} severity="success">
          {successMessage || ''}
        </Alert>
      </Snackbar>

      {/* Loading Overlay */}
      {loading && serviceCategories.length > 0 && (
        <Box 
          position="absolute" 
          top={0} 
          left={0} 
          right={0} 
          bottom={0} 
          display="flex" 
          alignItems="center" 
          justifyContent="center" 
          bgcolor="rgba(255, 255, 255, 0.7)"
          zIndex={1}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Table */}
      <TableContainer component={Paper} elevation={2}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>SOP</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceCategories.map((category) => (
              <TableRow 
                key={category.servicecategoryid}
                sx={{
                  opacity: actionInProgress === category.servicecategoryid ? 0.5 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <TableCell>{category.servicecategoryid}</TableCell>
                <TableCell>{category.servicecategoryname}</TableCell>
                <TableCell>
                  {category.sop_details ? (
                    category.sop_details.SOPName
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No SOP assigned
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={category.status}
                    color={getStatusColor(category.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton
                      onClick={() => handleEditClick(category)}
                      color="primary"
                      size="small"
                      disabled={actionInProgress === category.servicecategoryid}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  {/* <Tooltip title="Delete">
                    <IconButton
                      onClick={() => handleDeleteClick(category)}
                      color="error"
                      size="small"
                      disabled={actionInProgress === category.servicecategoryid}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip> */}
                </TableCell>
              </TableRow>
            ))}
            {serviceCategories.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    No service categories found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <ServiceCategoryDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSuccess}
        initialData={selectedCategory}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          Delete Service Category
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete the service category "
            {categoryToDelete?.servicecategoryname}"? This action cannot be undone.
            {categoryToDelete?.sop_details && (
              <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                Warning: This category is linked to SOP "{categoryToDelete.sop_details.SOPName}".
              </Typography>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel}
            disabled={actionInProgress === categoryToDelete?.servicecategoryid}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={actionInProgress === categoryToDelete?.servicecategoryid}
            startIcon={actionInProgress === categoryToDelete?.servicecategoryid && (
              <CircularProgress size={20} color="inherit" />
            )}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceCategoriesListComponent;
