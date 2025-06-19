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
  countryCode: string; // Added to store country code for API calls
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
  // Form data state
  const [formData, setFormData] = useState<FormData>({
    companyName: 'Acme Inc',
    contactEmail: 'contact@acme.com',
    contactPhone: '+1 (555) 123-4567',
    country: '',
    countryCode: '',
    addressLine1: '123 Main St',
    addressLine2: 'Suite 100',
    city: '',
    state: '',
    postalCode: '10001',
    taxId: '12-3456789',
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',  // Updated to match dateFormats array value
    timeFormat: '12h',
    currency: 'usd',  // Updated to lowercase to match currency code in the dropdown
    firstDayOfWeek: 'sunday',
  });

  // UI state
  const [timeFormat, setTimeFormat] = useState<TimeFormat>('12h');
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<FirstDayOfWeek>('sunday');
  const [activeTab, setActiveTab] = useState('general');
  
  // Location data state
  // Define types for consistent use across the component
  type CountryType = {id: string; name: string; code: string};
  type StateType = {id: string; name: string};
  type CityType = {id: string; name: string};
  type TimezoneType = {code: string; name: string};
  type LanguageType = {code: string; name: string};
  type DateFormatType = {value: string; label: string};
  type CurrencyType = {code: string; symbol: string; name: string};
  
  const [countries, setCountries] = useState<CountryType[]>([]);
  const [states, setStates] = useState<Array<{id: string, name: string}>>([]);
  const [cities, setCities] = useState<Array<{id: string, name: string}>>([]);
  
  
  // UI state for dropdowns
  const [searchQueries, setSearchQueries] = useState({
    country: '',
    state: '',
    city: '',
    timezone: '',
    language: '',
    dateFormat: '',
    currency: ''
  });
  
  
  const [open, setOpen] = useState({
    country: false,
    state: false,
    city: false,
    language: false,
    dateFormat: false,
    currency: false,
    timezone: false
  });
  
  const handleSearchQueryChange = (field: 'country' | 'state' | 'city' | 'timezone', value: string) => {
    setSearchQueries(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState({
    country: false,
    state: false,
    city: false
  });
  
  const [error, setError] = useState<{
    country: string | null;
    state: string | null;
    city: string | null;
  }>({
    country: null,
    state: null,
    city: null
  });

  // Date format options
  const dateFormats = [
    { label: 'YYYY-MM-DD', value: 'yyyy-MM-dd' },
    { label: 'DD-MM-YYYY', value: 'dd-MM-yyyy' },
    { label: 'MM-DD-YYYY', value: 'MM-dd-yyyy' },
    { label: 'DD/MM/YYYY', value: 'dd/MM/yyyy' },
    { label: 'MM/DD/YYYY', value: 'MM/dd/yyyy' },
    { label: 'YYYY/MM/DD', value: 'yyyy/MM/dd' },
    { label: 'Do MMM YYYY', value: 'do MMM yyyy' },         // 18th Jun 2025
    { label: 'MMMM Do, YYYY', value: 'MMMM do, yyyy' },     // June 18th, 2025
    { label: 'ddd, MMM D YYYY', value: 'EEE, MMM d yyyy' }, // Wed, Jun 18 2025
    { label: 'Full ISO', value: "yyyy-MM-dd'T'HH:mm:ssxxx" } // 2025-06-18T14:23:00+05:30
  ];
  
  // Language options
  const languages: LanguageType[] = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'hi', name: 'Hindi' },
    { code: 'ar', name: 'Arabic' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ru', name: 'Russian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' }
  ];
  
  // Currency options
  const currencies: CurrencyType[] = [
    { code: 'usd', symbol: '$', name: 'US Dollar (USD)' },
    // { code: 'eur', symbol: '€', name: 'Euro (EUR)' },
    // { code: 'gbp', symbol: '£', name: 'British Pound (GBP)' },
    // { code: 'jpy', symbol: '¥', name: 'Japanese Yen (JPY)' },
    { code: 'inr', symbol: '₹', name: 'Indian Rupee (INR)' },
    // { code: 'cny', symbol: '¥', name: 'Chinese Yuan (CNY)' },
    // { code: 'cad', symbol: '$', name: 'Canadian Dollar (CAD)' },
    // { code: 'aud', symbol: '$', name: 'Australian Dollar (AUD)' },
    // { code: 'chf', symbol: 'Fr', name: 'Swiss Franc (CHF)' },
    // { code: 'aed', symbol: 'د.إ', name: 'UAE Dirham (AED)' }
  ];

  const timezones = [
    { code: 'Pacific/Midway', name: '(UTC-11:00) Midway Island, Samoa' },
    { code: 'Pacific/Honolulu', name: '(UTC-10:00) Hawaii' },
    { code: 'America/Anchorage', name: '(UTC-09:00) Alaska' },
    { code: 'America/Los_Angeles', name: '(UTC-08:00) Pacific Time (US & Canada)' },
    { code: 'America/Denver', name: '(UTC-07:00) Mountain Time (US & Canada)' },
    { code: 'America/Chicago', name: '(UTC-06:00) Central Time (US & Canada)' },
    { code: 'America/New_York', name: '(UTC-05:00) Eastern Time (US & Canada)' },
    { code: 'America/Halifax', name: '(UTC-04:00) Atlantic Time (Canada)' },
    { code: 'America/Argentina/Buenos_Aires', name: '(UTC-03:00) Buenos Aires' },
    { code: 'Atlantic/South_Georgia', name: '(UTC-02:00) Mid-Atlantic' },
    { code: 'Atlantic/Azores', name: '(UTC-01:00) Azores' },
    { code: 'UTC', name: '(UTC±00:00) Coordinated Universal Time' },
    { code: 'Europe/London', name: '(UTC+00:00) London, Edinburgh, Dublin' },
    { code: 'Europe/Paris', name: '(UTC+01:00) Paris, Amsterdam, Berlin' },
    { code: 'Europe/Athens', name: '(UTC+02:00) Athens, Istanbul, Helsinki' },
    { code: 'Asia/Kuwait', name: '(UTC+03:00) Kuwait, Riyadh, Moscow' },
    { code: 'Asia/Dubai', name: '(UTC+04:00) Dubai, Abu Dhabi' },
    { code: 'Asia/Karachi', name: '(UTC+05:00) Karachi, Islamabad' },
    { code: 'Asia/Kolkata', name: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
    { code: 'Asia/Dhaka', name: '(UTC+06:00) Dhaka, Astana' },
    { code: 'Asia/Bangkok', name: '(UTC+07:00) Bangkok, Jakarta' },
    { code: 'Asia/Shanghai', name: '(UTC+08:00) Beijing, Hong Kong, Singapore' },
    { code: 'Asia/Tokyo', name: '(UTC+09:00) Tokyo, Seoul' },
    { code: 'Australia/Sydney', name: '(UTC+10:00) Sydney, Brisbane' },
    { code: 'Pacific/Noumea', name: '(UTC+11:00) Solomon Is.' },
    { code: 'Pacific/Auckland', name: '(UTC+12:00) Auckland, Wellington' }
  ];  

  // Fetch countries from API
  useEffect(() => {
    const fetchCountries = async () => {
      if (countries.length > 0) return; // Don't fetch if we already have countries
      
      setIsLoading(prev => ({...prev, country: true}));
      setError(prev => ({...prev, country: null}));
      try {
        const response = await fetch('https://becockpit.turtleit.in/api/location/v1/countries/');
        if (!response.ok) {
          throw new Error('Failed to fetch countries');
        }
        const data = await response.json();
        setCountries(data);
      } catch (err) {
        console.error('Error fetching countries:', err);
        setError(prev => ({...prev, country: 'Failed to load countries. Please try again later.'}));
      } finally {
        setIsLoading(prev => ({...prev, country: false}));
      }
    };

    fetchCountries();
  }, []); // Empty dependency array to run only once on mount

  // Fetch states when country changes
  useEffect(() => {
    const fetchStates = async () => {
      if (!formData.country) return;
      
      setIsLoading(prev => ({...prev, state: true}));
      setError(prev => ({...prev, state: null}));
      setStates([]);
      setCities([]);
      
      try {
        const response = await fetch(`https://becockpit.turtleit.in/api/location/v1/states/?countryCode=${formData.countryCode}`);
        if (!response.ok) {
          throw new Error('Failed to fetch states');
        }
        const data = await response.json();
        setStates(data);
      } catch (err) {
        console.error('Error fetching states:', err);
        setError(prev => ({...prev, state: 'Failed to load states. Please try again later.'}));
      } finally {
        setIsLoading(prev => ({...prev, state: false}));
      }
    };

    if (formData.country) {
      fetchStates();
    }
  }, [formData.country]);

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      if (!formData.state) return;
      
      setIsLoading(prev => ({...prev, city: true}));
      setError(prev => ({...prev, city: null}));
      setCities([]);
      
      try {
        const response = await fetch(`https://becockpit.turtleit.in/api/location/v1/cities/?stateId=${formData.state}`);
        if (!response.ok) {
          throw new Error('Failed to fetch cities');
        }
        const data = await response.json();
        setCities(data);
      } catch (err) {
        console.error('Error fetching cities:', err);
        setError(prev => ({...prev, city: 'Failed to load cities. Please try again later.'}));
      } finally {
        setIsLoading(prev => ({...prev, city: false}));
      }
    };

    if (formData.state) {
      fetchCities();
    }
  }, [formData.state]);

  // Filter data based on search query
  const filterCountries = (items: CountryType[], query: string): CountryType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterStates = (items: StateType[], query: string): StateType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterCities = (items: CityType[], query: string): CityType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterTimezones = (items: TimezoneType[], query: string): TimezoneType[] =>
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterLanguages = (items: LanguageType[], query: string): LanguageType[] =>
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterDateFormats = (items: DateFormatType[], query: string): DateFormatType[] =>
    query ? items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterCurrencies = (items: CurrencyType[], query: string): CurrencyType[] =>
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) || 
                          item.code.toLowerCase().includes(query.toLowerCase())) : items;

  const filteredCountries = filterCountries(countries, searchQueries.country);
  const filteredStates = filterStates(states, searchQueries.state);
  const filteredCities = filterCities(cities, searchQueries.city);
  const filteredTimezones = filterTimezones(timezones, searchQueries.timezone);
  const filteredLanguages = filterLanguages(languages, searchQueries.language);
  const filteredDateFormats = filterDateFormats(dateFormats, searchQueries.dateFormat);
  const filteredCurrencies = filterCurrencies(currencies, searchQueries.currency);

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
    const newTimeFormat = event.target.value as TimeFormat;
    setTimeFormat(newTimeFormat);
    setFormData(prev => ({
      ...prev,
      timeFormat: newTimeFormat
    }));
  };

  const handleFirstDayOfWeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFirstDay = event.target.value as FirstDayOfWeek;
    setFirstDayOfWeek(newFirstDay);
    setFormData(prev => ({
      ...prev,
      firstDayOfWeek: newFirstDay
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
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="small" margin="dense" sx={{ minWidth: 300 }}>
            <Autocomplete
              open={open.country}
              onOpen={() => setOpen(prev => ({ ...prev, country: true }))}
              onClose={() => setOpen(prev => ({ ...prev, country: false }))}
              options={filteredCountries}
              getOptionLabel={(option) => option.name}
              value={countries.find(country => country.id === formData.country) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  country: newValue?.id || '',
                  countryCode: newValue?.code || '',
                  state: '', // Reset state when country changes
                  city: '' // Reset city when country changes
                }));
              }}
              inputValue={searchQueries.country}
              onInputChange={(_, newInputValue) => handleSearchQueryChange('country', newInputValue)}
              loading={isLoading.country}
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
                        {isLoading.country ? <CircularProgress color="inherit" size={20} /> : null}
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
              noOptionsText={searchQueries.country ? 'No countries found' : 'Start typing to search'}
            />
            {error.country && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {String(error.country)}
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
          <FormControl fullWidth size="small" margin="dense" sx={{ minWidth: 260 }}>
            <Autocomplete
              open={open.state}
              onOpen={() => setOpen(prev => ({ ...prev, state: true }))}
              onClose={() => setOpen(prev => ({ ...prev, state: false }))}
              options={filteredStates}
              getOptionLabel={(option) => option.name}
              value={states.find(state => state.id === formData.state) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  state: newValue?.id || '',
                  city: '' // Reset city when state changes
                }));
              }}
              inputValue={searchQueries.state}
              onInputChange={(_, newInputValue) => handleSearchQueryChange('state', newInputValue)}
              loading={isLoading.state}
              disabled={!formData.country}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="State/Province"
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoading.state ? <CircularProgress color="inherit" size={20} /> : null}
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
              noOptionsText={searchQueries.state ? 'No states found' : 'Start typing to search'}
            />
            {error.state && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {String(error.state)}
              </Typography>
            )}
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small" margin="dense" sx={{ minWidth: 250 }}>
            <Autocomplete
              open={open.city}
              onOpen={() => setOpen(prev => ({ ...prev, city: true }))}
              onClose={() => setOpen(prev => ({ ...prev, city: false }))}
              options={filteredCities}
              getOptionLabel={(option) => option.name}
              value={cities.find(city => city.id === formData.city) || null}
              onChange={(_, newValue) => {
                setFormData(prev => ({
                  ...prev,
                  city: newValue?.id || ''
                }));
              }}
              inputValue={searchQueries.city}
              onInputChange={(_, newInputValue) => handleSearchQueryChange('city', newInputValue)}
              loading={isLoading.city}
              disabled={!formData.state}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="City"
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {isLoading.city ? <CircularProgress color="inherit" size={20} /> : null}
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
              noOptionsText={searchQueries.city ? 'No cities found' : 'Start typing to search'}
            />
            {error.city && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {String(error.city)}
              </Typography>
            )}
          </FormControl>
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
          <Autocomplete
            open={open.language}
            onOpen={() => setOpen(prev => ({ ...prev, language: true }))}
            onClose={() => setOpen(prev => ({ ...prev, language: false }))}
            options={filteredLanguages}
            getOptionLabel={(option) => option.name}
            value={languages.find(lang => lang.code === formData.language) || null}
            onChange={(_, newValue) => {
              setFormData(prev => ({
                ...prev,
                language: newValue?.code || ''
              }));
            }}
            inputValue={searchQueries.language}
            onInputChange={(_, newInputValue) => handleSearchQueryChange('language', newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select language"
                InputProps={{
                  ...params.InputProps,
                }}
              />
            )}
            renderOption={(props, option) => (
              <MenuItem
                {...props}
                component="li"
                key={option.code}
              >
                {option.name}
              </MenuItem>
            )}
            noOptionsText={!searchQueries.language ? 'Type to search for languages' : 'No languages found'}
            ListboxProps={{
              style: {
                maxHeight: '220px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#bdbdbd #f5f5f5',
              }
            }}
          />
        </Box>
        
        {/* Column 2 - Row 1 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Time Zone</Typography>
          <Autocomplete
            open={open.timezone}
            onOpen={() => setOpen(prev => ({ ...prev, timezone: true }))}
            onClose={() => setOpen(prev => ({ ...prev, timezone: false }))}
            options={filteredTimezones}
            getOptionLabel={(option) => option.name}
            value={timezones.find(tz => tz.code === formData.timezone) || null}
            onChange={(_, newValue) => {
              setFormData(prev => ({
                ...prev,
                timezone: newValue?.code || ''
              }));
            }}
            inputValue={searchQueries.timezone}
            onInputChange={(_, newInputValue) => handleSearchQueryChange('timezone', newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select timezone"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            renderOption={(props, option) => (
              <MenuItem
                {...props}
                component="li"
                key={option.code}
              >
                {option.name}
              </MenuItem>
            )}
            noOptionsText={!searchQueries.timezone ? 'Type to search for timezones' : 'No timezones found'}
            ListboxProps={{
              style: {
                maxHeight: '220px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#bdbdbd #f5f5f5',
              }
            }}
          />
        </Box>
        
        {/* Column 1 - Row 2 */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Date Format</Typography>
          <Autocomplete
            open={open.dateFormat}
            onOpen={() => setOpen(prev => ({ ...prev, dateFormat: true }))}
            onClose={() => setOpen(prev => ({ ...prev, dateFormat: false }))}
            options={filteredDateFormats}
            getOptionLabel={(option) => option.label}
            value={dateFormats.find(format => format.value === formData.dateFormat) || null}
            onChange={(_, newValue) => {
              setFormData(prev => ({
                ...prev,
                dateFormat: newValue?.value || ''
              }));
            }}
            inputValue={searchQueries.dateFormat}
            onInputChange={(_, newInputValue) => handleSearchQueryChange('dateFormat', newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select date format"
                InputProps={{
                  ...params.InputProps,
                }}
              />
            )}
            renderOption={(props, option) => (
              <MenuItem
                {...props}
                component="li"
                key={option.value}
              >
                {option.label}
              </MenuItem>
            )}
            noOptionsText={!searchQueries.dateFormat ? 'Type to search for date formats' : 'No date formats found'}
            ListboxProps={{
              style: {
                maxHeight: '220px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#bdbdbd #f5f5f5',
              }
            }}
          />
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
          <Autocomplete
            open={open.currency}
            onOpen={() => setOpen(prev => ({ ...prev, currency: true }))}
            onClose={() => setOpen(prev => ({ ...prev, currency: false }))}
            options={filteredCurrencies}
            getOptionLabel={(option) => option.name}
            value={currencies.find(curr => curr.code === formData.currency) || null}
            onChange={(_, newValue) => {
              setFormData(prev => ({
                ...prev,
                currency: newValue?.code || ''
              }));
            }}
            inputValue={searchQueries.currency}
            onInputChange={(_, newInputValue) => handleSearchQueryChange('currency', newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="Select currency"
                InputProps={{
                  ...params.InputProps,
                }}
              />
            )}
            renderOption={(props, option) => (
              <MenuItem
                {...props}
                component="li"
                key={option.code}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography component="span" sx={{ mr: 1 }}>{option.symbol}</Typography>
                  {option.name}
                </Box>
              </MenuItem>
            )}
            noOptionsText={!searchQueries.currency ? 'Type to search for currencies' : 'No currencies found'}
            ListboxProps={{
              style: {
                maxHeight: '220px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#bdbdbd #f5f5f5',
              }
            }}
          />
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
