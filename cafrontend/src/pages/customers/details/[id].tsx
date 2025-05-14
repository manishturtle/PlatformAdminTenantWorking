import React from 'react';
import { useRouter } from 'next/router';
import { Box, Container, Typography, Button, Paper, Breadcrumbs, Link } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CustomerDetailsScreen from '../../../components/customers/CustomerDetailsScreen';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';

interface CustomerDetailsPageProps {
  id: string;
}

const CustomerDetailsPage: NextPage<CustomerDetailsPageProps> = ({ id }) => {
  const router = useRouter();

  if (router.isFallback) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Loading...
          </Typography>
        </Box>
      </Container>
    );
  }

  if (!id || Array.isArray(id)) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Customer not found
          </Typography>
          <Link
            underline="hover"
            color="inherit"
            href="/customers"
            onClick={(e) => {
              e.preventDefault();
              router.push('/customers');
            }}
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <ArrowBackIcon sx={{ mr: 0.5 }} fontSize="small" />
            Back to Customers
          </Link>
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Customer Details | Software4CA</title>
        <meta name="description" content="View customer details" />
      </Head>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Box mb={4}>
            <Breadcrumbs aria-label="breadcrumb">
              <Link 
                underline="hover" 
                color="inherit" 
                href="/customers"
                onClick={(e) => {
                  e.preventDefault();
                  router.push('/customers');
                }}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                <ArrowBackIcon sx={{ mr: 0.5 }} fontSize="small" />
                Back to Customers
              </Link>
              <Typography color="text.primary">Customer Details</Typography>
            </Breadcrumbs>
          </Box>
          
          <Paper elevation={0} sx={{ p: 0 }}>
            <CustomerDetailsScreen customerId={parseInt(id, 10)} />
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export const getStaticPaths = async () => {
  return {
    paths: [], // Don't pre-render any paths
    fallback: true // Generate pages on-demand
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params?.id;

  if (!id || Array.isArray(id)) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      id
    },
    revalidate: 1 // Regenerate page when a request comes in
  };
};

export default CustomerDetailsPage;
