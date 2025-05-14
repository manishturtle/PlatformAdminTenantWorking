"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthHeader } from '../../../utils/authUtils';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar
} from '@mui/material';
import { Person as PersonIcon, Assignment as AssignmentIcon, Settings as SettingsIcon } from '@mui/icons-material';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  [key: string]: any;
}

export default function TenantUserDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;
  
  useEffect(() => {
    // Check if user is logged in
    const loadUserData = () => {
      try {
        const userData = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (!userData || !token) {
          // Redirect to login if not logged in
          router.push(`/${tenantSlug}/login`);
          return;
        }
        
        setUser(JSON.parse(userData));
        setLoading(false);
      } catch (error) {
        console.error('Error loading user data:', error);
        setError('Failed to load user data');
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [tenantSlug, router]);
  
  const handleLogout = () => {
    // Clear user data and token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Redirect to login page
    router.push(`/${tenantSlug}/login`);
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button 
          variant="contained" 
          sx={{ mt: 2 }}
          onClick={() => router.push(`/${tenantSlug}/login`)}
        >
          Back to Login
        </Button>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
              {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="h5">
                Welcome, {user?.first_name || 'User'}!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </Box>
          </Box>
          <Button 
            variant="outlined" 
            color="primary"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1">
          You are logged in to the {tenantSlug} tenant portal.
        </Typography>
      </Paper>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">My Profile</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View and update your profile information
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">View Profile</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">My Tasks</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                View your assigned tasks and activities
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">View Tasks</Button>
            </CardActions>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SettingsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Settings</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Manage your account settings and preferences
              </Typography>
            </CardContent>
            <CardActions>
              <Button size="small">View Settings</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
