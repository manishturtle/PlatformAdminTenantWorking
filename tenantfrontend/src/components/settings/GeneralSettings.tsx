'use client';

import { useState, useEffect } from 'react';
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
  Autocomplete,
  CircularProgress,
  styled,
} from '@mui/material';

// Custom scrollbar styles
const CustomScrollbar = styled('div')({
  '&::-webkit-scrollbar': {
    width: '6px',
    height: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '10px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#888',
    borderRadius: '10px',
    '&:hover': {
      background: '#555',
    },
  },
});

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
  const [countries, setCountries] = useState<Array<{id: string, name: string}>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const languages = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' }
  ];

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('https://becockpit.turtleit.in/api/location/v1/countries/');
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }
        const data = await response.json();
        setCountries(data);
      } catch (err) {
        console.error('Error fetching countries:', err);
        setError('Failed to load countries. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (open && countries.length === 0) {
      fetchCountries();
    }
  }, [open]);

  // Filter countries based on search query
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  
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
    <Paper elevation={0} sx={{ p: 2, mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
      <Typography variant="h6" fontWeight="medium" sx={{ mb: 1 }}>Basic Company Details</Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Company Name"
            variant="outlined"
            size="small"
            margin="dense"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Primary Contact Email"
            variant="outlined"
            size="small"
            margin="dense"
            value="contact@company.com"
            disabled
            sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.disabled' } }}
          />
        </Grid>
        
        {/* Add more form fields here */}
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Primary Contact Phone"
            variant="outlined"
            size="small"
            margin="dense"
            value="+1 (555) 123-4567"
            disabled
            sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: 'text.disabled' } }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small" margin="dense" sx={{ minWidth: 300 }}>
            <Autocomplete
              open={open}
              onOpen={() => setOpen(true)}
              onClose={() => setOpen(false)}
              options={filteredCountries}
              getOptionLabel={(option) => option.name}
              value={countries.find(country => country.id === formData.country) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  country: newValue?.id || ''
                }));
              }}
              inputValue={searchQuery}
              onInputChange={(_, newInputValue) => setSearchQuery(newInputValue)}
              loading={isLoading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Country"
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
              ListboxComponent={CustomScrollbar}
              ListboxProps={{
                style: {
                  maxHeight: 200,
                  paddingRight: '8px',
                },
              }}
              PaperComponent={({ children }) => (
                <Paper 
                  sx={{ 
                    width: 'auto',
                    minWidth: '300px',
                    boxShadow: 3,
                    mt: 0.5,
                    '& .MuiAutocomplete-listbox': {
                      p: 0,
                    },
                    '& .MuiAutocomplete-option': {
                      minHeight: '40px',
                      '&[data-focus="true"]': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                      '&[aria-selected="true"]': {
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(25, 118, 210, 0.12)',
                        },
                      },
                    },
                  }}
                >
                  {children}
                </Paper>
              )}
              sx={{
                '& .MuiAutocomplete-popper': {
                  minWidth: '300px',
                },
                '& .MuiAutocomplete-inputRoot': {
                  paddingRight: '8px !important',
                },
              }}
              noOptionsText={searchQuery ? 'No countries found' : 'Start typing to search'}
            />
            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {error}
              </Typography>
            )}
          </FormControl>
        </Grid>
      </Grid>
      
      <Typography variant="subtitle2" sx={{ mt: 2, fontWeight: 'medium' }}>Address</Typography>
      
      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address Line 1"
            variant="outlined"
            size="small"
            margin="dense"
            placeholder="Street address"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address Line 2 (Optional)"
            variant="outlined"
            size="small"
            margin="dense"
            placeholder="Suite, floor, etc."
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="City"
            variant="outlined"
            size="small"
            margin="dense"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="State/Province"
            variant="outlined"
            size="small"
            margin="dense"
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            label="ZIP/Postal Code"
            variant="outlined"
            size="small"
            margin="dense"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Tax ID/VAT Number"
            variant="outlined"
            size="small"
            margin="dense"
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
              value={formData.language}
              onChange={handleSelectChange}
              name="language"
              displayEmpty
              sx={{ 
                '.MuiOutlinedInput-input': { py: 1.5 },
                '.MuiSelect-icon': { color: 'text.secondary' }
              }}
            >
              <MenuItem value="" disabled>Select a language</MenuItem>
              {languages.map((lang) => (
                <MenuItem key={lang.code} value={lang.code}>
                  {lang.name}
                </MenuItem>
              ))}
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
