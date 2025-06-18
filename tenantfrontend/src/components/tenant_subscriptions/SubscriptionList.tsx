import { useState } from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { CloudQueue, AutoAwesome, Campaign, Badge } from '@mui/icons-material';
import { SubscriptionCard } from './SubscriptionCard';

type Subscription = {
  id: string;
  title: string;
  plan: string;
  status: 'active' | 'pending' | 'trial' | 'cancelled';
  icon: React.ReactNode;
  iconColor: string;
  metrics: Array<{ label: string; value: string }>;
  renewInfo?: string;
  cost?: string;
};

const subscriptions: Subscription[] = [
  {
    id: '1',
    title: 'CRM Application',
    plan: 'Pro Plan',
    status: 'active',
    icon: <CloudQueue />,
    iconColor: '#1976d2',
    metrics: [
      { label: 'Users Assigned', value: '30/50' },
      { label: 'Storage', value: '30/50 GB' },
    ],
    renewInfo: 'Renews on: July 15, 2025',
    cost: '$349/month',
  },
  {
    id: '2',
    title: 'AI Platform',
    plan: 'Standard Plan - Enterprise Plan',
    status: 'pending',
    icon: <AutoAwesome />,
    iconColor: '#9c27b0',
    metrics: [
      { label: 'API Limit', value: '1.2M/2M' },
      { label: 'Processing Credits', value: '75K/100K' },
    ],
    renewInfo: 'Upgrade effective: August 1, 2025',
    cost: '$999/month',
  },
  {
    id: '3',
    title: 'Campaign Management Platform',
    plan: 'Business Plan',
    status: 'active',
    icon: <Campaign />,
    iconColor: '#2e7d32',
    metrics: [
      { label: 'Campaigns', value: '70K/100K' },
      { label: 'Lead Sync', value: '100K/200K' },
    ],
    renewInfo: 'Renews on: July 20, 2025',
    cost: '$599/month',
  },
  {
    id: '4',
    title: 'HR Platform',
    plan: 'Basic Plan',
    status: 'trial',
    icon: <Badge />,
    iconColor: '#ed6c02',
    metrics: [
      { label: 'Employee Records', value: '10/50' },
      { label: 'Trial Days Left', value: '10 days' },
    ],
  },
];

type FilterType = 'all' | 'active' | 'pending' | 'trial' | 'cancelled';

export const SubscriptionList = () => {
  const [filter, setFilter] = useState<FilterType>('all');

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
  };

  const filteredSubscriptions = filter === 'all' 
    ? subscriptions 
    : subscriptions.filter(sub => sub.status === filter);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            My Subscriptions
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Manage your subscription plans, user assignments, and plan changes.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          sx={{
            borderColor: 'primary.main',
            color: 'primary.main',
            textTransform: 'none',
            '&:hover': {
              borderColor: 'primary.dark',
              backgroundColor: 'action.hover',
            },
          }}
        >
          Create New Subscription
        </Button>
      </Stack>
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {[
          { value: 'all', label: 'All Subscriptions' },
          { value: 'active', label: 'Active' },
          { value: 'trial', label: 'Trial' },
          { value: 'cancelled', label: 'Cancelled' },
        ].map((item) => (
          <Button
            key={item.value}
            variant={filter === item.value ? 'outlined' : 'text'}
            onClick={() => handleFilterChange(item.value as FilterType)}
            sx={{
              textTransform: 'none',
              color: filter === item.value ? 'primary.main' : 'text.secondary',
              borderColor: 'primary.main',
              '&:hover': {
                backgroundColor: filter === item.value ? 'action.hover' : 'transparent',
              },
            }}
          >
            {item.label}
          </Button>
        ))}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {filteredSubscriptions.map((subscription) => (
          <SubscriptionCard
            key={subscription.id}
            title={subscription.title}
            plan={subscription.plan}
            status={subscription.status}
            icon={subscription.icon}
            iconColor={subscription.iconColor}
            metrics={subscription.metrics}
            renewInfo={subscription.renewInfo}
            cost={subscription.cost}
          />
        ))}
      </Box>
    </Box>
  );
};
