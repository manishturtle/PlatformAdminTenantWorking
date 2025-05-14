import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress, Box, Typography } from '@mui/material';
import { isAuthenticated, isPlatformAdmin } from '@/services/authService';

// Higher-order component to protect admin routes
const withAdminAuth = <P extends object>(Component: React.ComponentType<P>) => {
  const WithAdminAuth: React.FC<P> = (props) => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
      // Check if the user is authenticated and is a platform admin
      const checkAuth = () => {
        if (!isAuthenticated()) {
          // User is not authenticated, redirect to login
          router.push('/platform-admin/login');
          return;
        }

        if (!isPlatformAdmin()) {
          // User is authenticated but not a platform admin
          router.push('/unauthorized');
          return;
        }

        // User is authenticated and is a platform admin
        setAuthorized(true);
        setLoading(false);
      };

      checkAuth();
    }, [router]);

    if (loading) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Verifying authentication...
          </Typography>
        </Box>
      );
    }

    return authorized ? <Component {...props} /> : null;
  };

  // Set display name for the wrapped component
  const displayName = Component.displayName || Component.name || 'Component';
  WithAdminAuth.displayName = `withAdminAuth(${displayName})`;

  return WithAdminAuth;
};

export default withAdminAuth;
