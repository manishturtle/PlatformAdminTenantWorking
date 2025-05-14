import React, { useState, useRef } from 'react';
import { LoginPageConfig } from './types';
import {
  Box,
  Container,
  Grid,
  TextField,
  Button,
  Typography,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  FormControlLabel,
  Switch,
  Card,
  CardContent,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { defaultLoginConfig } from './defaultConfig';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';

type Theme = 'light' | 'dark';
type LogoSize = 'small' | 'medium' | 'large';
type Alignment = 'left' | 'center' | 'right';

export const LoginConfigScreen: React.FC = () => {
  const [config, setConfig] = useState<LoginPageConfig>(defaultLoginConfig);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConfigChange = (field: keyof LoginPageConfig, value: any) => {
    setConfig((prev: LoginPageConfig) => ({ ...prev, [field]: value }));
  };

  const handleNestedConfigChange = (section: keyof LoginPageConfig, field: string, value: any) => {
    setConfig((prevConfig: LoginPageConfig) => ({
      ...prevConfig,
      [section]: {
        ...(prevConfig[section] as Record<string, any>),
        [field]: value,
      },
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        handleNestedConfigChange('logo', 'file', file);
        handleNestedConfigChange('logo', 'previewUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDeleteImage = () => {
    handleNestedConfigChange('logo', 'file', undefined);
    handleNestedConfigChange('logo', 'previewUrl', undefined);
  };

  const handleThemeChange = (event: SelectChangeEvent) => {
    handleConfigChange('theme', event.target.value as Theme);
  };

  const handleLogoSizeChange = (event: SelectChangeEvent) => {
    handleNestedConfigChange('layout', 'logoSize', event.target.value as LogoSize);
  };

  const handleAlignmentChange = (event: SelectChangeEvent) => {
    handleNestedConfigChange('layout', 'alignment', event.target.value as Alignment);
  };

  const handleSubmit = (email: string, password: string) => {
    console.log('Login attempt:', { email, password });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Login Page Configuration
          </Typography>
          
          <Grid container spacing={3}>
            {/* Company Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Name"
                value={config.companyName}
                onChange={(e) => handleConfigChange('companyName', e.target.value)}
              />
            </Grid>

            {/* Logo Upload */}
            <Grid item xs={12}>
              <Box sx={{ border: '1px dashed grey', p: 2, borderRadius: 1 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                  {config.logo.previewUrl ? (
                    <Box sx={{ position: 'relative' }}>
                      <img
                        src={config.logo.previewUrl}
                        alt={config.logo.altText}
                        style={{ maxWidth: '200px', marginBottom: '1rem' }}
                      />
                      <IconButton
                        size="small"
                        onClick={handleDeleteImage}
                        sx={{ position: 'absolute', top: -10, right: -10 }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ) : null}
                  <Button
                    variant="contained"
                    startIcon={<CloudUploadIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Logo
                  </Button>
                </Box>
              </Box>
            </Grid>

            {/* Logo Alt Text */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Logo Alt Text"
                value={config.logo.altText}
                onChange={(e) => handleNestedConfigChange('logo', 'altText', e.target.value)}
              />
            </Grid>

            {/* Theme */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={config.theme}
                  onChange={(e) => handleConfigChange('theme', e.target.value as 'light' | 'dark')}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Layout */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Logo Size</InputLabel>
                <Select
                  value={config.layout.logoSize}
                  onChange={(e) => handleNestedConfigChange('layout', 'logoSize', e.target.value as 'small' | 'medium' | 'large')}
                  label="Logo Size"
                >
                  <MenuItem value="small">Small</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="large">Large</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Logo Alignment</InputLabel>
                <Select
                  value={config.layout.alignment}
                  onChange={(e) => handleNestedConfigChange('layout', 'alignment', e.target.value as 'left' | 'center' | 'right')}
                  label="Logo Alignment"
                >
                  <MenuItem value="left">Left</MenuItem>
                  <MenuItem value="center">Center</MenuItem>
                  <MenuItem value="right">Right</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Social Login */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.socialLogin.enabled}
                    onChange={(e) => handleNestedConfigChange('socialLogin', 'enabled', e.target.checked)}
                  />
                }
                label="Enable Social Login"
              />
            </Grid>

            {/* Additional Features */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.additionalFeatures.rememberMe}
                    onChange={(e) => handleNestedConfigChange('additionalFeatures', 'rememberMe', e.target.checked)}
                  />
                }
                label="Enable Remember Me"
              />
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.additionalFeatures.forgotPassword}
                    onChange={(e) => handleNestedConfigChange('additionalFeatures', 'forgotPassword', e.target.checked)}
                  />
                }
                label="Enable Forgot Password"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};
