import React from 'react';
import { Box, Container, Paper } from '@mui/material';
import AddCustomerScreen from '../../../components/customers/AddCustomerScreen';
import { NextPage } from 'next';
import Head from 'next/head';
import withFeatureAccess from '../../../components/common/withFeatureAccess';

const AddCustomerPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Add Customer | Software4CA</title>
        <meta name="description" content="Add a new customer" />
      </Head>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Paper elevation={0} sx={{ p: 0 }}>
            <AddCustomerScreen />
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export default withFeatureAccess(AddCustomerPage, 'customers', 'add_customer');
