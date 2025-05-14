import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Divider,
} from '@mui/material';
import { Download as DownloadIcon, Add as AddIcon } from '@mui/icons-material';
import PortalLayout from '../layouts/PortalLayout';

interface DashboardStats {
  activeRequests: number;
  pendingPayments: number;
  completedITRs: number;
}

const CustomerDashboard: React.FC = () => {
  const [customerName, setCustomerName] = useState('Guest');

  useEffect(() => {
    // Get user data from localStorage (only runs on client-side)
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const user = JSON.parse(userInfo);
      setCustomerName(user.name || 'Guest');
    }
  }, []);
  const stats: DashboardStats = {
    activeRequests: 2,
    pendingPayments: 4500,
    completedITRs: 3
  };

  const activeRequests = [
    {
      id: 'ITR-2025-001',
      assessmentYear: '2025-26',
      startDate: 'Apr 15, 2025',
      estimatedCompletion: 'Apr 25, 2025',
      status: 'Processing'
    }
  ];

  const recentInvoices = [
    {
      invoiceNo: 'INV-2025-001',
      date: 'Apr 15, 2025',
      amount: 2500,
      status: 'Pending'
    }
  ];

  const announcements = [
    {
      title: 'Due Date Extension',
      message: 'The due date for filing ITR for AY 2025-26 has been extended to July 31, 2025.',
      postedOn: 'Apr 10, 2025'
    }
  ];

  return (
    <PortalLayout title="Dashboard" currentPath="/portal/dashboard">
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome Back, {customerName}!
        </Typography>
      </Box>

      {/* Quick Actions */}
      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          sx={{ mr: 2 }}
        >
          File New ITR for AY 2025-26
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
            <Typography variant="subtitle2" color="textSecondary">
              Active Requests
            </Typography>
            <Typography variant="h4">{stats.activeRequests}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, bgcolor: '#f3e5f5' }}>
            <Typography variant="subtitle2" color="textSecondary">
              Pending Payments
            </Typography>
            <Typography variant="h4">₹{stats.pendingPayments}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
            <Typography variant="subtitle2" color="textSecondary">
              Completed ITRs
            </Typography>
            <Typography variant="h4">{stats.completedITRs}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Active Requests */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Active Requests
        </Typography>
        <Paper sx={{ p: 2 }}>
          {activeRequests.map((request) => (
            <Box key={request.id}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle1">{request.id}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Assessment Year: {request.assessmentYear}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        Started: {request.startDate}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Estimated Completion: {request.estimatedCompletion}
                      </Typography>
                    </Box>
                    <Chip label={request.status} color="primary" size="small" />
                  </Box>
                </Grid>
              </Grid>
            </Box>
          ))}
        </Paper>
      </Box>

      {/* Recent Invoices */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Recent Invoices
        </Typography>
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Invoice No.</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow key={invoice.invoiceNo}>
                  <TableCell>{invoice.invoiceNo}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>₹{invoice.amount}</TableCell>
                  <TableCell>
                    <Chip
                      label={invoice.status}
                      color={invoice.status === 'Pending' ? 'warning' : 'success'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <DownloadIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Recent Announcements */}
      <Box>
        <Typography variant="h6" gutterBottom>
          Recent Announcements
        </Typography>
        <Paper sx={{ p: 2 }}>
          {announcements.map((announcement, index) => (
            <Box key={index}>
              <Typography variant="subtitle1" color="primary">
                {announcement.title}
              </Typography>
              <Typography variant="body2" paragraph>
                {announcement.message}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Posted on {announcement.postedOn}
              </Typography>
              {index < announcements.length - 1 && <Divider sx={{ my: 2 }} />}
            </Box>
          ))}
        </Paper>
      </Box>
    </Box>
    </PortalLayout>
  );
};

export default CustomerDashboard;
