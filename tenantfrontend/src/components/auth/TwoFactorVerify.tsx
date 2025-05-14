import React, { useState, useEffect } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Paper,
  CircularProgress,
  Alert,
  Link as MuiLink
} from '@mui/material';
import { motion } from 'framer-motion';

interface TwoFactorVerifyProps {
  onVerify: (code: string) => Promise<void>;
  isLoading: boolean;
  needs2FASetup: boolean;
  userId: string;
}

const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({ 
  onVerify, 
  isLoading, 
  needs2FASetup,
  userId
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secretKey, setSecretKey] = useState('');
  
  useEffect(() => {
    // If 2FA setup is needed, fetch the QR code and secret
    if (needs2FASetup) {
      const fetchSetupData = async () => {
        try {
          // This would normally call an API to get setup data
          // For now, we'll just simulate it
          setQrCodeUrl('https://example.com/qrcode');
          setSecretKey('EXAMPLEKEY123456');
        } catch (error) {
          console.error('Error fetching 2FA setup data:', error);
          setError('Failed to load 2FA setup. Please try again.');
        }
      };
      
      fetchSetupData();
    }
  }, [needs2FASetup, userId]);
  
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value);
    if (error) setError('');
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code) {
      setError('Please enter the verification code');
      return;
    }
    
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Code must be 6 digits');
      return;
    }
    
    try {
      await onVerify(code);
    } catch (error) {
      console.error('Verification error:', error);
      setError('Invalid code. Please try again.');
    }
  };
  
  return (
    <Paper
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      elevation={3}
      sx={{ p: 4, width: '100%', borderRadius: 2 }}
    >
      <Typography component="h1" variant="h4" align="center" gutterBottom>
        Two-Factor Authentication
      </Typography>
      
      {needs2FASetup ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Set Up Two-Factor Authentication
          </Typography>
          
          <Typography variant="body1" paragraph>
            Scan this QR code with your authenticator app (like Google Authenticator or Authy):
          </Typography>
          
          {qrCodeUrl && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
              <img src={qrCodeUrl} alt="QR Code for 2FA setup" width="200" height="200" />
            </Box>
          )}
          
          <Typography variant="body1" paragraph>
            Or manually enter this key in your authenticator app:
          </Typography>
          
          <Box sx={{ 
            backgroundColor: '#f5f5f5', 
            p: 2, 
            borderRadius: 1, 
            textAlign: 'center',
            mb: 3,
            fontFamily: 'monospace',
            fontSize: '1.2rem',
            letterSpacing: '0.1rem'
          }}>
            {secretKey}
          </Box>
          
          <Typography variant="body2" sx={{ mb: 3 }}>
            After scanning the QR code or entering the key, enter the 6-digit code from your authenticator app below.
          </Typography>
        </Box>
      ) : (
        <Typography variant="body1" sx={{ mb: 3 }}>
          Enter the 6-digit code from your authenticator app.
        </Typography>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="code"
          label="Verification Code"
          name="code"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={handleCodeChange}
          error={!!error}
          helperText={error ? error : "Enter the 6-digit code"}
          inputProps={{ 
            maxLength: 6,
            inputMode: 'numeric',
            pattern: '[0-9]*'
          }}
          disabled={isLoading}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2, py: 1.5 }}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Verify'}
        </Button>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <MuiLink href="#" variant="body2" onClick={() => window.history.back()}>
            Back to Login
          </MuiLink>
        </Box>
      </Box>
    </Paper>
  );
};

export default TwoFactorVerify;
