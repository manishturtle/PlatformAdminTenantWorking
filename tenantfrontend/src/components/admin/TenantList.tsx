import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Button,
  Chip,
  Box,
  Typography
} from '@mui/material';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain_url: string;
  paid_until: string | null;
  is_active: boolean;
  created_at: string;
  tenant_admin_email?: string;
  client_name?: string;
  trial_end_date?: string;
}

interface TenantListProps {
  tenants: Tenant[];
  loading: boolean;
  error: string | null;
}

const TenantList: React.FC<TenantListProps> = ({ tenants, loading, error }) => {
  const router = useRouter();

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

  // Handle view tenant details
  const handleViewTenant = (tenantId: string) => {
    router.push(`/platform-admin/tenants/${tenantId}`);
  };

  // Determine tenant status
  const getTenantStatus = (tenant: Tenant) => {
    console.log(tenant);
    // if (!tenant.is_active) {
    //   return { label: 'Inactive', color: 'error' as const };
    // }
    
    if (!tenant.paid_until) {
      return { label: 'Trial', color: 'warning' as const };
    }
    
    const paidUntil = new Date(tenant.paid_until);
    const now = new Date();
    
    if (paidUntil < now) {
      return { label: 'Expired', color: 'error' as const };
    }
    
    // Check if within 7 days of expiration
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);
    
    if (paidUntil < sevenDaysFromNow) {
      return { label: 'Expiring Soon', color: 'warning' as const };
    }
    
    return { label: 'Active', color: 'success' as const };
  };

  return (
    <TableContainer component={Paper} elevation={0}>
      <Table sx={{ minWidth: 650 }} aria-label="tenants table">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'primary.light' }}>
            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Tenant Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Slug</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Client</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Created</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'white' }}>Trial End Date</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <CircularProgress />
              </TableCell>
            </TableRow>
          ) : error ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography color="error">{error}</Typography>
              </TableCell>
            </TableRow>
          ) : tenants && tenants.length > 0 ? (
            tenants.map((tenant) => {
              const status = getTenantStatus(tenant);
              return (
                <TableRow 
                  key={tenant.id} 
                  hover 
                  onClick={() => handleViewTenant(tenant.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{tenant.name}</TableCell>
                  <TableCell>{tenant.schema_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={status.label} 
                      color={status.color} 
                      size="small" 
                      sx={{ fontWeight: 'medium' }}
                    />
                  </TableCell>
                  <TableCell>{tenant.client_name || 'N/A'}</TableCell>
                  <TableCell>{formatDate(tenant.created_at)}</TableCell>
                  <TableCell>{formatDate(tenant.trial_end_date)}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ py: 3 }}>
                  <Typography variant="body1" gutterBottom>
                    No tenants found
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => router.push('/platform-admin/tenants/create')}
                    sx={{ mt: 1 }}
                  >
                    Create Your First Tenant
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default TenantList;
