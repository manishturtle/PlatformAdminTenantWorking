import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Box, Container, Typography, Button, CircularProgress } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import SOPStepsScreen from '../../../../components/sops/SOPStepsScreen';
import sopApi from '../../../../services/api/sopApi';
import { SOP } from '../../../../types/sop';
import withAuth from '../../../../components/auth/withAuth';

const SOPStepsPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const sopId = typeof id === 'string' ? parseInt(id, 10) : undefined;
  
  const [sop, setSOP] = useState<SOP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const loadSOP = async () => {
      if (!sopId) return;
      
      try {
        setLoading(true);
        const response = await sopApi.getSOP(sopId);
        setSOP(response);
      } catch (err) {
        console.error('Error loading SOP:', err);
        setError('Failed to load SOP details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (sopId) {
      loadSOP();
    }
  }, [sopId]);
  
  const handleBack = () => {
    router.back();
  };
  
  return (
    <>
      <Head>
        <title>{sop ? `${sop.SOPName} - Steps` : 'SOP Steps'} | Software4CA</title>
        <meta name="description" content="Manage SOP steps" />
      </Head>
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ mt: 4 }}>
              <Typography color="error">{error}</Typography>
            </Box>
          ) : sop ? (
            <>
              <Typography variant="h4" component="h1" gutterBottom>
                {sop.SOPName} - Steps
              </Typography>
              <Typography variant="subtitle1" color="text.secondary" gutterBottom>
                Status: {sop.Status}
              </Typography>
              
              <Box sx={{ mt: 4 }}>
                <SOPStepsScreen sopId={sop.SOPId} sopName={sop.SOPName} />
              </Box>
            </>
          ) : (
            <Box sx={{ mt: 4 }}>
              <Typography>SOP not found</Typography>
            </Box>
          )}
        </Box>
      </Container>
    </>
  );
};

export default withAuth(SOPStepsPage);
