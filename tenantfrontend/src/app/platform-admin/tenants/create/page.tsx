"use client";
import React from 'react';
import { Box, Typography, Container, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TenantForm from '../../../../components/admin/TenantForm';

export default function CreateTenantPage() {
  const router = useRouter();
  
  // Handle form submission
  const handleSubmit = async () => {
    // The actual API call is handled in the TenantForm component
    // Navigate back to tenants list after successful creation
    router.push('/platform-admin/tenants');
  };
  
  // Handle cancel button
  const handleCancel = () => {
    router.push('/platform-admin/tenants');
  };
  
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
          <Typography color="text.primary">Create</Typography>
        </Breadcrumbs>
        
        <Typography variant="h4" component="h1" gutterBottom>
          Create New Tenant
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Create a new tenant for your SaaS platform. The tenant will have its own isolated database schema.
        </Typography>
      </Box>
      
      <TenantForm 
        onSubmit={handleSubmit} 
        onCancel={handleCancel}
      />
    </Box>
  );
}
