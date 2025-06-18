'use client';

import { Box, Container } from '@mui/material';
import { SubscriptionList } from '@/components/tenant_subscriptions/SubscriptionList';

export default function TenantSubscriptionsPage() {
  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        <Container maxWidth="xl" sx={{ py: 3 }}>
          <SubscriptionList />
        </Container>
      </Box>
    </Box>
  );
}