import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { LoginConfigScreen } from '../../components/login-config/LoginConfigScreen';
import { checkModuleAccess, type CheckAccessResponse } from '../../my_features';

const LoginConfigPage: React.FC = () => {
  const [accessStatus, setAccessStatus] = useState<CheckAccessResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // const response = await checkModuleAccess('login-config');
        const response = await checkModuleAccess('customers');
        setAccessStatus(response);
      } catch (error) {
        console.error('Error checking module access:', error);
        setAccessStatus({
          hasAccess: false,
          message: 'Error checking access permissions'
        });
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!accessStatus?.hasAccess) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Typography variant="h5" color="error">
          {accessStatus?.message || 'You do not have access to the Login Configuration module.'}
        </Typography>
      </Box>
    );
  }

  return <LoginConfigScreen />;
};

export default LoginConfigPage;
