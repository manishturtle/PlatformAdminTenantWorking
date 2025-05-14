import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { isTokenValid } from '../services/auth'; 
import { Box, CircularProgress, Container } from '@mui/material';

const IndexPage: React.FC = () => {
  const router = useRouter();

  useEffect(() => {
    if (router.isReady) {
      if (isTokenValid()) {
        console.log('User is authenticated, redirecting to /customers');
        router.replace('/customers'); 
      } else {
        console.log('User is not authenticated, redirecting to /login');
        router.replace('/login'); 
      }
    }
  }, [router.isReady, router]); 

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <CircularProgress />
      </Box>
    </Container>
  );
};

export default IndexPage;