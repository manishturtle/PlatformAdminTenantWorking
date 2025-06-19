'use client';

import { useState } from 'react';
import { Box, Typography, Container, Button, Paper, TextField, FormControl, InputLabel, Select, MenuItem, FormControlLabel, Radio, RadioGroup, Divider } from '@mui/material';
import Grid from '@mui/material/Grid'; // Import Grid v2
import { Settings as SettingsIcon, Notifications as NotificationsIcon, HelpOutline as HelpOutlineIcon, Save as SaveIcon } from '@mui/icons-material';
import CircularProgress from '@mui/material/CircularProgress';

import GeneralSettings from '@/components/settings/GeneralSettings';
import BrandingVisuals from '@/components/settings/BrandingVisuals';
import SecurityAuthentication from '@/components/settings/SecurityAuthentication';
// Types
type TimeFormat = '12h' | '24h';
type FirstDayOfWeek = 'sunday' | 'monday';

const SettingsPage = () => {
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<FirstDayOfWeek>('sunday');
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const handleTimeFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTimeFormat(event.target.value as TimeFormat);
  };

  const handleFirstDayOfWeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFirstDayOfWeek(event.target.value as FirstDayOfWeek);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Add save logic here if needed
      setSnackbar({
        open: true,
        message: 'Settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save settings',
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
      
        {/* Header with Tabs and Save Button */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider', mb: 4, pb: 1 }}>
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
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSave}
            disabled={isSaving}
            startIcon={isSaving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </Box>

        {activeTab === 'general' && (
          <GeneralSettings onSave={handleSave} />
        )}

        {activeTab === 'branding' && (
          <BrandingVisuals onSave={() => {}} />
        )}
        
        {activeTab === 'security' && (
          <SecurityAuthentication onSave={() => {}} />
        )}
       
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