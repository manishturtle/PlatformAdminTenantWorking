'use client';

import { Box, Typography, Card, CardContent, LinearProgress, Button, useTheme } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface SubscriptionPlan {
  id?: number;
  name?: string;
  price?: string;
  max_users?: number;
  description?: string;
  session_type?: string;
  storage_limit?: number;
  support_level?: string;
  api_call_limit?: number;
  transaction_limit?: number;
}

interface Subscription {
  license_id?: number;
  plan_id?: number;
  plan_name?: string;
  plan_description?: string;
  valid_from?: string;
  valid_until?: string | null;
  license_status?: string;
  subscription_plan?: SubscriptionPlan;
}

interface Application {
  app_id?: number;
  name?: string;
  description?: string;
  is_active?: boolean;
  app_default_url?: string;
  created_at?: string;
  user_count?: number;
  users_count_current?: number;
  users_assigned?: number;
  subscription?: Subscription;
}

interface DashboardSubscriptionCardProps {
  // New props structure
  application?: Application;
  // Old props structure (for backward compatibility)
  title?: string;
  plan?: string;
  assigned?: number;
  total?: number;
  status?: string;
}

export const DashbaordSubscriptionCard = ({
  application,
  // Old props
  title,
  plan,
  assigned,
  total,
  status,
}: DashboardSubscriptionCardProps) => {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();

  // Use new or old prop structure
  const appName = application?.name || title || 'Application';
  const planName = application?.subscription?.plan_name || plan || 'Plan';
  const maxUsers = application?.subscription?.subscription_plan?.max_users || total || 0;
  const assignedUsers = application?.user_count || application?.users_count_current || assigned || 0;
  const licenseStatus = application?.subscription?.license_status || status || 'inactive';
  const licenseId = application?.subscription?.license_id;
  
  const usagePercentage = maxUsers > 0 ? Math.round((assignedUsers / maxUsers) * 100) : 0;

  const handleViewUsage = () => {
    if (licenseId) {
      router.push(`/tenant-admin/subscriptions/${licenseId}`);
    }
  };

  return (
    <Card sx={{ 
      borderRadius: 2, 
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <CardContent sx={{ flex: 1, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box 
              sx={{
                width: 40,
                height: 40,
                bgcolor: 'primary.main',
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.25rem',
              }}
            >
              {appName?.charAt(0) || 'A'}
            </Box>
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {appName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {planName}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box 
              sx={{
                bgcolor: licenseStatus === 'active' ? 'success.light' : 'warning.light',
                color: licenseStatus === 'active' ? 'success.dark' : 'warning.dark',
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: '0.75rem',
                fontWeight: 'medium',
                textTransform: 'capitalize',
                minWidth: 60,
                textAlign: 'center'
              }}
            >
              {licenseStatus}
            </Box>
            <Button 
              size="small" 
              onClick={handleViewUsage}
              disabled={!licenseId}
              sx={{ 
                textTransform: 'none',
                color: 'primary.main',
                fontSize: '0.75rem',
                '&:hover': {
                  backgroundColor: 'transparent',
                  textDecoration: 'underline',
                },
                '&:disabled': {
                  color: 'text.disabled',
                  textDecoration: 'none',
                }
              }}
            >
              {t('dashboard.viewUsageAnalytics')} ›
            </Button>
          </Box>
        </Box>
        
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {t('Users')}: {assignedUsers} / {maxUsers} {t('Assigned')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {usagePercentage}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(usagePercentage, 100)} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 4,
                backgroundColor: theme.palette.primary.main,
              }
            }} 
          />
        </Box>
      </CardContent>
    </Card>
  );
};
