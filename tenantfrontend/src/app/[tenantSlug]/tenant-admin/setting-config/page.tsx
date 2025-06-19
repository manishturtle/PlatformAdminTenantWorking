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
  CircularProgress,
  Tabs,
  Tab,
  AppBar,
  Toolbar
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

import GeneralSettings, { FormData as GeneralFormData } from '@/components/settings/GeneralSettings';
import BrandingVisuals, { BrandingFormData } from '@/components/settings/BrandingVisuals';
import SecurityAuthentication from '@/components/settings/SecurityAuthentication';
import { saveTenantConfig, mapToApiFormat } from '@/services/tenantConfigService';

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
  const [isDirty, setIsDirty] = useState(false);
  const [snackbar, setSnackbar] = useState<SnackbarState>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // Form data states
  const [generalData, setGeneralData] = useState<Partial<GeneralFormData>>({});
  const [brandingData, setBrandingData] = useState<Partial<BrandingFormData>>({});
  
  // Handle form data changes
  const handleGeneralChange = useCallback((data: Partial<GeneralFormData>) => {
    setGeneralData(prev => ({
      ...prev,
      ...data
    }));
  }, []);
  
  const handleBrandingChange = useCallback((data: Partial<BrandingFormData>) => {
    setBrandingData(prev => ({
      ...prev,
      ...data
    }));
  }, []);
  
  // Handle dirty state change from forms
  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  const handleTabChange = (_: React.SyntheticEvent, newValue: TabType) => {
    setActiveTab(newValue);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Map form data to API format
      const apiData = mapToApiFormat({
        ...generalData,
        ...brandingData
      });
      
      console.log('Saving data to API:', apiData);
      
      // Save to API
      await saveTenantConfig(apiData);
      
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
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Settings
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            sx={{ minWidth: 150 }}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Toolbar>
        
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="General" value="general" />
          <Tab label="Branding" value="branding" />
          <Tab label="Security" value="security" />
        </Tabs>
      </AppBar>
      
      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {activeTab === 'general' && (
          <GeneralSettings 
            onSave={handleSave}
            isSaving={isSaving}
            onDirtyChange={handleDirtyChange}
          />
        )}
        {activeTab === 'branding' && (
          <BrandingVisuals 
            onChange={handleBrandingChange} 
            initialData={brandingData} 
          />
        )}
        {activeTab === 'security' && <SecurityAuthentication />}
      </Box>
      
      {/* Snackbar for notifications */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
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