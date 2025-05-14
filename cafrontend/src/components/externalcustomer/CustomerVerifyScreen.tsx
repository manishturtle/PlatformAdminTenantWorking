import React from 'react';
import { Container, Typography, Box, CircularProgress } from '@mui/material';
import { useRouter } from 'next/router';
import PortalLogin from '../layouts/PortalLogin';

const CustomerVerifyScreen: React.FC = () => {
  const router = useRouter();
  const { token } = router.query;

  React.useEffect(() => {
    if (token) {
      // TODO: Implement verification logic with the token
      console.log('Verifying token:', token);
    }
  }, [token]);

  return (
    <PortalLogin>
      <Container maxWidth="sm">
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Verifying your account...
          </Typography>
        </Box>
      </Container>
    </PortalLogin>
  );
};

export default CustomerVerifyScreen;
