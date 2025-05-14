'use client';

import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Box,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider
} from '@mui/material';
import { useRouter } from 'next/navigation';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import AddIcon from '@mui/icons-material/Add';
import GroupsIcon from '@mui/icons-material/Groups';
// AdminLayout is used in the layout.tsx file instead
import TenantList from '@/components/admin/TenantList';
import withAdminAuth from '@/components/auth/withAdminAuth';
import { fetchTenants, fetchCrmClients } from '@/services/adminApiService';

function PlatformAdminDashboard() {
  const router = useRouter();
  const [tenants, setTenants] = useState<any[]>([]);
  const [crmClients, setCrmClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);

  // Fetch tenants from the API
  useEffect(() => {
    const getTenants = async () => {
      try {
        setLoading(true);
        const data = await fetchTenants();
        setTenants(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch tenants:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tenants');
      } finally {
        setLoading(false);
      }
    };
    
    getTenants();
  }, []);

  // Fetch CRM clients from the API
  useEffect(() => {
    const getCrmClients = async () => {
      try {
        setClientsLoading(true);
        const data = await fetchCrmClients();
        setCrmClients(data);
        setClientsError(null);
      } catch (err) {
        console.error('Failed to fetch CRM clients:', err);
        setClientsError(err instanceof Error ? err.message : 'Failed to fetch CRM clients');
      } finally {
        setClientsLoading(false);
      }
    };
    
    getCrmClients();
  }, []);

  // Handle create tenant button click
  const handleCreateTenant = () => {
    router.push('/platform-admin/tenants/create');
  };

  // Handle create client button click
  const handleCreateClient = () => {
    router.push('/platform-admin/crmclients/create');
  };

  // Handle view client details
  const handleViewClient = (clientId: string) => {
    router.push(`/platform-admin/crmclients/${clientId}`);
  };

  // Calculate dashboard stats
  const dashboardStats = [
    { 
      title: 'Total Tenants', 
      value: loading ? '...' : (tenants?.length || 0).toString(), 
      icon: <BusinessIcon fontSize="large" color="primary" /> 
    },
    { 
      title: 'Active Tenants', 
      value: loading ? '...' : (tenants?.filter(t => t.paid_until && new Date(t.paid_until) > new Date())?.length || 0).toString(), 
      icon: <BusinessIcon fontSize="large" color="success" /> 
    },
    { 
      title: 'CRM Clients', 
      value: clientsLoading ? '...' : (crmClients?.length || 0).toString(), 
      icon: <GroupsIcon fontSize="large" color="secondary" /> 
    },
    { 
      title: 'Trial Tenants', 
      value: loading ? '...' : (tenants?.filter(t => !t.paid_until)?.length || 0).toString(), 
      icon: <BusinessIcon fontSize="large" color="warning" /> 
    },
  ];

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Platform Admin Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" sx={{ mb: 4 }}>
        Manage your multi-tenant SaaS application from this central dashboard.
      </Typography>

      {/* Dashboard Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {dashboardStats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={2}>
              <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" component="div" color="textSecondary">
                    {stat.title}
                  </Typography>
                  <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                    {stat.value}
                  </Typography>
                </Box>
                {stat.icon}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* CRM Client Management Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 0 }}>
            CRM Clients
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleCreateClient}
          >
            Add Client
          </Button>
        </Box>

        {clientsError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {clientsError}
          </Alert>
        )}

        <TableContainer>
          <Table sx={{ minWidth: 650 }} aria-label="CRM clients table">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'primary.light' }}>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Client Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Contact Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Tenants</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {clientsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : crmClients && crmClients.length > 0 ? (
                crmClients.slice(0, 5).map((client) => (
                  <TableRow 
                    key={client.id} 
                    hover 
                    onClick={() => handleViewClient(client.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{client.client_name}</TableCell>
                    <TableCell>{client.contact_person_email}</TableCell>
                    <TableCell>{formatDate(client.created_at)}</TableCell>
                    <TableCell>{client.tenant_count || 0}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No CRM clients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {crmClients && crmClients.length > 5 && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="text" 
              color="primary" 
              onClick={() => router.push('/platform-admin/crmclients')}
            >
              View All Clients
            </Button>
          </Box>
        )}
      </Paper>

      {/* Tenant Management Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 0 }}>
            Tenant Management
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleCreateTenant}
          >
            Create Tenant
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <TenantList tenants={tenants} loading={loading} error={error} />
      </Paper>
    </Box>
  );
}

// Wrap the component with the admin authentication HOC
export default withAdminAuth(PlatformAdminDashboard);
