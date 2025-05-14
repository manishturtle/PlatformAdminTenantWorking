import React from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';

export default function TenantAdminDashboard() {
  return (
    <Box maxWidth={800} mx="auto" mt={8}>
      <Card elevation={6}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <DashboardIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" fontWeight="bold">Tenant Admin Dashboard</Typography>
          </Box>
          <Typography variant="body1">
            Welcome to the Tenant Admin Dashboard! Here you can manage your tenant's users, settings, and more.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
