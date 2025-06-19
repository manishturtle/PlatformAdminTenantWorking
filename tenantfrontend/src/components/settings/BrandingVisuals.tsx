"use client";

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  InputAdornment,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Popover,
} from '@mui/material';
import { CloudUpload, Image as ImageIcon } from '@mui/icons-material';
import { ChromePicker, type ColorResult } from 'react-color';

interface BrandingVisualsProps {
  // Add any props if needed
}

const BrandingVisuals: React.FC<BrandingVisualsProps> = () => {
  const [themeMode, setThemeMode] = useState<string>('light');
  const [primaryColor, setPrimaryColor] = useState<string>('#000080');
  const [secondaryColor, setSecondaryColor] = useState<string>('#D3D3D3');
  const [fontStyle, setFontStyle] = useState<string>('Roboto');
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [colorPickerFor, setColorPickerFor] = useState<'primary' | 'secondary' | null>(null);
  const [imagePreviews, setImagePreviews] = useState({
    'light-logo': '',
    'dark-logo': '',
    'favicon': ''
  });

  const handleThemeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setThemeMode(event.target.value);
  };

  const handleFontStyleChange = (event: SelectChangeEvent<string>) => {
    setFontStyle(event.target.value);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log(`Uploading ${type}:`, file.name);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => ({
          ...prev,
          [type]: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleColorClick = (event: React.MouseEvent<HTMLElement>, type: 'primary' | 'secondary') => {
    setColorPickerFor(type);
    setAnchorEl(event.currentTarget);
  };

  const handleColorClose = () => {
    setAnchorEl(null);
    setColorPickerFor(null);
  };

  const handleColorChange = (color: ColorResult) => {
    if (colorPickerFor === 'primary') {
      setPrimaryColor(color.hex);
    } else if (colorPickerFor === 'secondary') {
      setSecondaryColor(color.hex);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Color Picker Popover */}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleColorClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
      >
        <ChromePicker
          color={colorPickerFor === 'primary' ? primaryColor : secondaryColor}
          onChange={handleColorChange}
        />
      </Popover>
      <Paper elevation={0} sx={{ p: 4, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
        {/* Company Logo - Light Background */}
        <Box mb={6}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight={500}>Company Logo (Light Background)</Typography>
            <Typography variant="caption" color="error" fontWeight={500}>Required</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This logo will be displayed on light backgrounds throughout the application
          </Typography>
          <Box display="flex" alignItems="center">
            <Box
              width={120}
              height={120}
              bgcolor="grey.100"
              borderRadius={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={3}
              overflow="hidden"
            >
              {imagePreviews['light-logo'] ? (
                <img 
                  src={imagePreviews['light-logo']} 
                  alt="Light logo preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <ImageIcon sx={{ color: 'grey.400', fontSize: 40 }} />
              )}
            </Box>
            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{ mb: 1 }}
              >
                Upload Logo
                <input
                  type="file"
                  hidden
                  accept="image/png, image/svg+xml"
                  onChange={(e) => handleFileUpload(e, 'light-logo')}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block">
                Recommended size: 200x200px. PNG or SVG format preferred.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Company Logo - Dark Background */}
        <Box mb={6}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight={500}>Company Logo (Dark Background)</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>Optional</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This logo will be displayed on dark backgrounds throughout the application
          </Typography>
          <Box display="flex" alignItems="center">
            <Box
              width={120}
              height={120}
              bgcolor="grey.800"
              borderRadius={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={3}
              overflow="hidden"
            >
              {imagePreviews['dark-logo'] ? (
                <img 
                  src={imagePreviews['dark-logo']} 
                  alt="Dark logo preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <ImageIcon sx={{ color: 'grey.500', fontSize: 40 }} />
              )}
            </Box>
            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{ mb: 1 }}
              >
                Upload Logo
                <input
                  type="file"
                  hidden
                  accept="image/png, image/svg+xml"
                  onChange={(e) => handleFileUpload(e, 'dark-logo')}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block">
                Recommended size: 200x200px. PNG or SVG format preferred.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Favicon */}
        <Box mb={6}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight={500}>Favicon</Typography>
            <Typography variant="caption" color="error" fontWeight={500}>Required</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            This icon will be displayed in browser tabs
          </Typography>
          <Box display="flex" alignItems="center">
            <Box
              width={64}
              height={64}
              bgcolor="grey.100"
              borderRadius={1}
              display="flex"
              alignItems="center"
              justifyContent="center"
              mr={3}
              overflow="hidden"
            >
              {imagePreviews['favicon'] ? (
                <img 
                  src={imagePreviews['favicon']} 
                  alt="Favicon preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                />
              ) : (
                <ImageIcon sx={{ color: 'grey.400', fontSize: 24 }} />
              )}
            </Box>
            <Box>
              <Button
                component="label"
                variant="outlined"
                startIcon={<CloudUpload />}
                sx={{ mb: 1 }}
              >
                Upload Favicon
                <input
                  type="file"
                  hidden
                  accept="image/x-icon,image/png,image/svg+xml"
                  onChange={(e) => handleFileUpload(e, 'favicon')}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" display="block">
                Recommended size: 32x32px or 64x64px. ICO, PNG or SVG format.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Brand Colors */}
        <Box mb={6}>
          <Typography variant="h6" fontWeight={500} mb={1}>Brand Colors</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            These colors will be used throughout the application
          </Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
            {/* Primary Color Picker */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Primary Brand Color
              </Typography>
              <Box display="flex" alignItems="center">
                <Box
                  width={40}
                  height={40}
                  bgcolor={primaryColor}
                  borderRadius="4px 0 0 4px"
                  border="1px solid"
                  borderColor="divider"
                  borderRight="none"
                  onClick={(e) => handleColorClick(e, 'primary')}
                  sx={{ cursor: 'pointer' }}
                />
                <TextField
                  fullWidth
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Used for buttons, links and primary actions
              </Typography>
            </Box>

            {/* Secondary Color Picker */}
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Secondary Brand Color
              </Typography>
              <Box display="flex" alignItems="center">
                <Box
                  width={40}
                  height={40}
                  bgcolor={secondaryColor}
                  borderRadius="4px 0 0 4px"
                  border="1px solid"
                  borderColor="divider"
                  borderRight="none"
                  onClick={(e) => handleColorClick(e, 'secondary')}
                  sx={{ cursor: 'pointer' }}
                />
                <TextField
                  fullWidth
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderTopLeftRadius: 0,
                      borderBottomLeftRadius: 0,
                    }
                  }}    
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Used for secondary elements and accents
              </Typography>
            </Box>
          </Box>
        </Box>
        

        {/* Typography & Theme */}
        <Box>
          <Typography variant="h6" fontWeight={500} mb={1}>Typography & Theme</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Configure the look and feel of your application
          </Typography>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={3}>
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Default Font Style
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  value={fontStyle}
                  onChange={handleFontStyleChange}
                  displayEmpty
                >
                  <MenuItem value="Roboto">Roboto</MenuItem>
                  <MenuItem value="Open Sans">Open Sans</MenuItem>
                  <MenuItem value="Lato">Lato</MenuItem>
                </Select>
              </FormControl>
              <Typography variant="caption" color="text.secondary">
                This font will be used throughout the application
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" fontWeight={500} gutterBottom>
                Default Theme Mode
              </Typography>
              <FormControl component="fieldset">
                <RadioGroup
                  row
                  value={themeMode}
                  onChange={handleThemeChange}
                >
                  <FormControlLabel
                    value="light"
                    control={<Radio size="small" />}
                    label="Light"
                  />
                  <FormControlLabel
                    value="dark"
                    control={<Radio size="small" />}
                    label="Dark"
                    sx={{ ml: 3 }}
                  />
                  <FormControlLabel
                    value="system"
                    control={<Radio size="small" />}
                    label="System Default"
                    sx={{ ml: 3 }}
                  />
                </RadioGroup>
              </FormControl>
              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Users can override this setting in their preferences
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default BrandingVisuals;