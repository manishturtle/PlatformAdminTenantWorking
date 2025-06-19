'use client';

import { useState, useRef } from 'react';
import { Box, Typography, Container, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Radio, RadioGroup, Divider } from '@mui/material';
import { TenantConfig } from '@/services/tenantConfigService';
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
  const [isGeneralComplete, setIsGeneralComplete] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const generalFormRef = useRef<{ triggerSubmit: () => void }>(null);
  const brandingFormRef = useRef<{ triggerSubmit: () => void }>(null);

  const handleTabChange = (tab: string) => {
    if (tab === 'branding' && !isGeneralComplete) {
      // If trying to go to branding tab without completing general settings
      if (generalFormRef.current) {
        generalFormRef.current.triggerSubmit();
      }
      return;
    }
    setActiveTab(tab);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      if (activeTab === 'general' && generalFormRef.current) {
        // Trigger general form submission
        console.log('Triggering general form submission');
        generalFormRef.current.triggerSubmit();
      } else if (activeTab === 'branding' && brandingFormRef.current) {
        // Verify we have generalFormData before saving branding
        if (!generalFormData) {
          console.warn('No general form data available when trying to save branding');
          setSnackbar({
            open: true,
            message: 'Please complete and save the general settings first.',
            severity: 'warning'
          });
          setActiveTab('general');
          setIsSaving(false);
          return;
        }
        
        console.log('Triggering branding form submission with general data:', generalFormData);
        // Trigger branding form submission
        brandingFormRef.current.triggerSubmit();
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save settings. Please try again.',
        severity: 'error'
      });
      setIsSaving(false);
    }
  };
  
  const saveCombinedData = async (generalData: GeneralFormData, brandingData: BrandingFormData) => {
    try {
      // Validate that both datasets are available
      if (!generalData || Object.keys(generalData).length === 0) {
        throw new Error('General settings data is missing or empty');
      }
      
      if (!brandingData || Object.keys(brandingData).length === 0) {
        throw new Error('Branding settings data is missing or empty');
      }

      console.log('Creating API data with:\nGeneral:', generalData, '\nBranding:', brandingData);
      
      // Create the API data structure according to the backend model
      const apiData: TenantConfig = {
        company_info: {
          company_name: generalData.companyName || '',
          primary_contact_email: generalData.contactEmail || '',
          primary_contact_phone: generalData.contactPhone || '',
          tax_id: generalData.taxId || '',
          registered_address: {
            address_line_1: generalData.addressLine1 || '',
            address_line_2: generalData.addressLine2 || '',
            city: generalData.city || '',
            state: generalData.state || '',
            postal_code: generalData.postalCode || '',
            country: generalData.country || ''
          }
        },
        branding_config: {
          theme_mode: brandingData.default_theme_mode || 'light',
          primary_color: brandingData.primary_brand_color || '#1976d2',
          secondary_color: brandingData.secondary_brand_color || '#9c27b0',
          default_font_style: brandingData.default_font_style || 'Roboto',
          company_logo_light: brandingData.company_logo_light ? {
            url: brandingData.company_logo_light,
            filename: 'logo-light.png'
          } : undefined,
          company_logo_dark: brandingData.company_logo_dark ? {
            url: brandingData.company_logo_dark,
            filename: 'logo-dark.png'
          } : undefined,
          favicon: brandingData.favicon ? {
            url: brandingData.favicon,
            filename: 'favicon.ico'
          } : undefined,
          custom_css: ''
        },
        localization_config: {
          default_language: generalData.language || 'en',
          default_timezone: generalData.timezone || 'UTC',
          date_format: generalData.dateFormat || 'yyyy-MM-dd',
          currency: generalData.currency || 'USD',
          time_format: generalData.timeFormat === '24h' ? '24-hour' : generalData.timeFormat || '12h',
          
        },
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log('Saving tenant config:', JSON.stringify(apiData, null, 2));
      
      await saveTenantConfig(apiData);
      
      // Save the data to localStorage as backup
      localStorage.setItem('lastSavedConfig', JSON.stringify({
        generalData,
        brandingData,
        timestamp: new Date().toISOString()
      }));
      
      setSnackbar({
        open: true,
        message: 'Settings saved successfully!',
        severity: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('Error saving tenant config:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save settings',
        severity: 'error'
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneralSubmit = async (data: GeneralFormData) => {
    try {
      console.log('General form submitted:', data);
      setIsSaving(true);
      // Create a deep copy of the data to ensure it's fully captured
      const newGeneralData = JSON.parse(JSON.stringify(data));
      console.log('Storing general data in state:', newGeneralData);
      // Store the data in state for later use
      setGeneralFormData(newGeneralData);
      setIsGeneralComplete(true);
      
      // Store in localStorage as backup (will help debug persistence issues)
      localStorage.setItem('cachedGeneralSettings', JSON.stringify(newGeneralData));
      
      // Move to branding tab after saving general settings
      setActiveTab('branding');
      
      setSnackbar({
        open: true,
        message: 'General settings saved. Please configure branding.',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error in handleGeneralSubmit:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save general settings',
        severity: 'error'
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleBrandingSubmit = async (data: BrandingFormData) => {
    try {
      setIsSaving(true);
      let generalData = generalFormData;
      
      // If general form data is missing, try to recover from localStorage
      if (!generalData) {
        console.warn('General form data not found in state, attempting to recover from localStorage');
        const cachedData = localStorage.getItem('cachedGeneralSettings');
        if (cachedData) {
          try {
            generalData = JSON.parse(cachedData);
            console.log('Recovered general data from localStorage:', generalData);
            // Update the state with the recovered data
            setGeneralFormData(generalData);
            setIsGeneralComplete(true);
          } catch (e) {
            console.error('Failed to parse cached general settings:', e);
          }
        }
      }
      
      // If still no general data, redirect to general tab
      if (!generalData) {
        setSnackbar({
          open: true,
          message: 'Please complete general settings first before saving branding.',
          severity: 'warning'
        });
        setActiveTab('general');
        setIsSaving(false);
        return;
      }
      
      console.log('Branding form submitted:', data);
      console.log('Using general form data:', generalData);
      setBrandingFormData(data);
      
      // Save both general and branding data
      await saveCombinedData(generalData, data);
    } catch (error) {
      console.error('Error in handleBrandingSubmit:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save branding settings',
        severity: 'error'
      });
      throw error;
    } finally {
      setIsSaving(false);
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