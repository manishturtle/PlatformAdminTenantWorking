'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { 
  Box, 
  Typography, 
  TextField, 
  FormControl, 
  FormLabel,
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
  Snackbar,
  Alert,
} from '@mui/material';
import { getTenantConfig, saveTenantConfig, mapToApiFormat, mapFromApiFormat } from '@/services/tenantConfigService';

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
  onSave: (data: FormData) => Promise<void>;
  isSaving?: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
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

const GeneralSettings = ({ onSave, isSaving = false, onDirtyChange }: GeneralSettingsProps) => {
  // Date format options

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
    
 

  const { control, handleSubmit, reset, setValue, watch, formState: { isDirty } } = useForm<FormData>({
    defaultValues: {
      companyName: '',
      contactEmail: '',
      contactPhone: '',
      country: '',
      countryCode: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      taxId: '',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: dateFormats[0].value, // Set initial value from array
      timeFormat: '12h',
      currency: 'usd',
      firstDayOfWeek: 'sunday',
    },
  });

  // Watch form values and dirty state
  const watchedValues = watch();
  
  // Debug: Log form values when they change
  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      console.log('Form value changed:', { name, type, value });
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  
  // Notify parent when dirty state changes
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);
  
  // Location data state
  // Define types for consistent use across the component
  type CountryType = {id: string; name: string; code: string};  
  type StateType = {id: string; name: string};
  type CityType = {id: string; name: string};
  type TimezoneType = {code: string; name: string};
  type LanguageType = {code: string; name: string; nativeName: string};
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
  
  const handleSearchQueryChange = (field: 'country' | 'state' | 'city' | 'timezone' | 'language' | 'dateFormat' | 'currency', value: string) => {
    setSearchQueries(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Loading states
  const [isLoading, setIsLoading] = useState({
    initial: true,    // For initial page load
    country: false,   // For country loading
    state: false,     // For state loading
    city: false,      // For city loading
    form: false       // For form submission
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


  // Language options
 
  
  
  const languages: LanguageType[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' }
  ];
  
  // Timezone options
  const timezones = Intl.supportedValuesOf('timeZone');
  
  // Currency options
  const currencies: CurrencyType[] = [
    { code: 'USD', symbol: '$', name: 'US Dollar (USD)' },
    { code: 'EUR', symbol: '€', name: 'Euro (EUR)' },
    { code: 'GBP', symbol: '£', name: 'British Pound (GBP)' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (AUD)' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (CAD)' },
    { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc (CHF)' },
    { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (CNY)' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)' },
    { code: 'BRL', symbol: 'R$', name: 'Brazilian Real (BRL)' },
  ];
  
  // Timezone options
  const timezoneOptions = Intl.supportedValuesOf('timeZone').map(tz => ({
    code: tz,
    name: tz.replace(/_/g, ' ')
  }));

  // Fetch tenant config and countries on component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch tenant config
        const config = await getTenantConfig();
        const formData = mapFromApiFormat(config);
        
        console.log('Fetched tenant config:', config);
        console.log('Mapped form data:', formData);
        
        // Reset form with API data
        reset({
          ...formData,
          // Ensure all required fields have default values
          companyName: formData.companyName || '',
          contactEmail: formData.contactEmail || '',
          contactPhone: formData.contactPhone || '',
          taxId: formData.taxId || '',
          addressLine1: formData.addressLine1 || '',
          addressLine2: formData.addressLine2 || '',
          city: formData.city || '',
          state: formData.state || '',
          postalCode: formData.postalCode || '',
          country: formData.country || '',
          language: formData.language || 'en',
          timezone: formData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          dateFormat: formData.dateFormat || 'yyyy-MM-dd',
          timeFormat: formData.timeFormat || '12h',
          currency: formData.currency || 'usd',
          firstDayOfWeek: formData.firstDayOfWeek || 'sunday',
        });
        
        // Fetch countries
        try {
          const response = await fetch('https://becockpit.turtleit.in/api/location/v1/countries/');
          if (response.ok) {
            const countriesData = await response.json();
            setCountries(countriesData);
          }
        } catch (error) {
          console.error('Error fetching countries:', error);
        }
        
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setSnackbar({
          open: true,
          message: 'Failed to load settings. Please try again later.',
          severity: 'error'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [reset]);

  // Fetch states when country changes
  useEffect(() => {
    const fetchStates = async () => {
      const countryCode = watchedValues.countryCode;
      if (!countryCode) {
        setStates([]);
        setCities([]);
        setValue('state', '');
        setValue('city', '');
        return;
      }
      
      setIsLoading(prev => ({...prev, state: true}));
      setError(prev => ({...prev, state: null}));
      setStates([]);
      setCities([]);
      
      try {
        const response = await fetch(`https://becockpit.turtleit.in/api/location/v1/states/?countryCode=${countryCode}`);
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

    fetchStates();
  }, [watchedValues.countryCode, setValue]);

  // Fetch cities when state changes
  useEffect(() => {
    const fetchCities = async () => {
      const stateId = watchedValues.state;
      if (!stateId) {
        setCities([]);
        setValue('city', '');
        return;
      }
      
      setIsLoading(prev => ({...prev, city: true}));
      setError(prev => ({...prev, city: null}));
      setCities([]);
      
      try {
        const response = await fetch(`https://becockpit.turtleit.in/api/location/v1/cities/?stateId=${stateId}`);
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

    fetchCities();
  }, [watchedValues.state, setValue]);

  // Filter data based on search query
  const filterCountries = (items: CountryType[], query: string): CountryType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterStates = (items: StateType[], query: string): StateType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterCities = (items: CityType[], query: string): CityType[] => 
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterTimezones = (items: TimezoneType[], query: string): TimezoneType[] =>
    query && items ? items.filter(item => 
      item?.name?.toLowerCase().includes(query.toLowerCase()) || 
      item?.code?.toLowerCase().includes(query.toLowerCase())
    ) : items || [];
    
  const filterLanguages = (items: LanguageType[], query: string): LanguageType[] =>
    query ? items.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) || 
      item.nativeName.toLowerCase().includes(query.toLowerCase())
    ) : items;
    
  const filterDateFormats = (items: DateFormatType[], query: string): DateFormatType[] =>
    query ? items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())) : items;
    
  const filterCurrencies = (items: CurrencyType[], query: string): CurrencyType[] =>
    query ? items.filter(item => item.name.toLowerCase().includes(query.toLowerCase()) || 
                          item.code.toLowerCase().includes(query.toLowerCase())) : items;
  
  const filteredCountries = filterCountries(countries, searchQueries.country);
  const filteredStates = filterStates(states, searchQueries.state);
  const filteredCities = filterCities(cities, searchQueries.city);
  const filteredTimezones = filterTimezones(timezoneOptions, searchQueries.timezone);
  const filteredLanguages = filterLanguages(languages, searchQueries.language);
  const filteredDateFormats = filterDateFormats(dateFormats, searchQueries.dateFormat);
  const filteredCurrencies = filterCurrencies(currencies, searchQueries.currency);

  const handleTimeFormatChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTimeFormat = event.target.value as TimeFormat;
    setValue('timeFormat', newTimeFormat);
  };

  const handleFirstDayOfWeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newFirstDay = event.target.value as FirstDayOfWeek;
    setValue('firstDayOfWeek', newFirstDay);
  };

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Submitting form data:', data);
      await onSave(data);
    } catch (error) {
      console.error('Error in form submission:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save settings. Please try again.',
        severity: 'error'
      });
      throw error;
    }
  };
  
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <form 
        id="settings-form-general"
        onSubmit={handleSubmit(onSubmit)} 
        style={{ width: '100%' }}
      >
    {/* Company Details Section */}
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Basic Company Details</Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, rowGap: 1, columnGap: 2 }}>
        <Box>
          <Controller
            name="companyName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Company Name"
                variant="outlined"
                size="small"
                margin="dense"
              />
            )}
          />
        </Box>
        <Box>
          <Controller
            name="contactEmail"
            control={control}
            rules={{
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address',
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <TextField
                {...field}
                fullWidth
                label="Primary Contact Email"
                variant="outlined"
                size="small"
                margin="dense"
                error={!!error}
                helperText={error?.message}
              />
            )}
          />
        </Box>
        
        <Box>
          <Controller
            name="contactPhone"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Primary Contact Phone"
                variant="outlined"
                size="small"
                margin="dense"
              />
            )}
          />
        </Box>

        <Box>
          <Controller
            name="taxId"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Tax ID/VAT Number"
                variant="outlined"
                size="small"
                margin="dense"
              />
            )}
          />
        </Box>
        
        <Box>
          <Controller
            name="country"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <FormControl fullWidth size="small" margin="dense" sx={{ minWidth: 300 }}>
                <Autocomplete
                  {...field}
                  open={open.country}
                  onOpen={() => setOpen(prev => ({ ...prev, country: true }))}
                  onClose={() => setOpen(prev => ({ ...prev, country: false }))}
                  options={filteredCountries}
                  getOptionLabel={(option) => option.name}
                  value={countries.find(country => country.id === value) || null}
                  onChange={(_, newValue) => {
                    onChange(newValue?.id || '');
                    setValue('countryCode', newValue?.code || '');
                    setValue('state', '');
                    setValue('city', '');
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
            )}
          />
        </Box>

        <Box>
          <Controller
            name="addressLine1"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Address Line 1"
                variant="outlined"
                size="small"
                margin="dense"
                placeholder="Street address"
              />
            )}
          />
        </Box>
        <Box>
          <Controller
            name="addressLine2"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Address Line 2 (Optional)"
                variant="outlined"
                size="small"
                margin="dense"
                placeholder="Suite, floor, etc."
              />
            )}
          />
        </Box>
        <Box>
          <Controller
            name="state"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <FormControl fullWidth size="small" margin="dense">
                <Autocomplete
                  {...field}
                  open={open.state}
                  onOpen={() => setOpen(prev => ({ ...prev, state: true }))}
                  onClose={() => setOpen(prev => ({ ...prev, state: false }))}
                  options={filteredStates}
                  getOptionLabel={(option) => option.name}
                  value={states.find(state => state.id === value) || null}
                  onChange={(_, newValue) => {
                    onChange(newValue?.id || '');
                    setValue('city', '');
                  }}
                  inputValue={searchQueries.state}
                  onInputChange={(_, newInputValue) => handleSearchQueryChange('state', newInputValue)}
                  loading={isLoading.state}
                  disabled={!watchedValues.country}
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
            )}
          />
        </Box>
          <Box>
            <Controller
              name="city"
              control={control}
              render={({ field: { onChange, value, ...field } }) => (
                <FormControl fullWidth size="small" margin="dense">
                  <Autocomplete
                    {...field}
                    open={open.city}
                    onOpen={() => setOpen(prev => ({ ...prev, city: true }))}
                    onClose={() => setOpen(prev => ({ ...prev, city: false }))}
                    options={filteredCities}
                    getOptionLabel={(option) => option.name}
                    value={cities.find(city => city.id === value) || null}
                    onChange={(_, newValue) => {
                      onChange(newValue?.id || '');
                    }}
                    inputValue={searchQueries.city}
                    onInputChange={(_, newInputValue) => handleSearchQueryChange('city', newInputValue)}
                    loading={isLoading.city}
                    disabled={!watchedValues.state}
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
              )}
            />
          </Box>
          <Box>
            <Controller
              name="postalCode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                  label="ZIP/Postal Code"
                  variant="outlined"
                  size="small"
                  margin="dense"
                />
              )}
            />
          </Box>
      
      </Box>
    </Paper>

    {/* Regional & Display Preferences Section */}
    <Paper elevation={0} sx={{ p: 3, mb: 3, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Regional & Display Preferences</Typography>
      
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, rowGap:1, columnGap:2 }}>
        {/* Column 1 - Row 1 */}
        <Box>
          <Autocomplete
            open={open.language}
            onOpen={() => setOpen(prev => ({ ...prev, language: true }))}
            onClose={() => setOpen(prev => ({ ...prev, language: false }))}
            options={filteredLanguages}
            getOptionLabel={(option) => option.name}
            onChange={(_: any, newValue: any) => {
              setValue('language', newValue?.code || '', { shouldDirty: true });
            }}
            inputValue={searchQueries.language}
            onInputChange={(_, newInputValue) => handleSearchQueryChange('language', newInputValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                label="Default Language"
                variant="outlined"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.code}>
                {option.name} ({option.nativeName})
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
            noOptionsText={!searchQueries.language ? 'Type to search for languages' : 'No languages found'}
          />
        </Box>
        
        {/* Column 2 - Row 1 */}
        <Box>
          <Controller
            name="timezone"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <Autocomplete
                {...field}
                options={timezoneOptions}
                getOptionLabel={(option) => option.name}
                value={timezoneOptions.find(opt => opt.code === value) || null}
                onChange={(_, newValue) => {
                  onChange(newValue?.code || '');
                }}
                inputValue={searchQueries.timezone}
                onInputChange={(_, newInputValue) => handleSearchQueryChange('timezone', newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Time Zone"
                    variant="outlined"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.code}>
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
                noOptionsText={!searchQueries.timezone ? 'Type to search for timezones' : 'No timezones found'}
              />
            )}
          />
        </Box>
        
        {/* Column 1 - Row 2 */}
        <Box>
          <Controller
            name="dateFormat"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <Autocomplete
                {...field}
                open={open.dateFormat}
                onOpen={() => setOpen(prev => ({ ...prev, dateFormat: true }))}
                onClose={() => setOpen(prev => ({ ...prev, dateFormat: false }))}
                options={dateFormats}
                getOptionLabel={(option) => option?.label || ''}
                value={value ? dateFormats.find(opt => opt.value === value) : dateFormats[0]}
                onChange={(_, newValue) => {
                  if (newValue) {
                    onChange(newValue.value);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Date Format"
                    variant="outlined"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option?.value}>
                    {option?.label || 'Select a date format'}
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
                noOptionsText={!searchQueries.dateFormat ? 'Type to search for date formats' : 'No date formats found'}
              />
            )}
          />
        </Box>


        {/* Column 2 - Row 2 */}
        <Box>
          <Controller
            name="currency"
            control={control}
            render={({ field: { onChange, value, ...field } }) => (
              <Autocomplete
                {...field}
                options={currencies}
                getOptionLabel={(option) => `${option.code} - ${option.name} (${option.symbol})`}
                value={currencies.find(curr => curr.code === value) || null}
                onChange={(_, newValue) => {
                  onChange(newValue?.code || '');
                }}
                inputValue={searchQueries.currency}
                onInputChange={(_, newInputValue) => handleSearchQueryChange('currency', newInputValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Currency"
                    variant="outlined"
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props} key={option.code}>
                    {option.code} - {option.name} ({option.symbol})
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
                noOptionsText={!searchQueries.currency ? 'Type to search for currencies' : 'No currencies found'}
              />
            )}
          />
        </Box>
        
        {/* Column 1 - Row 3 */}
        <Box>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ 
              fontSize: '0.875rem', 
              '&.Mui-focused': {
                color: 'primary.main'
              }
            }}>
              Time Format
            </FormLabel>
            <Controller
              name="timeFormat"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  row
                  {...field}
                  sx={{ mt: 0.5 }}
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
              )}
            />
          </FormControl>
        </Box>
      
      </Box>
    </Paper>
    </form>
  </Box>
  );
};

export default GeneralSettings;
