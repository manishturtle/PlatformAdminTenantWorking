import React from 'react';
import Head from 'next/head';
import { Box, Container, Paper, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import Image from 'next/image';

interface PortalLoginProps {
  children: React.ReactNode;
  title?: string;
}

const StyledMain = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: theme.palette.background.default,
  padding: theme.spacing(3, 2)
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  maxWidth: '400px',
  width: '100%',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[3]
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
  textAlign: 'center',
  '& img': {
    maxWidth: '150px',
    height: 'auto'
  }
}));

const PortalLogin = ({ children, title = 'Login' }: PortalLoginProps) => {
  return (
    <>
      <Head>
        <title>{title} - TurtleSoft</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <StyledMain>
        <Container maxWidth="sm">
          <StyledPaper elevation={3}>
            <LogoContainer>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                ITR App
              </Typography>
            </LogoContainer>
            {children}
          </StyledPaper>
        </Container>
      </StyledMain>
    </>
  );
};

export default PortalLogin;
