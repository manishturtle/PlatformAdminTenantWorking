import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import SOPMasterScreen from '../../components/sops/SOPMasterScreen';
import withAuth from '../../components/auth/withAuth';

const SOPsPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>SOPs Management | ITR App</title>
        <meta name="description" content="Manage Standard Operating Procedures" />
      </Head>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link href="/" passHref>
              <MuiLink underline="hover" color="inherit">
                Home
              </MuiLink>
            </Link>
            <Typography color="text.primary">SOPs</Typography>
          </Breadcrumbs>
        </Box>
        
        <SOPMasterScreen />
      </Container>
    </>
  );
};

export default withAuth(SOPsPage);
