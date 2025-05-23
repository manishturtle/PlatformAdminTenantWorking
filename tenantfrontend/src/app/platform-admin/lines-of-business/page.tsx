'use client';

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
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { LineOfBusiness } from '@/types/lineOfBusiness';
import { getLineOfBusinesses, createLineOfBusiness, updateLineOfBusiness, deleteLineOfBusiness } from '@/services/lineOfBusinessService';

export default function LineOfBusinessPage() {
  const [lineOfBusinesses, setLineOfBusinesses] = useState<LineOfBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentLineOfBusiness, setCurrentLineOfBusiness] = useState<LineOfBusiness | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // Fetch line of businesses on component mount
  useEffect(() => {
    fetchLineOfBusinesses();
  }, []);

  const fetchLineOfBusinesses = async () => {
    setLoading(true);
    try {
      const data = await getLineOfBusinesses();
      setLineOfBusinesses(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch line of businesses');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (lineOfBusiness?: LineOfBusiness) => {
    if (lineOfBusiness) {
      setCurrentLineOfBusiness(lineOfBusiness);
      setFormData({
        name: lineOfBusiness.name,
        description: lineOfBusiness.description || '',
        is_active: lineOfBusiness.is_active
      });
    } else {
      setCurrentLineOfBusiness(null);
      setFormData({
        name: '',
        description: '',
        is_active: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'is_active' ? checked : value
    });
  };

  const handleSubmit = async () => {
    try {
      if (currentLineOfBusiness) {
        // Update existing line of business
        await updateLineOfBusiness(currentLineOfBusiness.id, formData);
        setSnackbar({
          open: true,
          message: 'Line of Business updated successfully',
          severity: 'success'
        });
      } else {
        // Create new line of business
        await createLineOfBusiness(formData);
        setSnackbar({
          open: true,
          message: 'Line of Business created successfully',
          severity: 'success'
        });
      }
      handleCloseDialog();
      fetchLineOfBusinesses();
    } catch (err) {
      setSnackbar({
        open: true,
        message: `Failed to ${currentLineOfBusiness ? 'update' : 'create'} Line of Business`,
        severity: 'error'
      });
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this Line of Business?')) {
      try {
        await deleteLineOfBusiness(id);
        setSnackbar({
          open: true,
          message: 'Line of Business deleted successfully',
          severity: 'success'
        });
        fetchLineOfBusinesses();
      } catch (err) {
        setSnackbar({
          open: true,
          message: 'Failed to delete Line of Business',
          severity: 'error'
        });
        console.error(err);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Lines of Business
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add New
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 200px)' }}>
          <Table stickyHeader aria-label="sticky table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell>Updated At</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : lineOfBusinesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No lines of business found
                  </TableCell>
                </TableRow>
              ) : (
                lineOfBusinesses.map((lineOfBusiness) => (
                  <TableRow key={lineOfBusiness.id}>
                    <TableCell>{lineOfBusiness.id}</TableCell>
                    <TableCell>{lineOfBusiness.name}</TableCell>
                    <TableCell>{lineOfBusiness.description || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={lineOfBusiness.is_active ? 'Active' : 'Inactive'} 
                        color={lineOfBusiness.is_active ? 'success' : 'default'} 
                        size="small" 
                      />
                    </TableCell>
                    <TableCell>{new Date(lineOfBusiness.created_at).toLocaleString()}</TableCell>
                    <TableCell>{new Date(lineOfBusiness.updated_at).toLocaleString()}</TableCell>
                    <TableCell align="center">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleOpenDialog(lineOfBusiness)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDelete(lineOfBusiness.id)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentLineOfBusiness ? 'Edit Line of Business' : 'Add New Line of Business'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              autoFocus
              margin="dense"
              name="name"
              label="Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={handleInputChange}
              required
              sx={{ mb: 2 }}
            />
            <TextField
              margin="dense"
              name="description"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.description}
              onChange={handleInputChange}
              multiline
              rows={4}
              sx={{ mb: 2 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={handleInputChange}
                  name="is_active"
                  color="primary"
                />
              }
              label="Active"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            color="primary" 
            variant="contained"
            disabled={!formData.name.trim()}
          >
            {currentLineOfBusiness ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
