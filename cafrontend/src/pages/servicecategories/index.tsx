import React from 'react';
import Head from 'next/head';
import { Container } from '@mui/material';
import ServiceCategoriesListComponent from '@/components/servicecategory/ServiceCategoriesListComponent';
import withAuth from '@/components/auth/withAuth';

const ServiceCategoriesPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Service Categories | Software4CA</title>
        <meta name="description" content="Manage service categories" />
      </Head>
      <Container maxWidth="lg">
        <ServiceCategoriesListComponent />
      </Container>
    </>
  );
};

export default withAuth(ServiceCategoriesPage);
