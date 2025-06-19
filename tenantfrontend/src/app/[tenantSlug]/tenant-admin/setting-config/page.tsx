'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Box, 
  Typography, 
  Container, 
  Button, 
  Paper, 
  Snackbar, 
  Alert,
  CircularProgress
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

import GeneralSettings, { FormData as GeneralFormData } from '@/components/settings/GeneralSettings';
import BrandingVisuals, { BrandingFormData } from '@/components/settings/BrandingVisuals';
import SecurityAuthentication from '@/components/settings/SecurityAuthentication';
import { saveTenantConfig } from '@/services/tenantApi';
type TabType = 'general' | 'branding' | 'security';

interface SnackbarState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'info' | 'warning';
}

const SettingsPage = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // Form data states
  const [generalData, setGeneralData] = useState<Partial<GeneralFormData>>({});
  const [brandingData, setBrandingData] = useState<Partial<BrandingFormData>>({});

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const handleGeneralChange = useCallback((data: Partial<GeneralFormData>) => {
    setGeneralData(prev => ({ ...prev, ...data }));
  }, []);

  const handleBrandingChange = useCallback((data: Partial<BrandingFormData>) => {
    setBrandingData(prev => ({ ...prev, ...data }));
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Combine form data
      const dataToSave = {
        company_info: { ...generalData },
        branding_config: { ...brandingData },
        // Add localization config from general data if needed
        ...(generalData.language || generalData.timezone ? {
          localization_config: {
            ...(generalData.language && { default_language: generalData.language }),
            ...(generalData.timezone && { default_time_zone: generalData.timezone }),
            // Add other localization fields as needed
          }
        } : {})
      };

      await saveTenantConfig(dataToSave);
      
      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success'
      });
      
      // Refresh the page to reflect changes
      router.refresh();
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to save settings',
        severity: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Main Content */}
      <Box component="main" sx={{ p: 3 }}>
      
       <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {tabs.map((tab) => (
              <Button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                sx={{
                  color: activeTab === tab.id ? 'primary.main' : 'text.secondary',
                  borderBottom: activeTab === tab.id ? '2px solid' : 'none',
                  borderColor: 'primary.main',
                  borderRadius: 0,
                  pb: 1.5,
                  px: 1,
                  minWidth: 'auto',
                  textTransform: 'none',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: 'primary.main',
                  },
                }}
              >
                {tab.label}
              </Button>
            ))}
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={isSaving}
            sx={{ textTransform: 'none', fontWeight: 500 }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {activeTab === 'general' && (
        <GeneralSettings onSave={handleGeneralChange} />
      )}

      {activeTab === 'branding' && (
        <BrandingVisuals onSave={handleBrandingChange} />
      )}
        
      {activeTab === 'security' && (
        <SecurityAuthentication onSave={() => {}} />
      )}
       
      </Box>
    </Box>
  );
};

// Tabs
const tabs: { id: TabType; label: string }[] = [
  { id: 'general', label: 'General Settings' },
  { id: 'branding', label: 'Branding & Visuals' },
  { id: 'security', label: 'Security & Authentication' },
];  

export default SettingsPage;