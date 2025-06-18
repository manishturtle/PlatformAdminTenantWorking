'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Button, 
  Container, 
  Grid, 
  Typography, 
  useTheme, 
  Card, 
  CardContent, 
  Divider, 
  LinearProgress,
  Paper
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import StorageIcon from '@mui/icons-material/Storage';
import ApiIcon from '@mui/icons-material/Api';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import GroupsIcon from '@mui/icons-material/Groups';
import InsightsIcon from '@mui/icons-material/Insights';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Import components
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard';
import { UserManagementCard } from '@/components/dashboard/UserManagementCard';
import { SecurityAuditCard } from '@/components/dashboard/SecurityAuditCard';
import { AnnouncementsCard } from '@/components/dashboard/AnnouncementsCard';
import { BillingInfo } from '@/components/dashboard/BillingInfo';

export default function TenantDashboardPage() {
  const theme = useTheme();
  const router = useRouter();

  // Check if user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <Box sx={{ p: 3, maxWidth: 1440, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Tenant Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        Welcome back, Alex. Here's an overview of your tenant account.
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Active Users</Typography>
              <Typography variant="h4" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>52</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                <ArrowUpwardIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">4% from last month</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Subscriptions</Typography>
              <Typography variant="h4" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>4</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                <AddCircleOutlineIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="caption">1 new subscription this month</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Storage Used</Typography>
              <Typography variant="h5" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>120 GB / 250 GB</Typography>
              <Box sx={{ width: '100%', mb: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={48} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: theme.palette.primary.main
                    } 
                  }} 
                />
              </Box>
              <Typography variant="caption" color="text.secondary">48% of total storage used</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ height: '100%', borderRadius: 2, boxShadow: 1 }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">API Calls This Month</Typography>
              <Typography variant="h5" sx={{ mt: 1, mb: 1.5, fontWeight: 600 }}>1.2M / 3M</Typography>
              <Box sx={{ width: '100%', mb: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={40} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: theme.palette.grey[200],
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      backgroundColor: theme.palette.secondary.main
                    } 
                  }} 
                />
              </Box>
              <Typography variant="caption" color="text.secondary">40% of monthly limit used</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
        {/* Left Column */}
        <Box sx={{ flex: 2 }}>
          {/* Subscriptions Section */}
          <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 1 }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight={600}>
                  My Subscriptions & Billing
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  sx={{ textTransform: 'none' }}
                >
                  Add Subscription
                </Button>
              </Box>


              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <SubscriptionCard
                  icon={<BusinessCenterIcon />}
                  title="CRM Application"
                  plan="Pro Plan"
                  status="active"
                  users={{ current: 30, total: 35 }}
                  color={theme.palette.primary.main}
                />
                <SubscriptionCard
                  icon={<GroupsIcon />}
                  title="HR Management"
                  plan="Standard Plan"
                  status="active"
                  users={{ current: 12, total: 20 }}
                  color={theme.palette.secondary.main}
                />
                <SubscriptionCard
                  icon={<InsightsIcon />}
                  title="Finance Analytics"
                  plan="Enterprise Plan"
                  status="trial"
                  users={{ current: 0, total: 0 }}
                  color={theme.palette.info.main}
                />
              </Box>


              <BillingInfo />
            </CardContent>
          </Card>
        </Box>

        {/* Right Column */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <UserManagementCard />
          <SecurityAuditCard />
          <AnnouncementsCard />
        </Box>
      </Box>
    </Box>
  );
}
