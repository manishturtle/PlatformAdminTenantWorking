'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Container, 
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Link as MuiLink,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { checkUserExists, loginPlatformAdmin, verifyTwoFactorLogin } from '@/utils/api';
import { setAuthData } from '@/services/authService';
import Header from '@/components/common/Header';
import TwoFactorVerify from '@/components/auth/TwoFactorVerify';

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: '#1e8e3e',
    },
    secondary: {
      main: '#f50057',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

export default function PlatformAdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info' as 'info' | 'success' | 'warning' | 'error'
  });
  
  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [needs2FASetup, setNeeds2FASetup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const router = useRouter();
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
    // Reset user exists state when email changes
    if (userExists) setUserExists(false);
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError('');
  };
  
  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };
  
  const handleCheckUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError('');
    
    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    
    // Check if user exists
    setIsLoading(true);
    try {
      const response = await checkUserExists(email);
      console.log('Check user response:', response);
      
      // Check for user_exists or exists (for backward compatibility)
      if (response.user_exists || response.exists) {
        setUserExists(true);
        
        // Update URL with email parameter without navigation
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('email', email);
          window.history.replaceState({}, '', url.toString());
          
          // Focus on password field after a short delay
          setTimeout(() => {
            const passwordField = document.getElementById('password');
            if (passwordField) passwordField.focus();
          }, 100);
        }
      } else {
        // User doesn't exist
        setSnackbar({
          open: true,
          message: response.message || 'User not found. Please check your email or contact support.',
          severity: 'error'
        });
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking user:', error);
      setIsLoading(false);
      setSnackbar({
        open: true,
        message: 'Error checking user. Please try again.',
        severity: 'error'
      });
    }
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    
    // Validate inputs
    let hasError = false;
    
    if (!email) {
      setEmailError('Email is required');
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      hasError = true;
    }
    
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }
    
    if (hasError) return;
    
    // Attempt login
    setIsLoading(true);
    try {
      const response = await loginPlatformAdmin({ email, password });
      
      // Handle 2FA if required
      if (response.requires_2fa) {
        setRequires2FA(true);
        setNeeds2FASetup(response.needs_2fa_setup);
        setUserId(response.user_id);
        setIsLoading(false);
        return;
      }
      
      // Login successful, redirect to dashboard
      setAuthData(response);
      
      // Redirect to the platform admin dashboard
      router.push('/platform-admin');
      
    } catch (error) {
      console.error('Login error:', error);
      setIsLoading(false);
      // Keep userExists true when login fails so user doesn't have to re-enter email
      setUserExists(true);
      // Clear password field for security but keep focus on it
      setPassword('');
      // Show error message in snackbar
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Invalid credentials. Please check your password and try again.',
        severity: 'error'
      });
      // Focus on password field after error
      setTimeout(() => {
        const passwordField = document.getElementById('password');
        if (passwordField) passwordField.focus();
      }, 100);
    }
  };
  
  const handleVerify2FA = async (code: string) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await verifyTwoFactorLogin(userId, code);
      
      // Login successful, save token and user data
      setAuthData(response);
      
      // Redirect to the platform admin dashboard
      router.push('/platform-admin');
      
    } catch (error) {
      console.error('2FA verification error:', error);
      setIsLoading(false);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Verification failed. Please try again.',
        severity: 'error'
      });
    }
  };
  
  const handleSnackbarClose = () => {
    setSnackbar({
      ...snackbar,
      open: false
    });
  };
  
  useEffect(() => {
    // Check for email parameter in URL
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const emailParam = url.searchParams.get('email');
      if (emailParam) {
        setEmail(emailParam);
        setUserExists(true);
      }
    }
  }, []);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box component="main">
        
        <Container component="div" maxWidth="xs">
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
          >
            <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
              {snackbar.message}
            </Alert>
          </Snackbar>
          
          <Box
            sx={{
              marginTop: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {requires2FA ? (
              <TwoFactorVerify
                onVerify={handleVerify2FA}
                isLoading={isLoading}
                needs2FASetup={needs2FASetup}
                userId={userId || ''}
              />
            ) : (
              <Paper
                component={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                elevation={3}
                sx={{ p: 4, width: '100%', borderRadius: 2 }}
              >
                <Typography component="h1" variant="h4" align="center" gutterBottom>
                  Platform Admin Login
                </Typography>
                
                <Box component="form" noValidate sx={{ mt: 1 }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={handleEmailChange}
                    error={!!emailError}
                    helperText={emailError}
                    disabled={userExists || isLoading}
                  />
                  
                  {!userExists ? (
                    <Button
                      type="button"
                      fullWidth
                      variant="contained"
                      sx={{ mt: 3, mb: 2, py: 1.5 }}
                      onClick={handleCheckUser}
                      disabled={isLoading}
                    >
                      {isLoading ? <CircularProgress size={24} /> : 'Continue'}
                    </Button>
                  ) : (
                    <>
                      <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={handlePasswordChange}
                        error={!!passwordError}
                        helperText={passwordError}
                        disabled={isLoading}
                      />
                      
                      <Button
                        type="button"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2, py: 1.5 }}
                        onClick={handleLogin}
                        disabled={isLoading}
                      >
                        {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
                      </Button>
                    </>
                  )}
                  
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <MuiLink component={Link} href="/forgot-password" variant="body2">
                      Forgot password?
                    </MuiLink>
                  </Box>
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <MuiLink component={Link} href="/qa/login" variant="body2">
                      Tenant User Login
                    </MuiLink>
                  </Box>
                </Box>
              </Paper>
            )}
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
