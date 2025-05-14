import type { NextPage } from 'next';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import CustomerDashboard from '@/components/externalcustomer/CustomerDashboard';
import PortalLayout from '@/components/layouts/PortalLayout';

const DashboardPage: NextPage = () => {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated (only runs on client-side)
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.log('No auth token found, redirecting to login...');
      router.replace('/portal/login');
      return;
    }
    console.log('Auth token found, staying on dashboard');
  }, [router]);

  return (
    <PortalLayout title="Dashboard">
      <CustomerDashboard />
    </PortalLayout>
  );
};

export default DashboardPage;
