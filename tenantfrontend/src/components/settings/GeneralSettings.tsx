'use client';

import { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Radio, 
  RadioGroup,
  Paper,
  Button,
  Grid,
  SelectChangeEvent,
} from '@mui/material';

type TimeFormat = '12h' | '24h';
type FirstDayOfWeek = 'sunday' | 'monday';

interface GeneralSettingsProps {
  onSave: (data: FormData) => void;
}

interface FormData {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  taxId: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: TimeFormat;
  currency: string;
  firstDayOfWeek: FirstDayOfWeek;
}

const GeneralSettings = ({ onSave }: GeneralSettingsProps) => {

   const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
    const [firstDayOfWeek, setFirstDayOfWeek] = useState<FirstDayOfWeek>('sunday');
    const [activeTab, setActiveTab] = useState('general');
  
  
  const [formData, setFormData] = useState<FormData>({
    companyName: 'Acme Inc',
    contactEmail: 'contact@acme.com',
    contactPhone: '+1 (555) 123-4567',
    country: 'US',
    addressLine1: '123 Main St',
    addressLine2: 'Suite 100',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    taxId: '12-3456789',
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    currency: 'USD',
    firstDayOfWeek: 'sunday',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (e: SelectChangeEvent<string>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleTimeFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      timeFormat: event.target.value as TimeFormat
    }));
  };

  const handleFirstDayOfWeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      firstDayOfWeek: event.target.value as FirstDayOfWeek
    }));
  };

  return (
    <Box>
    {/* Company Details Section */}
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h6" fontWeight="medium" gutterBottom>Basic Company Details</Typography>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={6}>
          <TextField
            fullWidth
            label="Company Name"
            variant="outlined"
            size="small"
            margin="normal"
          />
        </Grid>
        <Grid size={6}>
          <TextField
            fullWidth
            label="Primary Contact Email"
            variant="outlined"
            size="small"
            margin="normal"
            value="contact@company.com"
            disabled
            sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.disabled' } }}
          />
        </Grid>
        
        {/* Add more form fields here */}
        <Grid size={6}>
          <TextField
            fullWidth
            label="Primary Contact Phone"
            variant="outlined"
            size="small"
            margin="normal"
            value="+1 (555) 123-4567"
            disabled
            sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.disabled' } }}
          />
        </Grid>
        
        <Grid size={6}>
          <FormControl fullWidth size="small" margin="normal">
            <InputLabel id="country-label">Country</InputLabel>
            <Select
              
              labelId="country-label"
              label="Country"
              value=""
            >
              <MenuItem value="">Select a country</MenuItem>
              {/* Add more countries as needed */}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      <Typography variant="subtitle2" sx={{ mt: 3, mb: 2, fontWeight: 'medium' }}>Address</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address Line 1"
            variant="outlined"
            size="small"
            margin="normal"
            placeholder="Street address"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address Line 2 (Optional)"
            variant="outlined"
            size="small"
            margin="normal"
            placeholder="Suite, floor, etc."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="City"
            variant="outlined"
            size="small"
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="State/Province"
            variant="outlined"
            size="small"
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="ZIP/Postal Code"
            variant="outlined"
            size="small"
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tax ID/VAT Number"
            variant="outlined"
            size="small"
            margin="normal"
          />
        </Grid>
      </Grid>
    </Paper>

    {/* Regional & Display Preferences Section */}
    <Paper elevation={0} sx={{ p: 4, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ mb: 3 }}>Regional & Display Preferences</Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Column 1 - Row 1 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Default Language</Typography>
          <FormControl fullWidth variant="outlined" size="small">
            <Select
              value="english"
              displayEmpty
              sx={{ 
                '.MuiOutlinedInput-input': { py: 1.5 },
                '.MuiSelect-icon': { color: 'text.secondary' }
              }}
            >
              <MenuItem value="english">English</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Column 2 - Row 1 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Time Zone</Typography>
          <FormControl fullWidth variant="outlined" size="small">
            <Select
              value="utc"
              displayEmpty
              sx={{ 
                '.MuiOutlinedInput-input': { py: 1.5 },
                '.MuiSelect-icon': { color: 'text.secondary' }
              }}
            >
              <MenuItem value="utc">UTC (Coordinated Universal Time)</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Column 1 - Row 2 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Date Format</Typography>
          <FormControl fullWidth variant="outlined" size="small">
            <Select
              value="mm/dd/yyyy"
              displayEmpty
              sx={{ 
                '.MuiOutlinedInput-input': { py: 1.5 },
                '.MuiSelect-icon': { color: 'text.secondary' }
              }}
            >
              <MenuItem value="mm/dd/yyyy">MM/DD/YYYY</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Column 2 - Row 2 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Time Format</Typography>
          <RadioGroup
            row
            value={timeFormat}
            onChange={handleTimeFormatChange}
          >
            <FormControlLabel 
              value="12h" 
              control={<Radio size="small" />} 
              label="12-hour (AM/PM)" 
              sx={{ mr: 4 }}
            />
            <FormControlLabel 
              value="24h" 
              control={<Radio size="small" />} 
              label="24-hour" 
            />
          </RadioGroup>
        </Box>
        
        {/* Column 1 - Row 3 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Default Currency</Typography>
          <FormControl fullWidth variant="outlined" size="small">
            <Select
              value="usd"
              displayEmpty
              sx={{ 
                '.MuiOutlinedInput-input': { py: 1.5 },
                '.MuiSelect-icon': { color: 'text.secondary' }
              }}
            >
              <MenuItem value="usd">USD ($)</MenuItem>
            </Select>
          </FormControl>
        </Box>
        
        {/* Column 2 - Row 3 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>First Day of Week</Typography>
          <RadioGroup
            row
            value={firstDayOfWeek}
            onChange={handleFirstDayOfWeekChange}
          >
            <FormControlLabel 
              value="sunday" 
              control={<Radio size="small" />} 
              label="Sunday" 
              sx={{ mr: 4 }}
            />
            <FormControlLabel 
              value="monday" 
              control={<Radio size="small" />} 
              label="Monday" 
            />
          </RadioGroup>
        </Box>
      </Box>
    </Paper>
    
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
      <Button 
        variant="contained" 
        color="primary"
        sx={{ textTransform: 'none', px: 4, py: 1 }}
      >
        Save Changes
      </Button>
    </Box>
  </Box>
  );
};

export default GeneralSettings;
