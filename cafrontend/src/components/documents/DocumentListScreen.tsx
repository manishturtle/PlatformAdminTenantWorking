import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  CircularProgress,
  Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { documentApi, customerApi, documentTypeApi } from '../../services/api';
import { Document, DocumentType } from '../../types/document';
import { Customer as CustomerType } from '../../types/customer';
import DocumentVersionDrawer from './DocumentVersionDrawer';
import DocumentEditDrawer from './DocumentEditDrawer';

interface Customer extends CustomerType {
  // Add any additional properties needed for this component
}

interface DocumentWithType extends Document {
  document_type_name?: string;
  UserDocuName?: string;
}

const DocumentListScreen: React.FC = () => {
  // State for documents
  const [documents, setDocuments] = useState<DocumentWithType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  
  // State for pagination
  const [page, setPage] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  
  // State for filters
  const [filters, setFilters] = useState<{
    customer_id?: number;
    document_type_id?: number;
    search?: string;
  }>({});
  
  // State for filter options
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(false);
  
  // State for drawers
  const [versionDrawerOpen, setVersionDrawerOpen] = useState<boolean>(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState<boolean>(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  
  // State for download
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Load documents on component mount and when filters or pagination changes
  useEffect(() => {
    fetchDocuments();
  }, [page, rowsPerPage, filters]);

  // Load filter options on component mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentApi.getDocuments({
        ...filters,
        page: page + 1, // API uses 1-based indexing
        page_size: rowsPerPage
      });
      
      setDocuments(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    setLoadingOptions(true);
    try {
      // Fetch customers
      const customersResponse = await customerApi.getCustomers({ page_size: 1000 });
      setCustomers(customersResponse.results || []);
      
      // Fetch document types
      const documentTypesResponse = await documentTypeApi.getDocumentTypes();
      setDocumentTypes(documentTypesResponse.results || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCustomerFilterChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setFilters({
      ...filters,
      customer_id: value === '' ? undefined : Number(value)
    });
    setPage(0);
  };

  const handleDocumentTypeFilterChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setFilters({
      ...filters,
      document_type_id: value === '' ? undefined : Number(value)
    });
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Debounce search input
    const timeoutId = setTimeout(() => {
      setFilters({
        ...filters,
        search: value === '' ? undefined : value
      });
      setPage(0);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const handleRefresh = () => {
    fetchDocuments();
  };

  const handleClearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const handleOpenVersionDrawer = (documentId: number) => {
    setSelectedDocumentId(documentId);
    setVersionDrawerOpen(true);
  };

  const handleCloseVersionDrawer = () => {
    setVersionDrawerOpen(false);
    setSelectedDocumentId(null);
  };

  const handleOpenEditDrawer = (documentId: number) => {
    setSelectedDocumentId(documentId);
    setEditDrawerOpen(true);
  };

  const handleCloseEditDrawer = () => {
    setEditDrawerOpen(false);
    setSelectedDocumentId(null);
  };

  const handleEditSuccess = () => {
    fetchDocuments();
  };

  const handleDownload = async (documentId: number) => {
    setDownloadingId(documentId);
    try {
      const blob = await documentApi.downloadDocument(documentId);
      
      // Get the document name from the list
      const doc = documents.find(doc => doc.DocumentId === documentId);
      const fileName = doc ? doc.DocumentName : `document-${documentId}`;
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      window.document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
    } finally {
      setDownloadingId(null);
    }
  };

  // Helper function to get customer name by ID
  const getCustomerName = (customerId: number): string => {
    const customer = customers.find(c => c.CustomerID === customerId);
    return customer ? `${customer.FirstName} ${customer.LastName}` : `Customer ${customerId}`;
  };

  // Helper function to get document type name
  const getDocumentTypeName = (document: DocumentWithType): string => {
    // First try to use the document_type_name from the API response
    if (document.document_type_name) {
      return document.document_type_name;
    }
    
    // Fallback to looking up the document type by ID
    const docType = documentTypes.find(dt => dt.DocumentTypeId === document.DocumentTypeId);
    return docType ? docType.DocumentTypeName : 'Unknown';
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
            Document Management
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </Box>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="customer-filter-label">Customer</InputLabel>
                  <Select
                    labelId="customer-filter-label"
                    id="customer-filter"
                    value={filters.customer_id?.toString() || ''}
                    label="Customer"
                    onChange={handleCustomerFilterChange}
                    disabled={loadingOptions}
                  >
                    <MenuItem value="">All Customers</MenuItem>
                    {customers.map((customer) => (
                      <MenuItem key={customer.CustomerID} value={customer.CustomerID?.toString() || ''}>
                        {`${customer.FirstName} ${customer.LastName}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel id="document-type-filter-label">Document Type</InputLabel>
                  <Select
                    labelId="document-type-filter-label"
                    id="document-type-filter"
                    value={filters.document_type_id?.toString() || ''}
                    label="Document Type"
                    onChange={handleDocumentTypeFilterChange}
                    disabled={loadingOptions}
                  >
                    <MenuItem value="">All Document Types</MenuItem>
                    {documentTypes.map((docType) => (
                      <MenuItem key={docType.DocumentTypeId} value={docType.DocumentTypeId?.toString() || ''}>
                        {docType.DocumentTypeName}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Search"
                  variant="outlined"
                  onChange={handleSearchChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button 
                    variant="text" 
                    onClick={handleClearFilters}
                    disabled={!filters.customer_id && !filters.document_type_id && !filters.search}
                  >
                    Clear Filters
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Documents Table */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Document ID</TableCell>
                    <TableCell>Customer ID</TableCell>
                    <TableCell>Customer Name</TableCell>
                    <TableCell>File Name</TableCell>
                    <TableCell>Document Name</TableCell>
                    <TableCell>Document Type</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Visibility</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <CircularProgress size={24} sx={{ my: 2 }} />
                      </TableCell>
                    </TableRow>
                  ) : documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No documents found
                      </TableCell>
                    </TableRow>
                  ) : (
                    documents.map((document) => (
                      <TableRow key={document.DocumentId}>
                        <TableCell>{document.DocumentId}</TableCell>
                        <TableCell>{document.CustomerId}</TableCell>
                        <TableCell>{getCustomerName(document.CustomerId)}</TableCell>
                        <TableCell>{document.OriginalName || document.DocumentName}</TableCell>
                        <TableCell>{document.UserDocuName || '-'}</TableCell>
                        <TableCell>
                          {getDocumentTypeName(document)}
                        </TableCell>
                        <TableCell>{document.Version}</TableCell>
                        <TableCell>
                          <Chip
                            label={document.VisibleToCust ? 'Visible' : 'Hidden'}
                            color={document.VisibleToCust ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Download">
                            <IconButton
                              color="primary"
                              onClick={() => handleDownload(document.DocumentId)}
                              disabled={downloadingId === document.DocumentId}
                            >
                              {downloadingId === document.DocumentId ? (
                                <CircularProgress size={24} />
                              ) : (
                                <DownloadIcon />
                              )}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton
                              color="secondary"
                              onClick={() => handleOpenEditDrawer(document.DocumentId)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Versions">
                            <IconButton
                              onClick={() => handleOpenVersionDrawer(document.DocumentId)}
                            >
                              <HistoryIcon />
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
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={totalCount}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </CardContent>
        </Card>
      </Box>

      {/* Document Version Drawer */}
      <DocumentVersionDrawer
        open={versionDrawerOpen}
        onClose={handleCloseVersionDrawer}
        documentId={selectedDocumentId}
      />

      {/* Document Edit Drawer */}
      <DocumentEditDrawer
        open={editDrawerOpen}
        onClose={handleCloseEditDrawer}
        documentId={selectedDocumentId}
        onUpdateSuccess={handleEditSuccess}
      />
    </Container>
  );
};

export default DocumentListScreen;
