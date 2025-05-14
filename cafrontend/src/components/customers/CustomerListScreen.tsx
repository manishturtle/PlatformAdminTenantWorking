import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  SelectChangeEvent,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridPaginationModel } from '@mui/x-data-grid';
import { 
  Add as AddIcon, 
  Edit as EditIcon,
  PersonAdd as PersonAddIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { customerApi } from '../../services/api';
import { Customer, CustomerListResponse, CustomerFilters, CUSTOMER_TYPE_OPTIONS, SOURCE_OPTIONS } from '../../types/customer';
import ConvertLeadModalNew from './ConvertLeadModal';
import FeatureGuard from '../common/FeatureGuard';

// Add All Types option to customer type options
const CUSTOMER_TYPES = [
  { value: '', label: 'All Types' },
  ...CUSTOMER_TYPE_OPTIONS
];

// Add All Sources option to source options
const SOURCE_TYPES = [
  { value: '', label: 'All Sources' },
  ...SOURCE_OPTIONS
];

// Define the CustomerListScreen component
const CustomerListScreen: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  // State variables
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rowCount, setRowCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customerType, setCustomerType] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 100,
  });

  const [sortModel, setSortModel] = useState([{
    field: 'UpdatedAt',
    sort: 'desc'
  }]);
  
  // State for Convert Lead Modal
  const [convertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Create rows array from customers data
  const rows = customers.map((customer) => {
    // Create a copy of the customer without the Password field
    // This ensures the Password is not included in the DataGrid
    const { Password, ...customerWithoutPassword } = customer;
    return {
      ...customerWithoutPassword,
      id: customer.CustomerID, // Ensure each row has an id for DataGrid
      hasPassword: !!Password, // Add a flag to indicate if the customer has a password
    };
  });

  // Define columns for the DataGrid
  const columns: GridColDef[] = [
    { 
      field: 'CustomerID', 
      headerName: 'ID', 
      width: 70,
      flex: 0.3,
      minWidth: 60
    },
    {
      field: 'Name',
      headerName: 'Name',
      width: 180,
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams) => {
        if (!params || !params.row) return '';
        try {
          const row = params.row as Customer;
          return `${row.FirstName || ''} ${row.LastName || ''}`.trim() || '-';
        } catch (error) {
          console.error('Error in Name renderCell:', error);
          return '';
        }
      },
    },
    { 
      field: 'Email', 
      headerName: 'Email', 
      width: 200, 
      flex: 1,
      minWidth: 150,
      hide: isMobile
    },
    { 
      field: 'Phone', 
      headerName: 'Phone', 
      width: 120, 
      flex: 0.7,
      minWidth: 120,
      hide: isTablet
    },
    { 
      field: 'AadharCard', 
      headerName: 'Aadhar Card', 
      width: 130, 
      flex: 0.7,
      minWidth: 120,
      hide: !isDesktop
    },
    { 
      field: 'PANCard', 
      headerName: 'PAN Card', 
      width: 130, 
      flex: 0.7,
      minWidth: 120,
      hide: !isDesktop
    },
    { 
      field: 'CustomerType', 
      headerName: 'Type', 
      width: 100, 
      flex: 0.5,
      minWidth: 90
    },
    { 
      field: 'Source', 
      headerName: 'Source', 
      width: 120, 
      flex: 0.7,
      minWidth: 100,
      hide: isTablet
    },
    { 
      field: 'ChannelPartner', 
      headerName: 'Channel Partner', 
      width: 150, 
      flex: 0.8,
      minWidth: 120,
      hide: !isDesktop
    },
    { 
      field: 'ReferredBy', 
      headerName: 'Referred By', 
      width: 150, 
      flex: 0.8,
      minWidth: 120,
      hide: !isDesktop
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      flex: 0.5,
      minWidth: 100,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => {
        const customer = params.row as Customer;
        const customerId = customer.CustomerID;
        
        return (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {customer.CustomerType !== 'Lead' && (
              <Tooltip title="View Customer">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click event
                    handleViewClick(customerId);
                  }}
                  color="info"
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            
            <Tooltip title="Edit Customer">
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent row click event
                  handleEditClick(customerId);
                }}
                color="primary"
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            {customer.CustomerType === 'Lead' && (
              <Tooltip title="Convert to Customer">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click event
                    handleConvertToCustomerClick(customerId);
                  }}
                  color="secondary"
                >
                  <PersonAddIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
  ];

  // Fetch customers data from API
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Use the customerApi from services/api.ts
      const filters: CustomerFilters = {
        search: searchTerm,
        customer_type: customerType,
        source: source,
        page: paginationModel.page + 1, // API uses 1-based indexing
        page_size: paginationModel.pageSize,
        ordering: '-UpdatedAt' // Sort by UpdatedAt in descending order
      };
      
      const response = await customerApi.getCustomers(filters);
      
      // Check if we have results
      if (response && 'results' in response && Array.isArray(response.results)) {
        // Ensure each customer has the Password field defined (even if null)
        const customersWithPasswordField = response.results.map(customer => ({
          ...customer,
          Password: customer.Password || null
        }));
        
        setCustomers(customersWithPasswordField);
        setRowCount(response.count || 0);
      } else {
        console.error('Unexpected API response format:', response);
        setError('Received invalid data format from the server.');
      }
    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to fetch customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, customerType, source, paginationModel]);

  // Fetch customers on component mount and when dependencies change
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPaginationModel({ ...paginationModel, page: 0 }); // Reset to first page on search
  };

  // Handle customer type filter change
  const handleCustomerTypeChange = (event: SelectChangeEvent) => {
    setCustomerType(event.target.value);
    setPaginationModel({ ...paginationModel, page: 0 }); // Reset to first page on filter change
  };

  // Handle source filter change
  const handleSourceChange = (event: SelectChangeEvent) => {
    setSource(event.target.value);
    setPaginationModel({ ...paginationModel, page: 0 }); // Reset to first page on filter change
  };
  
  // Handle pagination model change
  const handlePaginationModelChange = (newModel: GridPaginationModel) => {
    setPaginationModel(newModel);
  };

  // Handle add customer action
  const handleAddCustomerClick = () => {
    router.push('/customers/add');
  };

  // Handle add lead action
  const handleAddLeadClick = () => {
    router.push('/customers/add?type=lead');
  };

  // Handle edit customer action
  const handleEditClick = (id: number) => {
    router.push(`/customers/edit/${id}`);
  };

  // Handle view customer details action
  const handleViewClick = (id: number) => {
    router.push(`/customers/details/${id}`);
  };

  // Handle convert lead to customer action
  const handleConvertToCustomerClick = (id: number) => {
    // Find the customer by ID
    const customer = customers.find(c => c.CustomerID === id);
    if (customer) {
      setSelectedCustomer(customer);
      setConvertModalOpen(true);
    } else {
      console.error(`Customer with ID ${id} not found`);
    }
  };

  return (
    <Box sx={{ width: '100%', p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Customers
      </Typography>
      
      {/* Filters and Add Customer Button */}
      <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
        <Grid item xs={12} sm={3}>
          <TextField
            label="Search"
            variant="outlined"
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Name, Email"
            size="small"
          />
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="customer-type-label">Customer Type</InputLabel>
            <Select
              labelId="customer-type-label"
              value={customerType}
              label="Customer Type"
              onChange={handleCustomerTypeChange}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: 'auto'
                  },
                },
              }}
            >
              {CUSTOMER_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={3}>
          <FormControl fullWidth size="small">
            <InputLabel id="source-label">Source</InputLabel>
            <Select
              labelId="source-label"
              value={source}
              label="Source"
              onChange={handleSourceChange}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    width: 'auto'
                  },
                },
              }}
            >
              {SOURCE_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid item xs={12} sm={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <FeatureGuard moduleKey="customers" featureKey="add_lead">
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={handleAddLeadClick}
            >
              Add Lead
            </Button>
          </FeatureGuard>
          <FeatureGuard moduleKey="customers" featureKey="add_customer">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={handleAddCustomerClick}
            >
              Add Customer
            </Button>
          </FeatureGuard>
        </Grid>
      </Grid>
      
      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* DataGrid */}
      <Box sx={{ height: 'calc(100vh - 250px)', minHeight: '800px', width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          pageSizeOptions={[25, 50, 100]}
          paginationModel={paginationModel}
          paginationMode="server"
          onPaginationModelChange={handlePaginationModelChange}
          sortModel={sortModel}
          onSortModelChange={(model) => setSortModel(model)}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-cell:focus': {
              outline: 'none',
            },
          }}
        />
      </Box>
      
      {/* Convert Lead Modal */}
      <ConvertLeadModalNew
        open={convertModalOpen}
        customer={selectedCustomer}
        onClose={() => setConvertModalOpen(false)}
        onSuccess={() => {
          setConvertModalOpen(false);
          fetchCustomers();
        }}
      />
    </Box>
  );
};

export default CustomerListScreen;
