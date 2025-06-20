'use client';

import { useState, useRef, useEffect } from 'react';
import { Box, Typography, Container, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Radio, RadioGroup, Divider } from '@mui/material';
import { TenantConfig } from '@/services/tenantConfigService';
import Grid from '@mui/material/Grid'; 
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import CircularProgress from '@mui/material/CircularProgress';
import { Settings as SettingsIcon, Notifications as NotificationsIcon, HelpOutline as HelpOutlineIcon, Edit as EditIcon } from '@mui/icons-material';
import SaveIcon from '@mui/icons-material/Save';

import GeneralSettings, { GeneralFormData } from '@/components/settings/GeneralSettings';
import BrandingVisuals, { BrandingFormData } from '@/components/settings/BrandingVisuals';
import SecurityAuthentication from '@/components/settings/SecurityAuthentication';
import { saveTenantConfig } from '@/services/tenantConfigService';
import { getTenantConfig, TenantConfigData } from '@/services/tenantApi';

// Types
type TimeFormat = '12h' | '24h';
type FirstDayOfWeek = 'sunday' | 'monday';

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [isGeneralComplete, setIsGeneralComplete] = useState(false);
  const [generalFormData, setGeneralFormData] = useState<GeneralFormData | null>(null);
  const [brandingFormData, setBrandingFormData] = useState<BrandingFormData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingConfig, setExistingConfig] = useState<TenantConfigData | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  const generalFormRef = useRef<{ triggerSubmit: () => void }>(null);
  const brandingFormRef = useRef<{ triggerSubmit: () => void }>(null);

  // Fetch tenant configuration on component mount
  useEffect(() => {
    async function fetchTenantConfig() {
      try {
        setIsLoading(true);
        const configData = await getTenantConfig();
        console.log('Fetched tenant config:', configData);
        setExistingConfig(configData);
        
        // Pre-populate form data from API
        const mappedGeneralData: GeneralFormData = {
          companyName: configData.company_info?.company_name || '',
          contactEmail: configData.company_info?.primary_contact_email || '',
          contactPhone: configData.company_info?.primary_contact_phone || '',
          taxId: configData.company_info?.tax_id || '',
          addressLine1: configData.company_info?.registered_address?.address_line_1 || '',
          addressLine2: configData.company_info?.registered_address?.address_line_2 || '',
          city: configData.company_info?.registered_address?.city || '',
          state: configData.company_info?.registered_address?.state || '',
          postalCode: configData.company_info?.registered_address?.postal_code || '',
          country: configData.company_info?.registered_address?.country?.toString() || '',
          language: configData.localization_config?.default_language || 'en',
          timezone: configData.localization_config?.default_timezone || 'UTC',
          dateFormat: configData.localization_config?.date_format || 'yyyy-MM-dd',
          timeFormat: configData.localization_config?.time_format === '24-hour' ? '24h' : '12h',
          firstDayOfWeek: 'monday',
          currency: configData.localization_config?.currency || 'USD'
        };
        
        const mappedBrandingData: BrandingFormData = {
          default_theme_mode: (configData.branding_config?.default_theme_mode as 'light' | 'dark' | 'system') || 'light',
          primary_brand_color: configData.branding_config?.primary_brand_color || '#1976d2',
          secondary_brand_color: configData.branding_config?.secondary_brand_color || '#9c27b0',
          default_font_style: configData.branding_config?.default_font_style || 'Roboto',
          company_logo_light: configData.branding_config?.company_logo_light?.url || '',
          company_logo_dark: configData.branding_config?.company_logo_dark?.url || '',
          favicon: configData.branding_config?.favicon?.url || '',
          custom_css: configData.branding_config?.custom_css || ''
        };
        
        setGeneralFormData(mappedGeneralData);
        setBrandingFormData(mappedBrandingData);
        setIsGeneralComplete(true); // Allow access to branding tab if we have config data
        
        // Initial view is read-only mode
        setIsEditMode(false);
      } catch (error) {
        console.error('Failed to fetch tenant configuration:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load tenant settings. Starting in new configuration mode.',
          severity: 'warning'
        });
        setIsEditMode(true); // Start in edit mode if we can't fetch existing config
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTenantConfig();
  }, []);

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

  // Toggle between read and edit mode
  const handleToggleEditMode = () => {
    setIsEditMode(prev => !prev);
  };

  // Save button click handler
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
  
  // Exit edit mode after successful save
  const handleSaveSuccess = () => {
    setIsEditMode(false);
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
          default_theme_mode: brandingData.default_theme_mode || 'light',
          primary_brand_color: brandingData.primary_brand_color || '#1976d2',
          secondary_brand_color: brandingData.secondary_brand_color || '#9c27b0',
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
      
      // Exit edit mode after successful save
      handleSaveSuccess();
      
      // Refresh existing config data - use as type assertion to bypass strict type checking
      // since we know the structure matches what we need
      setExistingConfig({
        ...existingConfig,
        company_info: apiData.company_info as any,
        branding_config: apiData.branding_config as any,
        localization_config: apiData.localization_config as any
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
    <Container maxWidth="lg" sx={{ mt: 4 }}>
        {/* We'll put the tab buttons together with the action buttons */}
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>Loading tenant configuration...</Typography>
          </Box>
        ) : (
          <>
           
            {/* Tabs with action button */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: 1, 
              borderColor: 'divider', 
              mb: 4 
            }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => handleTabChange(newValue)}
                sx={{ mb: 1 }}
              >
                <Tab value="general" label="General Settings" />
                <Tab 
                  value="branding" 
                  label="Branding & Visuals" 
                  disabled={!isGeneralComplete} 
                />
                <Tab 
                  value="security" 
                  label="Security & Authentication" 
                  disabled={!isGeneralComplete} 
                />
              </Tabs>
              
              {!isLoading && (
                <Box sx={{ mb: 1 }}>
                  {existingConfig && !isEditMode ? (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={handleToggleEditMode}
                      startIcon={<EditIcon />}
                    >
                      Edit Settings
                    </Button>
                  ) : isEditMode && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSave}
                      disabled={isSaving}
                      startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </Box>
              )}
            </Box>

            {/* Tab Content */}
            <Box sx={{ mt: 3, mb: 3 }}>
              {activeTab === 'general' && (
                <GeneralSettings 
                  ref={generalFormRef}
                  onSave={handleGeneralSubmit}
                  defaultValues={generalFormData || undefined}
                  readOnly={!isEditMode}
                />
              )}
              {activeTab === 'branding' && (
                <BrandingVisuals 
                  ref={brandingFormRef}
                  onSave={handleBrandingSubmit}
                  defaultValues={brandingFormData || undefined}
                  readOnly={!isEditMode}
                />
              )}
              {activeTab === 'security' && (
                <SecurityAuthentication
                  onSave={() => {
                    setSnackbar({
                      open: true,
                      message: 'Security settings saved successfully!',
                      severity: 'success'
                    });
                    // Exit edit mode after successful save
                    handleSaveSuccess();
                  }}
                />
              )}
            </Box>

            <Divider sx={{ my: 3 }} />
          </>
        )}

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsPage;