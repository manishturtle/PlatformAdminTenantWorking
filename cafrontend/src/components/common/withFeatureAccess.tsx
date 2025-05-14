import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { checkFeatureAccess } from '../../my_features';

export const withFeatureAccess = (
  WrappedComponent: React.ComponentType,
  moduleKey: string,
  featureKey: string
) => {
  return function WithFeatureAccessWrapper(props: any) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const checkAccess = async () => {
        try {
          const result = await checkFeatureAccess(moduleKey, featureKey);
          if (!result.hasAccess) {
            setError(result.message || "You don't have access to this feature");
          }
        } catch (err) {
          setError('Error checking feature access');
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

export default withFeatureAccess;
