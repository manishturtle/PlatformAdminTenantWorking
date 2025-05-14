import React from 'react';
import { Box, Container, Typography, TextField, Button, Paper } from '@mui/material';
import { LoginPageConfig } from './types';

interface ConfigurableLoginPageProps {
  config: Partial<LoginPageConfig>;
  onSubmit: (email: string, password: string) => void;
}

export const ConfigurableLoginPage: React.FC<ConfigurableLoginPageProps> = ({ config, onSubmit }) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  const styles = {
    root: {
      backgroundColor: config.colors?.backgroundColor || '#ffffff',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    paper: {
      padding: '40px',
      maxWidth: config.layout?.maxWidth || '400px',
      width: '100%',
    },
    logo: {
      width: '100%',
      maxWidth: (() => {
        switch (config.layout?.logoSize) {
          case 'small': return '100px';
          case 'large': return '300px';
          default: return '200px';
        }
      })(),
      marginBottom: '20px',
      display: 'block',
      textAlign: config.layout?.alignment || 'center',
    },
    title: {
      color: config.colors?.textColor || '#000000',
      marginBottom: '8px',
      fontFamily: config.font?.family || 'Arial',
      fontSize: config.font?.size || '24px',
      fontWeight: config.font?.weight || '500',
      textAlign: config.layout?.alignment || 'center',
    },
    subtitle: {
      color: config.colors?.textColor || '#666666',
      marginBottom: '24px',
      fontFamily: config.font?.family || 'Arial',
      fontSize: config.font?.size || '16px',
      fontWeight: config.font?.weight || '400',
      textAlign: config.layout?.alignment || 'center',
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
    },
    input: {
      '& .MuiOutlinedInput-root': {
        '& fieldset': {
          borderColor: config.colors?.textColor || '#000000',
        },
        '&:hover fieldset': {
          borderColor: config.colors?.textColor || '#000000',
        },
        '&.Mui-focused fieldset': {
          borderColor: config.colors?.primaryColor || '#1976d2',
        },
      },
      '& .MuiInputLabel-root': {
        color: config.colors?.textColor || '#000000',
        fontFamily: config.font?.family || 'Arial',
      },
      '& .MuiInputBase-input': {
        color: config.colors?.textColor || '#000000',
        fontFamily: config.font?.family || 'Arial',
      },
    },
    button: {
      backgroundColor: config.colors?.primaryColor || '#1976d2',
      color: '#ffffff',
      borderRadius: config.buttonStyle?.borderRadius || '4px',
      padding: config.buttonStyle?.padding || '8px 16px',
      fontFamily: config.font?.family || 'Arial',
      '&:hover': {
        backgroundColor: config.colors?.primaryColor || '#1565c0',
        opacity: 0.9,
      },
    },
  };

  return (
    <Box sx={styles.root}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={styles.paper}>
          {config.logo?.previewUrl && (
            <Box
              component="img"
              src={config.logo.previewUrl}
              alt={config.logo.altText || 'Logo'}
              sx={styles.logo}
            />
          )}
          <Typography variant="h4" component="h1" sx={styles.title}>
            {config.content?.title || 'Welcome Back'}
          </Typography>
          <Typography variant="subtitle1" sx={styles.subtitle}>
            {config.content?.subtitle || 'Please sign in to continue'}
          </Typography>
          <form onSubmit={handleSubmit} style={styles.form}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              sx={styles.input}
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              sx={styles.input}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={styles.button}
            >
              Sign In
            </Button>
          </form>
          {config.content?.welcomeMessage && (
            <Typography
              variant="body2"
              align="center"
              sx={{ marginTop: '24px', ...styles.subtitle }}
            >
              {config.content.welcomeMessage}
            </Typography>
          )}
        </Paper>
      </Container>
    </Box>
  );
};
