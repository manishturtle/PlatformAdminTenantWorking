import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import NextLink from 'next/link';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  MenuItem,
  Alert,
  CircularProgress,
  Checkbox,
  FormControlLabel,
  Breadcrumbs,
  Link as MuiLink,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  FormHelperText,
  Grid, // Import Grid from MUI
} from '@mui/material';
import { styled } from '@mui/material/styles'; // Import styled from MUI
import { Customer, ServiceAgent, CUSTOMER_TYPE_OPTIONS, SOURCE_OPTIONS } from '../../types/customer';
import { customerApi } from '../../services/api';
import { serviceAgentApi } from '../../services/serviceAgentApi';
import { hasAllowedFeature } from '../../my_features';


// Type for referral/channel partner options including a loading state
interface AutocompleteOption extends Customer {
  type?: 'loading';
}

interface FormData extends Partial<Customer> {
  Password?: string;
}

const AddCustomerScreenNew = () => {
  const router = useRouter();
  const { type } = router.query;
  const isLeadMode = type === 'lead';

  const defaultValues = {
    FirstName: '',
    LastName: '',
    Email: '',
    Phone: '',
    PANCard: '',
    Password: '',
    AllowPortalAccess: false,
    EmailVerified: false,
    MobileVerified: false,
    Source: 'Others',
    CustomerType: 'Lead',
    ReferredBy: '',
    account_owner_id: '',  // Add account_owner_id to default values
  };

  const [formData, setFormData] = useState<FormData>({
    ...defaultValues,
    CustomerType: isLeadMode ? 'Lead' : '',
    Source: '',
    AllowPortalAccess: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [referralOptions, setReferralOptions] = useState<AutocompleteOption[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralSearchTimeout, setReferralSearchTimeout] = useState<NodeJS.Timeout>();

  const [channelPartnerOptions, setChannelPartnerOptions] = useState<AutocompleteOption[]>([]);
  const [loadingChannelPartners, setLoadingChannelPartners] = useState(false);
  const [channelPartnerSearchTimeout, setChannelPartnerSearchTimeout] = useState<NodeJS.Timeout>();

  const [serviceAgents, setServiceAgents] = useState<ServiceAgent[]>([]);
  const [loadingServiceAgents, setLoadingServiceAgents] = useState(false);


  // Load service agents on component mount
  useEffect(() => {
    const loadServiceAgents = async () => {
      setLoadingServiceAgents(true);
      try {
        const agents = await serviceAgentApi.getServiceAgents();
        setServiceAgents(agents);
      } catch (error) {
        console.error('Error loading service agents:', error);
      } finally {
        setLoadingServiceAgents(false);
      }
    };

    loadServiceAgents();
  }, []);

  // Handle referral search with debouncing
  const handleReferralSearch = (searchTerm: string) => {
    if (referralSearchTimeout) {
      clearTimeout(referralSearchTimeout);
    }

    setLoadingReferrals(true);
    setReferralOptions([{ type: 'loading' } as AutocompleteOption]);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await customerApi.getCustomers({
          search: searchTerm,
          page_size: 10
        });
        setReferralOptions(response.results);
      } catch (err) {
        console.error('Error fetching referral options:', err);
        setReferralOptions([]);
      } finally {
        setLoadingReferrals(false);
      }
    }, 300); // 300ms debounce

    setReferralSearchTimeout(timeoutId);
  };

  // Handle channel partner search with debouncing
  const handleChannelPartnerSearch = (searchTerm: string) => {
    if (channelPartnerSearchTimeout) {
      clearTimeout(channelPartnerSearchTimeout);
    }

    setLoadingChannelPartners(true);
    setChannelPartnerOptions([{ type: 'loading' } as AutocompleteOption]);

    const timeoutId = setTimeout(async () => {
      try {
        const response = await customerApi.getCustomers({
          search: searchTerm,
          page_size: 10
        });
        setChannelPartnerOptions(response.results);
      } catch (err) {
        console.error('Error fetching channel partner options:', err);
        setChannelPartnerOptions([]);
      } finally {
        setLoadingChannelPartners(false);
      }
    }, 300); // 300ms debounce

    setChannelPartnerSearchTimeout(timeoutId);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;

    if (typeof name === 'string') {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };

        // Handle Email changes
        if (name === 'Email') {
          // If email is cleared and portal access was enabled, disable it
          if (!value && prev.AllowPortalAccess) {
            newData.AllowPortalAccess = false;
          }

          // If in Lead mode and Source is Online Portal
          if (isLeadMode && prev.Source === 'Online Portal') {
            // If email is provided, enable portal access
            newData.AllowPortalAccess = !!value;
          }
        }

        // Handle Source changes
        if (name === 'Source') {
          // Clear ReferredBy if source is not Referral
          if (value !== 'Referral') {
            newData.ReferredBy = '';
          }
          // Clear ChannelPartner if source is not Channel Partner/Relative
          if (value !== 'Channel Partner/Relative') {
            newData.ChannelPartner = '';
          }
        }

        // Clear validation errors for the changed field
        if (validationErrors[name]) {
          setValidationErrors(prev => {
            const { [name]: _, ...rest } = prev;
            return rest;
          });
        }

        return newData;
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    // If trying to check Allow Portal Access
    if (name === 'AllowPortalAccess' && checked) {
      // If email is not entered, show error and prevent checking
      if (!formData.Email) {
        setValidationErrors(prev => ({
          ...prev,
          Email: 'Email is required for portal access'
        }));
        return; // Don't update the checkbox
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  // Helper function to check if email is required
  const isEmailRequired = () => {
    // For Lead mode
    if (isLeadMode) {
      return formData.Source === 'Online Portal';
    }

    // For Customer mode (New, Active, Dormant)
    const isCustomerMode = ['New', 'Active', 'Dormant'].includes(formData.CustomerType);
    if (isCustomerMode) {
      // Optional for Channel Partner/Relative, required for others
      return formData.Source !== 'Channel Partner/Relative';
    }

    return false;
  };

  // Helper function to check if phone is required
  const isPhoneRequired = () => {
    // For Lead mode, phone is always optional
    if (isLeadMode) {
      return false;
    }

    // For Customer mode (New, Active, Dormant)
    const isCustomerMode = ['New', 'Active', 'Dormant'].includes(formData.CustomerType);
    if (isCustomerMode) {
      // Optional for Channel Partner/Relative, required for others
      return formData.Source !== 'Channel Partner/Relative';
    }

    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const errors: { [key: string]: string } = {};

    if (!formData.FirstName?.trim()) errors.FirstName = 'First Name is required';
    if (!formData.LastName?.trim()) errors.LastName = 'Last Name is required';
    if (!formData.CustomerType) errors.CustomerType = 'Customer Type is required';
    if (!formData.Source) errors.Source = 'Source is required';

    // Email validation if provided, required, or EmailVerified is true
    if (formData.Email || isEmailRequired() || formData.EmailVerified) {
      if (!formData.Email?.trim()) {
        errors.Email = formData.EmailVerified
          ? 'Email is required when Email Verified is checked'
          : 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {  // Basic email validation
        errors.Email = 'Invalid email format';
      }
    }

    // Phone validation if provided, required, or MobileVerified is true
    if (formData.Phone || isPhoneRequired() || formData.MobileVerified) {
      if (!formData.Phone?.trim()) {
        errors.Phone = formData.MobileVerified
          ? 'Phone is required when Mobile Verified is checked'
          : 'Phone is required';
      } else if (!/^\d{10}$/.test(formData.Phone)) {
        errors.Phone = 'Phone must be exactly 10 digits';
      }
    }

    // Source-specific validations
    if (formData.Source === 'Referral' && !formData.ReferredBy) {
      errors.ReferredBy = 'Please select a referrer';
    }
    if (formData.Source === 'Channel Partner/Relative' && !formData.ChannelPartner) {
      errors.ChannelPartner = 'Please select a channel partner';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setLoading(true);
    try {
      // Prepare the customer data
      const customerData = {
        ...formData,
        // Convert empty strings to null for optional fields
        PANCard: formData.PANCard?.trim() || null,
        AadharCard: formData.AadharCard?.trim() || null,
        // Ensure verification flags are properly set
        EmailVerified: Boolean(formData.EmailVerified),
        MobileVerified: Boolean(formData.MobileVerified),
        // Ensure ReferredBy and ChannelPartner are properly set based on source
        ReferredBy: formData.Source === 'Referral' ? formData.ReferredBy : '',
        ChannelPartner: formData.Source === 'Channel Partner/Relative' ? formData.ChannelPartner : '',
        account_owner_id: formData.account_owner_id ? parseInt(formData.account_owner_id, 10) : null, // Parse to int
      };

      await customerApi.createCustomer(customerData);
      router.push('/customers');
    } catch (err) {
      console.error('Error creating customer:', err);
      setError('Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Define a styled Box component for consistent spacing
  const StyledBox = styled(Box)(({ theme }) => ({
    marginBottom: theme.spacing(2),
  }));

  return (
    <Box component="main" sx={{ p: 3 }}>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <MuiLink component={NextLink} href="/customers" underline="hover" color="inherit">
          Back to Customers
        </MuiLink>
        <Typography color="textPrimary">
          {isLeadMode ? 'Add Lead' : 'Add Customer'}
        </Typography>
      </Breadcrumbs>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            {isLeadMode ? 'Lead Information' : 'Customer Information'}
          </Typography>

          <Grid container spacing={3}>
            {/* Customer Type and Source */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="customer-type-label">Customer Type *</InputLabel>
                <Select
                  labelId="customer-type-label"
                  name="CustomerType"
                  value={formData.CustomerType || ''}
                  label="Customer Type *"
                  onChange={handleChange}
                  error={!!validationErrors.CustomerType}
                  required
                >
                  {CUSTOMER_TYPE_OPTIONS.filter(option =>
                    isLeadMode ?
                      ['Lead', 'Disqualified Lead'].includes(option.value) :
                      ['New', 'Active', 'Dormant'].includes(option.value)
                  ).map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {validationErrors.CustomerType && (
                  <FormHelperText error>{validationErrors.CustomerType}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="source-label">Source *</InputLabel>
                <Select
                  labelId="source-label"
                  name="Source"
                  value={formData.Source || ''}
                  label="Source *"
                  onChange={handleChange}
                  error={!!validationErrors.Source}
                  required
                >
                  {SOURCE_OPTIONS.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                {validationErrors.Source && (
                  <FormHelperText error>{validationErrors.Source}</FormHelperText>
                )}
              </FormControl>
            </Grid>

            {/* Referral Information */}
            {formData.Source === 'Referral' && (
              <Grid item xs={12}>
                <Autocomplete
                  fullWidth
                  options={referralOptions}
                  getOptionLabel={(option) =>
                    option.type === 'loading' ? 'Loading...' :
                      `${option.FirstName} ${option.LastName} (${option.Email || 'No email'})`
                  }
                  loading={loadingReferrals}
                  onInputChange={(event, value) => {
                    if (value) {
                      handleReferralSearch(value);
                    }
                  }}
                  onChange={(event, value) => {
                    setFormData(prev => ({
                      ...prev,
                      ReferredBy: value && value.Email ? value.Email : ''
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Referred By"
                      error={!!validationErrors.ReferredBy}
                      helperText={validationErrors.ReferredBy || 'Search by name or email'}
                      required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {loadingReferrals ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            )}

            {/* Channel Partner Information */}
            {formData.Source === 'Channel Partner/Relative' && (
              <Grid item xs={12}>
                <Autocomplete
                  fullWidth
                  options={channelPartnerOptions}
                  getOptionLabel={(option) =>
                    option.type === 'loading' ? 'Loading...' :
                      `${option.FirstName} ${option.LastName} (${option.Email || 'No email'})`
                  }
                  loading={loadingChannelPartners}
                  onInputChange={(event, value) => {
                    if (value) {
                      handleChannelPartnerSearch(value);
                    }
                  }}
                  onChange={(event, value) => {
                    setFormData(prev => ({
                      ...prev,
                      ChannelPartner: value?.Email || ''
                    }));
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Channel Partner"
                      error={!!validationErrors.ChannelPartner}
                      helperText={validationErrors.ChannelPartner || 'Search by name or email'}
                      required
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <React.Fragment>
                            {loadingChannelPartners ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            )}

            {/* Basic Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="First Name *"
                name="FirstName"
                value={formData.FirstName || ''}
                onChange={handleChange}
                error={!!validationErrors.FirstName}
                helperText={validationErrors.FirstName}
                required
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Name *"
                name="LastName"
                value={formData.LastName || ''}
                onChange={handleChange}
                error={!!validationErrors.LastName}
                helperText={validationErrors.LastName}
                required
                inputProps={{ maxLength: 100 }}
              />
            </Grid>

            {/* Contact Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label={`Email${(formData.AllowPortalAccess || isEmailRequired()) ? ' *' : ''}`}
                name="Email"
                value={formData.Email || ''}
                onChange={handleChange}
                error={!!validationErrors.Email}
                helperText={validationErrors.Email || 'Either Email or Phone is required'}
                required={formData.AllowPortalAccess || isEmailRequired()}
                inputProps={{ maxLength: 254 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={`Phone${isPhoneRequired() ? ' *' : ''}`}
                name="Phone"
                value={formData.Phone || ''}
                onChange={handleChange}
                error={!!validationErrors.Phone}
                helperText={validationErrors.Phone}
                required={isPhoneRequired()}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>

            {/* ID Information */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Aadhar Card"
                name="AadharCard"
                value={formData.AadharCard || ''}
                onChange={handleChange}
                error={!!validationErrors.AadharCard}
                helperText={validationErrors.AadharCard}
                inputProps={{ maxLength: 12 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="PAN Card"
                name="PANCard"
                value={formData.PANCard || ''}
                onChange={handleChange}
                error={!!validationErrors.PANCard}
                helperText={validationErrors.PANCard}
                inputProps={{ maxLength: 10 }}
              />
            </Grid>

            {/* Verification Status */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Verification Status</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.EmailVerified || false}
                        onChange={(e) => {
                          handleCheckboxChange(e);
                          // If unchecking and no email is required, clear validation error
                          if (!e.target.checked && !isEmailRequired()) {
                            setValidationErrors(prev => {
                              const { Email, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                        name="EmailVerified"
                        color="primary"
                      />
                    }
                    label="Email Verified"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.MobileVerified || false}
                        onChange={(e) => {
                          handleCheckboxChange(e);
                          // If unchecking and no phone is required, clear validation error
                          if (!e.target.checked && !isPhoneRequired()) {
                            setValidationErrors(prev => {
                              const { Phone, ...rest } = prev;
                              return rest;
                            });
                          }
                        }}
                        name="MobileVerified"
                        color="primary"
                      />
                    }
                    label="Mobile Verified"
                  />
                </Box>
              </Box>
            </Grid>

            {/* Portal Access */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.AllowPortalAccess}
                      onChange={handleCheckboxChange}
                      name="AllowPortalAccess"
                      color="primary"
                      disabled={isLeadMode && formData.Source !== 'Online Portal'}
                    />
                  }
                  label="Allow Portal Access"
                />
              </Box>
            </Grid>

            {/* Account Owner */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel id="account-owner-label">Account Owner</InputLabel>
                  <Select
                    labelId="account-owner-label"
                    id="account-owner"
                    name="account_owner_id"
                    value={formData.account_owner_id?.toString() || ''}
                    onChange={handleChange}
                    label="Account Owner"
                    disabled={loadingServiceAgents}
                  >
                    <MenuItem value="">None</MenuItem>
                    {console.log('Rendering service agents:', serviceAgents)}
                    {Array.isArray(serviceAgents) ? (
                      serviceAgents.map((agent) => (
                        <MenuItem key={agent.serviceagentid} value={agent.serviceagentid}>
                          {agent.serviceagentname}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="">Error: Invalid service agents data</MenuItem>
                    )}
                  </Select>
                  <FormHelperText>Assign an account owner to this customer</FormHelperText>
                </FormControl>
              </Box>
            </Grid>

            {/* Password Field - Only show if portal access is enabled */}
            {formData.AllowPortalAccess && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="password"
                  label="Password"
                  name="Password"
                  value={formData.Password || ''}
                  onChange={handleChange}
                  error={!!validationErrors.Password}
                  helperText={validationErrors.Password || 'Optional - Leave blank to allow login with OTP only'}
                />
              </Grid>
            )}
          </Grid>

          {/* Form Actions */}
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => router.push('/customers')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : (isLeadMode ? 'Save Lead' : 'Save Customer')}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
};

export default AddCustomerScreenNew;