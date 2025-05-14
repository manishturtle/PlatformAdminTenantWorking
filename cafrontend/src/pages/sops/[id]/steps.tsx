import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Breadcrumbs, Link as MuiLink, CircularProgress, Alert } from '@mui/material';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import SOPStepsScreen from '../../../components/sops/SOPStepsScreen';
import withAuth from '../../../components/auth/withAuth';
import sopApi from '../../../services/api/sopApi';
import { SOP } from '../../../types/sop';

const SOPStepsPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const sopId = typeof id === 'string' ? parseInt(id, 10) : undefined;
  
  const [sop, setSOP] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadSOP = async () => {
      if (!sopId || isNaN(sopId)) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const sopData = await sopApi.getSOP(sopId);
        setSOP(sopData);
      } catch (err) {
        console.error('Error loading SOP:', err);
        setError('Failed to load SOP details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadSOP();
  }, [sopId]);
  
  return (
    <>
      <Head>
        <title>{sop ? `${sop.SOPName} - Steps` : 'SOP Steps'} | ITR App</title>
        <meta name="description" content="Manage SOP Steps" />
      </Head>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link href="/" passHref>
              <MuiLink underline="hover" color="inherit">
                Home
              </MuiLink>
            </Link>
            <Link href="/sops" passHref>
              <MuiLink underline="hover" color="inherit">
                SOPs
              </MuiLink>
            </Link>
            {sop && (
              <Typography color="text.primary">{sop.SOPName} - Steps</Typography>
            )}
          </Breadcrumbs>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : sopId ? (
          <SOPStepsScreen sopId={sopId} sopName={sop?.SOPName} />
        ) : (
          <Alert severity="warning">Invalid SOP ID</Alert>
        )}
      </Container>
    </>
  );
};

export default withAuth(SOPStepsPage);
