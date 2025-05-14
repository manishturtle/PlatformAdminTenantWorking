import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import { processApi } from '@/services/api';
import { Process, ProcessFormData } from '../../types/process';
import AddEditProcessScreen from './AddEditProcessScreen';

interface ProcessMasterScreenProps {
  inConfigPage?: boolean; // Optional prop to indicate if component is used in config page
}

const ProcessMasterScreen: React.FC<ProcessMasterScreenProps> = ({ inConfigPage = false }) => {
  // State for processes data
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Dialog states
  const [openAddEditDialog, setOpenAddEditDialog] = useState<boolean>(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [currentProcess, setCurrentProcess] = useState<Process | null>(null);
  const router = useRouter();
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load processes on component mount and when pagination/search changes
  useEffect(() => {
    fetchProcesses();
  }, [page, rowsPerPage, searchTerm]);

  // Fetch processes from API
  const fetchProcesses = async () => {
    setLoading(true);
    setError(null);
    try {
      try {
        // Try to fetch from the API
        const response = await processApi.getProcesses(page + 1, rowsPerPage, searchTerm);
        setProcesses(response.results);
        setTotalCount(response.count);
      } catch (apiError) {
        // If the API endpoint doesn't exist, use mock data
        console.warn('Process API endpoint not available, using mock data');
        const mockData = [
          { processid: 1, processname: 'Income Tax Return Filing', description: 'Process for filing income tax returns', is_active: true },
          { processid: 2, processname: 'GST Registration', description: 'Process for GST registration', is_active: true },
          { processid: 3, processname: 'TDS Filing', description: 'Process for TDS filing', is_active: true },
          { processid: 4, processname: 'Company Registration', description: 'Process for company registration', is_active: false },
        ];
        
        // Filter mock data based on search term
        let filteredData = [...mockData];
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          filteredData = filteredData.filter(item => 
            item.processname.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search)
          );
        }
        
        // Handle pagination
        const startIndex = page * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedData = filteredData.slice(startIndex, endIndex);
        
        setProcesses(paginatedData);
        setTotalCount(filteredData.length);
      }
    } catch (err: any) {
      console.error('Error handling processes:', err);
      setError(err.message || 'Failed to fetch processes');
    } finally {
      setLoading(false);
    }
  };

  // Handle dialog open/close
  const handleAddProcess = () => {
    router.push('/processes/add');
  };

  const handleEditProcess = (process: Process) => {
    router.push(`/processes/edit/${process.ProcessId}`);
  };

  const handleOpenDeleteDialog = (process: Process) => {
    setCurrentProcess(process);
    setOpenDeleteDialog(true);
  };

  const handleCloseDialogs = () => {
    setOpenDeleteDialog(false);
  };



  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0); // Reset to first page when searching
  };

  // Handle pagination changes
  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };



  const handleDeleteProcess = async () => {
    if (!currentProcess) return;
    
    try {
      await processApi.deleteProcess(currentProcess.ProcessId);
      handleCloseDialogs();
      fetchProcesses();
      setSnackbar({
        open: true,
        message: 'Process deleted successfully',
        severity: 'success'
      });
    } catch (err: any) {
      console.error('Error deleting process:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Failed to delete process',
        severity: 'error'
      });
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };



  return (
    <Card>
      <CardHeader 
        title={!inConfigPage ? "Process Management" : undefined}
        subheader={!inConfigPage ? "Manage business processes for your organization" : undefined}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddProcess}
            size="large"
            sx={{ mt: 1, mb: 1, fontWeight: 'bold' }}
          >
            Add New Process
          </Button>
        }
      />
      <CardContent>
        {/* Search Bar */}
        <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <TextField
            label="Search Processes"
            variant="outlined"
            size="small"
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            InputProps={{
              endAdornment: <SearchIcon />
            }}
            sx={{ maxWidth: 500 }}
          />
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Processes Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="5%">ID</TableCell>
                <TableCell width="20%">Process Name</TableCell>
                <TableCell width="25%">Description</TableCell>
                <TableCell width="10%">Audience</TableCell>
                <TableCell width="10%">Status</TableCell>
                <TableCell width="10%">Created At</TableCell>
                <TableCell width="10%">Created By</TableCell>
                <TableCell width="10%" align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : processes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body1">
                      No processes found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                processes.map((process) => (
                  <TableRow key={process.ProcessId}>
                    <TableCell>{process.ProcessId}</TableCell>
                    <TableCell>{process.ProcessName}</TableCell>
                    <TableCell>{process.Description}</TableCell>
                    <TableCell>{process.ProcessAudience}</TableCell>
                    <TableCell>
                      <Box sx={{
                        display: 'inline-block',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: process.Status === 'Active' ? 'success.light' : 'error.light',
                        color: 'white',
                        fontWeight: 'medium',
                        fontSize: '0.75rem'
                      }}>
                        {process.Status}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(process.CreatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{process.CreatedBy || 'System'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton 
                          color="primary" 
                          onClick={() => handleEditProcess(process)}
                          title="Edit Process"
                          size="medium"
                          sx={{ 
                            mx: 0.5,
                            '&:hover': { 
                              backgroundColor: 'rgba(25, 118, 210, 0.1)' 
                            } 
                          }}
                        >
                          <EditIcon />
                        </IconButton>
                        {/* <IconButton 
                          color="error" 
                          onClick={() => handleOpenDeleteDialog(process)}
                          title="Delete Process"
                          size="medium"
                          sx={{ 
                            mx: 0.5,
                            '&:hover': { 
                              backgroundColor: 'rgba(211, 47, 47, 0.1)' 
                            } 
                          }}
                        >
                          <DeleteIcon />
                        </IconButton> */}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </CardContent>



      {/* Delete Process Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDialogs}>
        <DialogTitle>Delete Process</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the process "{currentProcess?.ProcessName}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialogs}>Cancel</Button>
          <Button onClick={handleDeleteProcess} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
};

export default ProcessMasterScreen;
