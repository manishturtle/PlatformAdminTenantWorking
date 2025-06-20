"use client";
import React, { useEffect, useState } from 'react';
import { Box, Typography, Breadcrumbs, Link as MuiLink, CircularProgress } from '@mui/material';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import TenantForm from '../../../../components/admin/TenantForm';
import { getAuthHeader } from '@/utils/authUtils';
import { toast } from 'react-toastify';

interface TenantData {
  id: number;
  name: string;
  schema_name: string;
  url_suffix: string;
  default_url: string;
  environment: string;
  contact_email: string;
  is_active: boolean;
  client_id: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
  subscription_plan: number[];
  created_at: string;
  updated_at: string;
}

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params?.id;
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/platform-admin/api/tenants/${tenantId}/`, {
          headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tenant');
        }

        const data = await response.json();
        setTenant(data);
      } catch (err) {
        console.error('Error fetching tenant:', err);
        setError('Failed to load tenant data');
        toast.error('Failed to load tenant data');
      } finally {
        setLoading(false);
      }
    };

    if (tenantId) {
      fetchTenant();
    }
  }, [tenantId]);

  // Handle form submission
  const handleSubmit = async () => {
    // The actual API call is handled in the TenantForm component
    // Navigate back to tenants list after successful update
    router.push('/platform-admin/tenants');
  };
  
  // Handle cancel button
  const handleCancel = () => {
    router.push('/platform-admin/tenants');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }


  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link href="/platform-admin" passHref>
            <MuiLink underline="hover" color="inherit">Dashboard</MuiLink>
          </Link>
          <Link href="/platform-admin/tenants" passHref>
            <MuiLink underline="hover" color="inherit">Tenants</MuiLink>
          </Link>
          <Typography color="text.primary">Edit</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Edit Tenant: {tenant?.name}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Update the tenant details below. Changes will be applied immediately after saving.
        </Typography>
      </Box>
      
      {tenant && (
        <TenantForm 
          tenant={tenant}
          onSubmit={handleSubmit} 
          onCancel={handleCancel}
        />
      )}
    </Box>
  );
}
