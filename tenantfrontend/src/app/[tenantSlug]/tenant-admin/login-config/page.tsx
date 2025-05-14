"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Grid,
  FormControl,
  FormHelperText,
  Card,
  CardMedia,
  CardContent,
  Divider,
  Alert,
  Snackbar
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SaveIcon from '@mui/icons-material/Save';
import { styled } from '@mui/material/styles';

// Styled component for the file input
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function LoginConfigPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;
  
  // State for form fields
  const [brandName, setBrandName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Load existing configuration if available
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/${tenantSlug}/tenant-admin/login-config/`);
        
        if (response.ok) {
          const data = await response.json();
          setBrandName(data.brand_name || '');
          if (data.logo) {
            setLogoPreview(`http://localhost:8000${data.logo}`);
          }
        }
      } catch (err) {
        console.error('Error fetching login config:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchConfig();
  }, [tenantSlug]);
  
  // Handle logo file selection
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        setError(`Please select a valid image file (PNG, JPG, or SVG). Current file type: ${file.type}`);
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size should be less than 2MB');
        return;
      }
      
      console.log('Selected file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      setLogoFile(file);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('brand_name', brandName);
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      const response = await fetch(`http://localhost:8000/api/${tenantSlug}/tenant-admin/login-config/`, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header, let the browser set it with the boundary
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to save login configuration');
      }
      
      setSuccess(true);
    } catch (err) {
      console.error('Error saving login config:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle snackbar close
  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Login Page Configuration
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Customize how your login page appears to users. Upload your company logo and set your brand name.
        </Typography>
        
        <Divider sx={{ my: 3 }} />
        
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={4}>
            {/* Logo Upload Section */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Company Logo
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Button
                  component="label"
                  variant="contained"
                  startIcon={<CloudUploadIcon />}
                  sx={{ mb: 2 }}
                >
                  Upload Logo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    style={{ display: 'none' }}
                  />
                </Button>
                <FormHelperText>
                  Recommended size: 300x100 pixels. Max file size: 2MB.
                  Supported formats: PNG, JPG, SVG.
                </FormHelperText>
              </Box>
              
              {/* Logo Preview */}
              {logoPreview && (
                <Card sx={{ maxWidth: 300, mb: 2 }}>
                  <CardMedia
                    component="img"
                    image={logoPreview}
                    alt="Logo Preview"
                    sx={{ height: 140, objectFit: 'contain', p: 2, bgcolor: '#f5f5f5' }}
                  />
                  <CardContent>
                    <Typography variant="body2" color="text.secondary">
                      Logo Preview
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>
            
            {/* Brand Name Section */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Brand Information
              </Typography>
              <FormControl fullWidth>
                <TextField
                  label="Brand Name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Enter your company or brand name"
                  helperText="This will be displayed on the login page"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                />
              </FormControl>
            </Grid>
          </Grid>
          
          {/* Error message */}
          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}
          
          {/* Submit Button */}
          <Box sx={{ mt: 4, textAlign: 'right' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </Button>
          </Box>
        </Box>
      </Paper>
      
      {/* Success notification */}
      <Snackbar 
        open={success} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Login page configuration saved successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
}
