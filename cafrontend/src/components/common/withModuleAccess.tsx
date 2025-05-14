import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Box, Typography, CircularProgress } from '@mui/material';
import { checkModuleAccess } from '../../my_features';

export const withModuleAccess = (WrappedComponent: React.ComponentType, moduleKey: string) => {
  return function WithModuleAccessWrapper(props: any) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const checkAccess = async () => {
        try {
          const result = await checkModuleAccess(moduleKey);
          if (!result.hasAccess) {
            setError(result.message || "You don't have access to this module");
          }
        } catch (err) {
          setError('Error checking module access');
        } finally {
          setLoading(false);
        }
      };

      checkAccess();
    }, []);

    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="error" variant="h6">{error}</Typography>
        </Box>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default withModuleAccess;
