import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Divider, 
  Grid, 
  IconButton, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Typography,
  Alert,
  Snackbar,
  AlertColor,
  Chip,
  CircularProgress,
  TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { Customer } from '../../types/customer';
import { customerApi, serviceTicketApi } from '../../services/api';
import { serviceCategoryApi } from '../../services/api/serviceCategoryApi';
import { serviceAgentApi } from '../../services/api/serviceAgentApi';
import CustomerDocumentsSection from '../documents/CustomerDocumentsSection';
import CustomerCredentialsCard from '../credentials/CustomerCredentialsCard';
import ConvertLeadModal from './ConvertLeadModal';
import ServiceTicketDialog from '../service-tickets/ServiceTicketDialog';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import CloseIcon from '@mui/icons-material/Close';
import ServiceTicketDetailsDialog from '../service-tickets/ServiceTicketDetailsDialog';

interface CustomerDetailsScreenProps {
  customerId: number;
}

const CustomerDetailsScreen: React.FC<CustomerDetailsScreenProps> = ({ customerId }) => {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [convertModalOpen, setConvertModalOpen] = useState<boolean>(false);
  
  // Service tickets state
  const [serviceTickets, setServiceTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketsPage, setTicketsPage] = useState(0);
  const [ticketsRowsPerPage, setTicketsRowsPerPage] = useState(5);
  const [ticketsTotal, setTicketsTotal] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);

  const fetchCustomerDetails = async () => {
    try {
      setLoading(true);
      const data = await customerApi.getCustomerById(customerId);
      setCustomer(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching customer details:', err);
      setError('Failed to load customer details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch service tickets for the customer
  const fetchServiceTickets = async () => {
    if (!customerId) return;
    
    setTicketsLoading(true);
    try {
      // First, get the tickets with expanded data
      const response = await serviceTicketApi.getServiceTickets({
        customerid: customerId,
        page: ticketsPage + 1,
        page_size: ticketsRowsPerPage,
        expand: 'servicecategory,serviceagent' // Request expanded data for category and agent
      });
      
      // Process the results to ensure category and agent information is available
      const processedResults = await Promise.all(response.results.map(async (ticket) => {
        let updatedTicket = {...ticket};
        
        // If servicecategory is not included but we have an ID, fetch the category details
        if (!ticket.servicecategory && ticket.servicecategoryid) {
          try {
            // Fetch the category details using the category ID
            const categoryResponse = await serviceCategoryApi.getServiceCategory(ticket.servicecategoryid);
            updatedTicket.servicecategory = categoryResponse;
          } catch (error) {
            console.error(`Error fetching category for ticket ${ticket.serviceticketid}:`, error);
          }
        }
        
        // If serviceagent is not included but we have an ID, fetch the agent details
        if (!ticket.serviceagent && ticket.serviceagentid) {
          try {
            // Fetch the agent details using the agent ID
            const agentResponse = await serviceAgentApi.getServiceAgent(ticket.serviceagentid);
            updatedTicket.serviceagent = agentResponse;
          } catch (error) {
            console.error(`Error fetching agent for ticket ${ticket.serviceticketid}:`, error);
          }
        }
        
        return updatedTicket;
      }));
      
      setServiceTickets(processedResults);
      setTicketsTotal(response.count);
    } catch (error) {
      console.error('Error fetching service tickets:', error);
      setTicketsError('Failed to load service tickets');
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchCustomerDetails();
      fetchServiceTickets();
    }
  }, [customerId, ticketsPage, ticketsRowsPerPage]);
  
  const handleConvertLeadClick = () => {
    if (customer && ['Lead', 'Disqualified Lead'].includes(customer.CustomerType)) {
      setConvertModalOpen(true);
    }
  };

  const handleConvertSuccess = () => {
    // Refresh the customer data after conversion
    fetchCustomerDetails();
  };

  const handleCloseConvertModal = () => {
    setConvertModalOpen(false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box mt={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!customer) {
    return (
      <Box mt={3}>
        <Alert severity="info">Customer not found</Alert>
      </Box>
    );
  }

  // Customer Information Card
  const renderCustomerInfoCard = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">Customer Information</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<EditIcon />}
            onClick={() => router.push(`/customers/edit/${customerId}`)}
          >
            Edit
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ flex: '1 1 45%', minWidth: '250px' }}>
            <Typography variant="subtitle2" color="text.secondary">First Name</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{customer.FirstName}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary">Email</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{customer.Email}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary">Aadhar Card</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{customer.AadharCard}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary">Source</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{customer.Source}</Typography>
          </Box>
          
          <Box sx={{ flex: '1 1 45%', minWidth: '250px' }}>
            <Typography variant="subtitle2" color="text.secondary">Last Name</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{customer.LastName}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary">Phone</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{customer.Phone}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary">PAN Card</Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>{customer.PANCard}</Typography>
            
            <Typography variant="subtitle2" color="text.secondary">Customer Type</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body1" sx={{ mr: 1 }}>{customer.CustomerType}</Typography>
              {['Lead', 'Disqualified Lead'].includes(customer.CustomerType) && (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<PersonAddIcon />}
                  onClick={handleConvertLeadClick}
                >
                  Convert to Customer
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // Service Tickets Card for the customer
  
  // Function to get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'info';
      case 'Assigned':
        return 'warning';
      case 'InProgress':
        return 'primary';
      case 'Closed':
        return 'success';
      default:
        return 'default';
    }
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };
  
  // Handle page change
  const handleTicketsPageChange = (event: unknown, newPage: number) => {
    setTicketsPage(newPage);
  };
  
  // Handle rows per page change
  const handleTicketsRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTicketsRowsPerPage(parseInt(event.target.value, 10));
    setTicketsPage(0);
  };
  
  // Navigate to ticket details
  const handleViewTicket = (ticketId: number) => {
    setSelectedTicket(ticketId);
    setTicketDetailsOpen(true);
  };
  
  // Open dialog to create new ticket for this customer
  const handleAddTicket = () => {
    setTicketDialogOpen(true);
  };
  
  // Handle saving a new service ticket
  const handleSaveTicket = async (ticket: any) => {
    try {
      await serviceTicketApi.createServiceTicket(ticket);
      setTicketDialogOpen(false);
      // Refresh the tickets list
      fetchServiceTickets();
    } catch (error) {
      console.error('Error saving service ticket:', error);
      throw error; // Let the dialog handle the error
    }
  };
  
  // Service Tickets Card
  const renderServiceTicketsCard = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">Service Tickets</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAddTicket}
          >
            ADD SERVICE TICKET
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {ticketsError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {ticketsError}
          </Alert>
        )}
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Agent</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ticketsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={24} sx={{ my: 1 }} />
                  </TableCell>
                </TableRow>
              ) : serviceTickets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No service tickets found for this customer
                  </TableCell>
                </TableRow>
              ) : (
                serviceTickets.map((ticket) => (
                  <TableRow key={ticket.serviceticketid}>
                    <TableCell>{ticket.serviceticketid}</TableCell>
                    <TableCell>{ticket.serviceticketsubject}</TableCell>
                    <TableCell>
                      {ticket.servicecategory?.servicecategoryname || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {ticket.serviceagent ? 
                        ticket.serviceagent.serviceagentname || 'Unassigned' : 
                        'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={ticket.status}
                        color={getStatusColor(ticket.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(ticket.creationdate)}</TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleViewTicket(ticket.serviceticketid)}
                        title="View ticket details"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
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
          count={ticketsTotal}
          rowsPerPage={ticketsRowsPerPage}
          page={ticketsPage}
          onPageChange={handleTicketsPageChange}
          onRowsPerPageChange={handleTicketsRowsPerPageChange}
        />
      </CardContent>
    </Card>
  );

  // Documents Card with dummy data
  const renderDocumentsCard = () => (
    <CustomerDocumentsSection customerId={customerId} />
  );

  // Invoices Card with dummy data
  const renderInvoicesCard = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">Invoices</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => console.log('Add invoice')}
          >
            Add
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Invoice #</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>INV-001</TableCell>
                <TableCell>2025-03-15</TableCell>
                <TableCell>₹5,000</TableCell>
                <TableCell>Paid</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>INV-002</TableCell>
                <TableCell>2025-04-01</TableCell>
                <TableCell>₹7,500</TableCell>
                <TableCell>Pending</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  // Payments Card with dummy data
  const renderPaymentsCard = () => (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">Payments</Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={() => console.log('Add payment')}
          >
            Add
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Payment ID</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Method</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>PAY-001</TableCell>
                <TableCell>2025-03-15</TableCell>
                <TableCell>₹5,000</TableCell>
                <TableCell>UPI</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>PAY-002</TableCell>
                <TableCell>2025-02-10</TableCell>
                <TableCell>₹3,500</TableCell>
                <TableCell>Bank Transfer</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );

  // Credentials Card
  const renderCredentialsCard = () => (
    <CustomerCredentialsCard customerId={customerId} />
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {customer.FirstName} {customer.LastName}
      </Typography>
      
      {renderCustomerInfoCard()}
      {renderServiceTicketsCard()}
      {renderDocumentsCard()}
      {renderCredentialsCard()}
      {/* {renderInvoicesCard()} */}
      {/* {renderPaymentsCard()} */}
      
      {/* Lead Conversion Modal */}
      <ConvertLeadModal
        open={convertModalOpen}
        customer={customer}
        onClose={handleCloseConvertModal}
        onSuccess={handleConvertSuccess}
      />
      
      {/* Service Ticket Dialog */}
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <ServiceTicketDialog
          open={ticketDialogOpen}
          onClose={() => setTicketDialogOpen(false)}
          onSave={handleSaveTicket}
          initialData={{
            customerid: customerId,
            servicecategoryid: '',
            serviceagentid: null,
            serviceticketsubject: '',
            serviceticketdesc: '',
            targetclosuredate: new Date().toISOString().split('T')[0],
            status: 'New'
          }}
        />
      </LocalizationProvider>
      
      {/* Service Ticket Details Dialog */}
      <ServiceTicketDetailsDialog
        open={ticketDetailsOpen}
        onClose={() => setTicketDetailsOpen(false)}
        ticketId={selectedTicket}
      />
    </Box>
  );
};

export default CustomerDetailsScreen;
