'use client';

import { useState, useRef } from 'react';
import { Box, Typography, Container, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Radio, RadioGroup, Divider } from '@mui/material';
import Grid from '@mui/material/Grid'; // Import Grid v2
import { Settings as SettingsIcon, Notifications as NotificationsIcon, HelpOutline as HelpOutlineIcon } from '@mui/icons-material';

import GeneralSettings, { GeneralFormData } from '@/components/settings/GeneralSettings';
import BrandingVisuals, { BrandingFormData } from '@/components/settings/BrandingVisuals';
import SecurityAuthentication from '@/components/settings/SecurityAuthentication';
import { saveTenantConfig, mapToApiFormat } from '@/services/tenantConfigService';
import { Snackbar, Alert } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
// Types
type TimeFormat = '12h' | '24h';
type FirstDayOfWeek = 'sunday' | 'monday';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [generalFormData, setGeneralFormData] = useState<GeneralFormData | null>(null);
  const [brandingFormData, setBrandingFormData] = useState<BrandingFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const generalFormRef = useRef<{ triggerSubmit: () => void }>(null);
  const brandingFormRef = useRef<{ triggerSubmit: () => void }>(null);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // First, trigger form validation and submission for the active tab
      // This will update the formData state
      if (activeTab === 'general' && generalFormRef.current) {
        generalFormRef.current.triggerSubmit();
        return; // The save will continue in handleGeneralSubmit
      } else if (activeTab === 'branding' && brandingFormRef.current) {
        brandingFormRef.current.triggerSubmit();
        return; // The save will continue in handleBrandingSubmit
      }
      
      // If we get here, we're not in a form submission flow, but have both data
      if (generalFormData && brandingFormData) {
        await saveCombinedData();
      } else {
        // If we don't have both forms' data, show an error
        setSnackbar({
          open: true,
          message: 'Please fill out all required fields',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save settings. Please try again.',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const saveCombinedData = async () => {
    if (!generalFormData || !brandingFormData) {
      throw new Error('Missing form data');
    }
    
    const combinedData = {
      ...generalFormData,
      ...brandingFormData
    };
    
    console.log('Saving tenant config:', combinedData);
    
    // Map to API format and save
    const apiData = mapToApiFormat(combinedData);
    await saveTenantConfig(apiData);
    
    setSnackbar({
      open: true,
      message: 'Settings saved successfully!',
      severity: 'success'
    });
  };

  const handleGeneralSubmit = (data: GeneralFormData) => {
    console.log('General form submitted:', data);
    const newGeneralData = { ...data };
    setGeneralFormData(newGeneralData);
    
    // If we have branding data, save the combined data
    if (brandingFormData) {
      const combinedData = {
        ...newGeneralData,
        ...brandingFormData
      };
      console.log('Saving after general form submit:', combinedData);
      saveCombinedData();
    }
  };

  const handleBrandingSubmit = (data: BrandingFormData) => {
    console.log('Branding form submitted:', data);
    const newBrandingData = { ...data };
    setBrandingFormData(newBrandingData);
    
    // If we have general data, save the combined data
    if (generalFormData) {
      const combinedData = {
        ...generalFormData,
        ...newBrandingData
      };
      console.log('Saving after branding form submit:', combinedData);
      saveCombinedData();
    }
  };
  
  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Main Content */}
      <Box component="main" sx={{ p: 3 }}>
      
        {/* Header with Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">Tenant Settings</Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Box sx={{ display: 'flex', gap: 4 }}>
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                sx={{
                  pb: 2,
                  borderRadius: 0,
                  color: activeTab === tab.id ? 'primary.main' : 'text.secondary',
                  borderBottom: activeTab === tab.id ? 2 : 'none',
                  borderColor: 'primary.main',
                  '&:hover': {
                    bgcolor: 'transparent',
                  },
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Box>
        </Box>

        {activeTab === 'general' && (
          <GeneralSettings 
            ref={generalFormRef}
            onSave={handleGeneralSubmit} 
          />
        )}

        {activeTab === 'branding' && (
          <BrandingVisuals 
            ref={brandingFormRef}
            onSave={handleBrandingSubmit} 
          />
        )}
        
        {activeTab === 'security' && (
          <SecurityAuthentication onSave={() => {}} />
        )}
        
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
       
      </Box>
    </Box>
  );
};

// Tabs
const tabs = [
  { id: 'general', label: 'General Settings' },
  { id: 'branding', label: 'Branding & Visuals' },
  { id: 'security', label: 'Security & Authentication' }
  // { id: 'notifications', label: 'Notifications & Channels' },
];

export default SettingsPage;