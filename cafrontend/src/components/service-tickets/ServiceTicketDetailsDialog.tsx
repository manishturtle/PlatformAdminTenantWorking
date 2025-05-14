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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ServiceTicket } from '@/types/serviceticket';
import { serviceTicketApi } from '@/services/api/serviceTicketApi';
import ServiceTicketTasksComponent from './ServiceTicketTasksComponent';
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

interface ServiceTicketDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  ticketId: number | null;
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

const ServiceTicketDetailsDialog: React.FC<ServiceTicketDetailsDialogProps> = ({ 
  open, 
  onClose, 
  ticketId 
}) => {
  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const fetchTicket = async () => {
    if (!ticketId) return;
    
    setLoading(true);
    setError(null);
    try {
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
    if (open && ticketId) {
      fetchTicket();
    } else {
      // Reset state when dialog closes
      setTicket(null);
      setError(null);
      setTabValue(0);
    }
  }, [open, ticketId]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    fetchTicket();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Service Ticket Details
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ p: 1 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          ) : ticket ? (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box>
                  <Typography variant="h6">
                    #{ticket.serviceticketid} - {ticket.serviceticketsubject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Created on {formatDate(ticket.creationdate)}
                  </Typography>
                </Box>
                <Box>
                  <Button
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    size="small"
                    sx={{ mr: 1 }}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Ticket Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Status</Typography>
                        <Chip 
                          label={ticket.status} 
                          color={getStatusColor(ticket.status)}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Category</Typography>
                        <Typography variant="body1">
                          {ticket.servicecategory?.servicecategoryname || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Target Date</Typography>
                        <Typography variant="body1">{formatDate(ticket.targetclosuredate)}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">Assigned To</Typography>
                        <Typography variant="body1">
                          {ticket.serviceagent ? ticket.serviceagent.serviceagentname : 'Unassigned'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Customer Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">Customer</Typography>
                        <Typography variant="body1">
                          {ticket.customer ? `${ticket.customer.FirstName} ${ticket.customer.LastName}` : 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
                
                <Grid item xs={12}>
                  <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {ticket.serviceticketdesc || 'No description provided.'}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Tabs Section */}
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
            </>
          ) : (
            <Typography variant="body1" align="center" sx={{ py: 4 }}>
              No ticket selected
            </Typography>
          )}
        </Box>
      </DialogContent>

      {/* Task Edit Dialog */}
      {ticket && (
        <TaskEditDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          task={selectedTask}
          serviceTicketId={ticket.serviceticketid}
          onSave={handleRefresh}
        />
      )}
    </Dialog>
  );
};

export default ServiceTicketDetailsDialog;
