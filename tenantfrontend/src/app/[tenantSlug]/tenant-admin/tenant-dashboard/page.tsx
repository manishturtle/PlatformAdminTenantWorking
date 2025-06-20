'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Box, 
  Button, 
  Typography, 
  useTheme, 
  Card, 
  Grid,
  CardContent, 
  LinearProgress,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import type { Theme } from '@mui/material/styles';
import PeopleIcon from '@mui/icons-material/People';
import StorageIcon from '@mui/icons-material/Storage';
import ApiIcon from '@mui/icons-material/Api';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import GroupsIcon from '@mui/icons-material/Groups';
import InsightsIcon from '@mui/icons-material/Insights';
import AddIcon from '@mui/icons-material/Add';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Import API functions
import { 
  fetchTenantSubscriptions, 
  fetchTenantApplications,
  type TenantSubscription,
  type TenantApplication 
} from '@/services/tenantApi';

// Import components
import { SubscriptionCard } from '@/components/dashboard/SubscriptionCard';
import { UserManagementCard } from '@/components/dashboard/UserManagementCard';
import { SecurityAuditCard } from '@/components/dashboard/SecurityAuditCard';
import { AnnouncementsCard } from '@/components/dashboard/AnnouncementsCard';
import { BillingInfo } from '@/components/dashboard/BillingInfo';

export default function TenantDashboardPage() {
  const theme = useTheme();
  const router = useRouter();
  const { tenantSlug } = useParams();
  
  const [subscriptions, setSubscriptions] = useState<TenantSubscription | null>(null);
  const [loading, setLoading] = useState({
    subscriptions: true
  });
  const [error, setError] = useState<{
    subscriptions: string | null;
  }>({ subscriptions: null });

  // Check if user is authenticated and fetch data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch subscriptions
    const loadSubscriptions = async () => {
      try {
        const data = await fetchTenantSubscriptions(tenantSlug as string);
        // Transform the API response to match our component's expectations
        const transformedData = {
          ...data,
          // Add any necessary transformations here
        };
        setSubscriptions(transformedData);
        setError(prev => ({ ...prev, subscriptions: null }));
      } catch (err) {
        console.error('Error fetching subscriptions:', err);
        setError(prev => ({ ...prev, subscriptions: err instanceof Error ? err.message : 'Failed to load subscriptions' }));
      } finally {
        setLoading(prev => ({ ...prev, subscriptions: false }));
      }
    };

    // We no longer need a separate loadApplications function since applications now come with subscriptions

    loadSubscriptions();
  }, [router, tenantSlug]);

  // Helper function to get icon based on subscription name
  const getSubscriptionIcon = (name: string): ReactNode => {
    const iconMap: Record<string, ReactNode> = {
      'CRM': <BusinessCenterIcon />,
      'HR': <GroupsIcon />,
      'Finance': <InsightsIcon />,
      'Analytics': <InsightsIcon />,
      'Inventory': <StorageIcon />
    };
    
    const match = Object.keys(iconMap).find(key => 
      name.toLowerCase().includes(key.toLowerCase())
    );
    
    return match ? iconMap[match] : <BusinessCenterIcon />;
  };

  // Helper function to get color based on subscription name
  const getSubscriptionColor = (name: string, theme: Theme) => {
    const colorMap: Record<string, string> = {
      'CRM': theme.palette.primary.main,
      'HR': theme.palette.secondary.main,
      'Finance': theme.palette.info.main,
      'Analytics': theme.palette.warning.main,
      'Inventory': theme.palette.success.main
    };
    
    const match = Object.keys(colorMap).find(key => 
      name.toLowerCase().includes(key.toLowerCase())
    );
    
    return match ? colorMap[match] : theme.palette.primary.main;
  };

  const isLoading = loading.subscriptions;
  const hasError = Boolean(error.subscriptions);
  
  // Calculate total active users from applications subscriptions if available
  const totalActiveUsers = subscriptions?.applications?.reduce(
    (total: number, app) => total + (app.subscription?.subscription_plan?.max_users || 0), 0
  ) || 0;

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
              <Box mb={3}>
                <Typography variant="h6" fontWeight={600}>
                  My Subscriptions & Billing
                </Typography>
              </Box>


              {loading.subscriptions ? (
                <Box display="flex" justifyContent="center" p={4}>
                  <CircularProgress />
                </Box>
              ) : error.subscriptions ? (
                <Alert severity="error" icon={<ErrorOutlineIcon />}>
                  {error.subscriptions}
                </Alert>
              ) : !subscriptions?.applications || subscriptions.applications.length === 0 ? (
                <Alert severity="info">No subscriptions found. Add a subscription to get started.</Alert>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {subscriptions.applications.map((app, index) => {
                    const plan = app.subscription.subscription_plan;
                    const status = app.subscription.license_status === 'active' ? 'active' : 'inactive';
                    const appUrl = app.app_default_url || '';
                    
                    const billingCycle = plan.billing_cycle || 'Monthly';
                    
                    return (
                      <SubscriptionCard
                        key={`${app.app_id}-${index}`}
                        icon={getSubscriptionIcon(app.name)}
                        title={app.name}
                        plan={`${billingCycle} ($${plan.price})`}
                        status={status}
                        users={{
                          current: app.user_count || 0,
                          total: plan.max_users
                        }}
                        iconColor={getSubscriptionColor(app.name, theme)}
                        description={`${plan.description || 'No description'} \u2022 ${plan.support_level || 'No support level specified'}`}
                        metrics={[
                          { label: 'Storage Usage', value: `${Math.floor(Math.random() * 100)}% of ${plan.storage_limit || 0} GB` },
                          { label: 'API Calls', value: `${plan.api_call_limit || 0}/mo` },
                          { label: 'Cost', value: `$${plan.price}/month` },
                        ]}
                        appUrl={appUrl}
                      />
                    );
                  })}
                </Box>
              )}
              
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
