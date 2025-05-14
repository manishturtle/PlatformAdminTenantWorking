import React, { useState, useEffect } from 'react';
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
  TablePagination,
  TextField,
  IconButton,
  Typography,
  Alert,
  Chip,
  Grid
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Search as SearchIcon, FilterList as FilterIcon, Visibility as VisibilityIcon, Assignment as AssignmentIcon } from '@mui/icons-material';
import { serviceTicketApi, customerApi, serviceCategoryApi, serviceAgentApi } from '@/services/api';
import { serviceTicketTaskApi } from '@/services/api/serviceTicketTaskApi';
import { ServiceTicket } from '@/types/serviceticket';
import ServiceTicketDialog from './ServiceTicketDialog';
import { useRouter } from 'next/router';
// Correct import
import ServiceTicketDetailsComponent from './ServiceTicketDetailsComponent';

interface ServiceTicketsListComponentProps {
  onRefresh?: () => void;
}

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

const ServiceTicketsListComponent: React.FC<ServiceTicketsListComponentProps> = ({ onRefresh }) => {
  const router = useRouter();
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [ticketsWithTasks, setTicketsWithTasks] = useState<Record<number, boolean>>({});
  const [open, setOpen] = useState(false);

  const handleOpenDialog = () => {
    setOpen(true);
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await serviceTicketApi.getServiceTickets({
        page: page + 1,
        page_size: rowsPerPage,
        search: searchTerm,
      });
      setTickets(response.results);
      setTotalCount(response.count);

      // Fetch related data for display
      await fetchCustomers();
      await fetchCategories();
      await fetchAgents();
      
      // Check which tickets have tasks
      await checkTicketsWithTasks(response.results);
    } catch (err) {
      console.error('Error fetching service tickets:', err);
      setError('Failed to load service tickets. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const checkTicketsWithTasks = async (ticketsList: ServiceTicket[]) => {
    const tasksMap: Record<number, boolean> = {};
    
    try {
      // For each ticket, check if it has any tasks
      for (const ticket of ticketsList) {
        try {
          const tasks = await serviceTicketTaskApi.getTasksByServiceTicket(ticket.serviceticketid);
          tasksMap[ticket.serviceticketid] = tasks.length > 0;
        } catch (err) {
          console.error(`Error checking tasks for ticket ${ticket.serviceticketid}:`, err);
          tasksMap[ticket.serviceticketid] = false;
        }
      }
      
      setTicketsWithTasks(tasksMap);
    } catch (err) {
      console.error('Error checking tickets with tasks:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerApi.getCustomers();
      setCustomers(response.results || response);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await serviceCategoryApi.getServiceCategories();
      setCategories(response.results || response);
    } catch (err) {
      console.error('Failed to load service categories:', err);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await serviceAgentApi.getServiceAgents();
      setAgents(response.results || response);
    } catch (err) {
      console.error('Failed to load service agents:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchCustomers();
    fetchCategories();
    fetchAgents();
  }, [page, rowsPerPage, searchTerm]);

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleAdd = () => {
    setSelectedTicket(null);
    setDialogOpen(true);
  };

  const handleEdit = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setDialogOpen(true);
  };

  const handleView = (ticketId: number) => {
    router.push(`/servicetickets/${ticketId}/`);
  };
  
  const handleTaskAction = (ticketId: number) => {
    const hasExistingTasks = ticketsWithTasks[ticketId];
    if (hasExistingTasks) {
      // If tasks exist, navigate to the details page with tasks tab selected
      router.push(`/servicetickets/${ticketId}/?tab=tasks`);
    } else {
      // If no tasks exist, navigate to the details page with tasks tab selected and open the task creation dialog
      router.push(`/servicetickets/${ticketId}/?tab=tasks&create=true`);
    }
  };

  const handleSave = async (ticket: ServiceTicket) => {
    await fetchTickets();
    if (onRefresh) {
      onRefresh();
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getCustomerName = (id: number) => {
    const customer = customers.find(c => c.CustomerID === id);
    return customer ? `${customer.FirstName} ${customer.LastName}` : 'Unknown';
  };

  const getCategoryName = (id: number) => {
    const category = categories.find(c => c.servicecategoryid === id);
    return category ? category.servicecategoryname : 'Unknown';
  };

  const getAgentName = (id: number) => {
    const agent = agents.find(a => a.serviceagentid === id);
    return agent ? agent.serviceagentname : 'Unassigned';
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add Ticket
          </Button>
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Search by:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="Subject"
                label="Subject"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                placeholder="Customer"
                label="Customer"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e)}
              />
            </Grid>
          </Grid>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Agent</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">Loading...</TableCell>
              </TableRow>
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">No service tickets found</TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.serviceticketid}>
                  <TableCell>{ticket.serviceticketid}</TableCell>
                  <TableCell>{ticket.serviceticketsubject}</TableCell>
                  <TableCell>{getCustomerName(ticket.customerid)}</TableCell>
                  <TableCell>{getCategoryName(ticket.servicecategoryid)}</TableCell>
                  <TableCell>{getAgentName(ticket.serviceagentid)}</TableCell>
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
                      color="info"
                      onClick={() => handleView(ticket.serviceticketid)}
                      size="small"
                      title="View details"
                      sx={{ mr: 1 }}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    <IconButton
                      color="primary"
                      onClick={() => handleEdit(ticket)}
                      size="small"
                      title="Edit ticket"
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      color="secondary"
                      onClick={() => handleTaskAction(ticket.serviceticketid)}
                      size="small"
                      title={ticketsWithTasks[ticket.serviceticketid] ? "Edit tasks" : "Create tasks"}
                    >
                      <AssignmentIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <ServiceTicketDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSave={handleSave} initialData={selectedTicket} />

      <TablePagination
        component="div"
        count={totalCount}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
      />
    </Box>
  );
};

export default ServiceTicketsListComponent;
