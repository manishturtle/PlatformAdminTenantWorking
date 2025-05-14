import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useRouter } from 'next/router';
import { ServiceTicket } from '@/types/serviceticket';

interface ServiceTicketDetails {
  serviceticketid: number;
  clientid: number;
  companyid: number;
  customerid: number;
  servicecategoryid: number;
  serviceagentid: number | null;
  serviceticketdesc: string;
  serviceticketsubject: string;
  targetclosuredate: string;
  creationdate: string;
  status: string;
  customer?: {
    CustomerID: number;
    FirstName: string;
    LastName: string;
  };
  servicecategory?: {
    servicecategoryid: number;
    servicecategoryname: string;
  };
  serviceagent?: {
    serviceagentid: number;
    firstname: string;
    lastname: string;
  };
  tasks?: Array<{
    ServiceTicketTaskId: number;
    TaskName: string;
    Sequence: number;
    TaskStatus: string;
    TaskServiceAgent: number | null;
    agent_name?: string;
    step_name?: string;
  }>;
  createdby: string;
  createdat: string;
  updatedat: string;
  updatedby: string;
}
import { serviceTicketApi } from '@/services/api/serviceTicketApi';
import ServiceTicketTasksComponent from './ServiceTicketTasksComponent';
import ServiceTicketDialog from './ServiceTicketDialog';
import TaskEditDialog from './TaskEditDialog';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`service-ticket-tabpanel-${index}`}
      aria-labelledby={`service-ticket-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `service-ticket-tab-${index}`,
    'aria-controls': `service-ticket-tabpanel-${index}`,
  };
}

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

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Not set';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const ServiceTicketDetailsComponent: React.FC = () => {
  const router = useRouter();
  const { id, tab, create } = router.query;
  const [ticket, setTicket] = useState<ServiceTicketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  interface ServiceTicket {
    serviceticketid?: number;
    customerid: number;
    servicecategoryid: number;
    serviceagentid: number | null;
    serviceticketsubject: string;
    serviceticketdesc: string;
    creationdate?: string | null;
    targetclosuredate?: string | null;
    status?: string;
    createdby?: string;
    updatedby?: string;
    createdat?: string;
    clientid?: number;
    companyid?: number;
    updatedat?: string;
  }

  const fetchTicket = async () => {
    if (!id) return;
    
    setLoading(true);
    setError(null);
    try {
      // Handle the case where id might be an array or undefined (during initial rendering)
      if (!id) return;
      const ticketId = parseInt(Array.isArray(id) ? id[0] : id as string);
      const data = await serviceTicketApi.getServiceTicket(ticketId);
      setTicket(data);
    } catch (err) {
      console.error('Error fetching service ticket:', err);
      setError('Failed to load service ticket details. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);
  
  // Handle URL parameters
  useEffect(() => {
    if (!router.isReady) return;
    
    try {
      // Check if there's a tab parameter in the URL
      if (tab === 'tasks') {
        setTabValue(0); // Tasks tab is index 0
      }
    } catch (err) {
      console.error('Error parsing URL parameters:', err);
    }
  }, [router.isReady, tab]);
  
  // Handle opening the task creation dialog after ticket is loaded
  useEffect(() => {
    if (!ticket || !router.isReady) return;
    
    try {
      // Only if we're on the tasks tab and have a create parameter
      if (tab === 'tasks' && create === 'true') {
        setSelectedTask(null);
        setEditDialogOpen(true);
        
        // Remove the create parameter from URL after opening the dialog
        // to prevent reopening on refresh
        const { create, ...restQuery } = router.query;
        // Use a string-based approach to avoid TypeScript errors
        const queryString = Object.entries(restQuery)
          .map(([key, value]) => `${key}=${value}`)
          .join('&');
        const newPath = `${router.pathname}?${queryString}`;
        router.replace(newPath, undefined, { shallow: true });
      }
    } catch (err) {
      console.error('Error handling task dialog:', err);
    }
  }, [ticket, router.isReady, tab, create]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBack = () => {
    router.push('/servicetickets');
  };

  const handleEdit = () => {
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDialogSave = async (updatedTicket: any) => {
    await fetchTicket();
    setDialogOpen(false);
  };

  const handleRefresh = () => {
    fetchTicket();
  };

  if (loading && !ticket) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Service Tickets
        </Button>
      </Box>
    );
  }

  if (!ticket) {
    return (
      <Box p={3}>
        <Alert severity="warning">Service ticket not found</Alert>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />} 
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Back to Service Tickets
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center">
          <IconButton onClick={handleBack} sx={{ mr: 1 }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" component="h1">
            Service Ticket Details
          </Typography>
        </Box>
        <Box>
          <IconButton onClick={handleRefresh} sx={{ mr: 1 }} aria-label="Refresh">
            <RefreshIcon />
          </IconButton>
          <Button 
            variant="contained" 
            startIcon={<EditIcon />} 
            onClick={handleEdit}
          >
            Edit Ticket
          </Button>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              #{ticket.serviceticketid} - {ticket.serviceticketsubject}
            </Typography>
            <Chip 
              label={ticket.status} 
              color={getStatusColor(ticket.status) as any}
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Service Ticket Details
          </Typography>
          <Divider />
          <Grid container spacing={3} sx={{ mt: 2 }}>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Customer:
              </Typography>
              <Typography>
                {ticket?.customer?.FirstName} {ticket?.customer?.LastName}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Category:
              </Typography>
              <Typography>
                {ticket?.servicecategory?.servicecategoryname || 'Not assigned'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Agent:
              </Typography>
              <Typography>
                {ticket?.serviceagent?.firstname} {ticket?.serviceagent?.lastname}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Status:
              </Typography>
              <Chip
                label={ticket?.status || 'New'}
                color={getStatusColor(ticket?.status || 'New')}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>
                Description:
              </Typography>
              <Typography>
                {ticket?.serviceticketdesc || 'No description provided'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Creation Date:
              </Typography>
              <Typography>
                {formatDate(ticket?.creationdate)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Target Closure Date:
              </Typography>
              <Typography>
                {formatDate(ticket?.targetclosuredate)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" gutterBottom>
                Last Updated:
              </Typography>
              <Typography>
                {formatDate(ticket?.updatedat)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="service ticket tabs"
          >
            <Tab label="Tasks" {...a11yProps(0)} />
            <Tab label="History" {...a11yProps(1)} disabled />
            <Tab label="Notes" {...a11yProps(2)} disabled />
          </Tabs>
        </Box>
        <TabPanel value={tabValue} index={0}>
          <Box display="flex" justifyContent="flex-end" mb={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setSelectedTask(null);
                setEditDialogOpen(true);
              }}
              startIcon={<AddIcon />}
            >
              Add New Task
            </Button>
          </Box>
          <ServiceTicketTasksComponent 
            serviceTicketId={ticket.serviceticketid} 
            onTasksUpdated={handleRefresh}
          />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <Box p={3} textAlign="center">
            <Typography color="text.secondary">
              Ticket history will be available in a future update.
            </Typography>
          </Box>
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <Box p={3} textAlign="center">
            <Typography color="text.secondary">
              Ticket notes will be available in a future update.
            </Typography>
          </Box>
        </TabPanel>
      </Box>

      <ServiceTicketDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave}
        initialData={ticket}
      />

      <TaskEditDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        task={selectedTask}
        serviceTicketId={ticket?.serviceticketid}
        onSave={handleRefresh}
      />
    </Box>
  );
};

export default ServiceTicketDetailsComponent;
