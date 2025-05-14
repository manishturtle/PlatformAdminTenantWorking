import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  MenuItem,
  Typography,
  CircularProgress,
  Autocomplete,
  InputLabel,
  Select,
  FormHelperText,
  Alert,
  Snackbar,
  AppBar,
  Toolbar,
  IconButton,
  Divider,
  SelectChangeEvent,
  Checkbox,
  FormControlLabel,
  FormControl,
  Slide,
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import { Customer } from '../../types/customer';
import { customerApi } from '../../services/api';
import { CUSTOMER_TYPE_OPTIONS, SOURCE_OPTIONS } from '../../types/customer';

// Type for referral options including a loading state
interface ReferralOption extends Customer {
  type?: 'loading';
}

interface ConvertLeadModalProps {
  open: boolean;
  customer: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * A full-screen modal component for converting leads to customers with editable fields
 * Can be used in CustomerListScreen, EditCustomerScreen, and CustomerDetailsScreen
 */
const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
  open,
  customer,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<Partial<Customer>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [snackbar, setSnackbar] = useState<{open: boolean; message: string; severity: 'success' | 'error'}>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [referralOptions, setReferralOptions] = useState<ReferralOption[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [referralSearchTimeout, setReferralSearchTimeout] = useState<NodeJS.Timeout>();

  // Initialize form data when customer changes
  useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
        CustomerType: 'New',
      });

      // If customer has a referrer, load the referral options
      if (customer.Source === 'Referral' && customer.ReferredBy) {
        setLoadingReferrals(true);
        const fetchReferralOptions = async () => {
          try {
            // First try to find the exact match
            const exactResponse = await customerApi.getCustomers({
              search: customer.ReferredBy,
              page_size: 10
            });

            // If no exact match found, try a broader search
            if (exactResponse.results.length === 0) {
              const [firstName, lastName] = customer.ReferredBy.split(' ');
              if (firstName) {
                const broaderResponse = await customerApi.getCustomers({
                  search: firstName,
                  page_size: 10
                });
                setReferralOptions(broaderResponse.results);
              }
            } else {
              setReferralOptions(exactResponse.results);
            }
          } catch (err) {
            console.error('Error fetching referral options:', err);
          } finally {
            setLoadingReferrals(false);
          }
        };

        fetchReferralOptions();
      }
    }
  }, [customer]);

  // Handle referral search with debouncing
  const handleReferralSearch = (searchTerm: string) => {
    if (referralSearchTimeout) {
      clearTimeout(referralSearchTimeout);
    }

    setLoadingReferrals(true);
    setReferralOptions([{ type: 'loading' } as ReferralOption]);

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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    // Required fields
    if (!formData.FirstName) {
      errors.FirstName = 'First name is required';
    }

    if (!formData.LastName) {
      errors.LastName = 'Last name is required';
    }

    if (!formData.CustomerType) {
      errors.CustomerType = 'Customer type is required';
    }

    if (!formData.Source) {
      errors.Source = 'Source is required';
    }

    // Validate email format if provided
    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      errors.Email = 'Invalid email format';
    }

    // Validate phone format if provided
    if (formData.Phone && !/^\d{10}$/.test(formData.Phone)) {
      errors.Phone = 'Phone must be 10 digits';
    }

    // Validate Aadhar Card format if provided
    if (formData.AadharCard && !/^\d{12}$/.test(formData.AadharCard)) {
      errors.AadharCard = 'Aadhar Card must be 12 digits';
    }

    // Validate PAN Card format if provided
    if (formData.PANCard && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.PANCard)) {
      errors.PANCard = 'Invalid PAN Card format';
    }

    // Validate ReferredBy if Source is Referral
    if (formData.Source === 'Referral' && !formData.ReferredBy) {
      errors.ReferredBy = 'Referred By is required for Referral source';
    }

    // Validate email based on type and source
    if (isEmailRequired()) {
      if (!formData.Email) {
        errors.Email = 'Email is required';
      }
    }

    // Validate phone based on type and source
    if (isPhoneRequired()) {
      if (!formData.Phone) {
        errors.Phone = 'Phone number is required';
      }
    }

    // For non-Channel Partner customers, ensure at least one contact method
    const isChannelPartner = formData.Source === 'Channel Partner/Relative';
    const isCustomer = ['New', 'Active', 'Dormant'].includes(formData.CustomerType);
    if (!isChannelPartner || !isCustomer) {
      if (!formData.Email && !formData.Phone) {
        errors.Email = 'Either Email or Phone is required';
        errors.Phone = 'Either Email or Phone is required';
      }
    }

    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!customer || !validate()) return;
    
    try {
      setLoading(true);
      
      // Process form data to handle empty values properly
      const processedData = {
        ...formData,
        // Convert empty strings to null for unique fields
        AadharCard: formData.AadharCard?.trim() ? formData.AadharCard : null,
        PANCard: formData.PANCard?.trim() ? formData.PANCard : null,
        // Only include Password if AllowPortalAccess is true and Password is provided
        Password: formData.AllowPortalAccess && formData.Password?.trim() ? formData.Password : null
      };
      
      // If AllowPortalAccess is false, ensure Password is set to null
      if (!formData.AllowPortalAccess) {
        (processedData as any).Password = null;
      }
      
      // Update the customer with processed form data
      await customerApi.updateCustomer(customer.CustomerID, processedData);
      
      // Show success message
      setSnackbar({
        open: true,
        message: 'Lead successfully converted to customer!',
        severity: 'success'
      });
      
      // Call onSuccess callback
      onSuccess();
    } catch (error: any) {
      console.error('Error converting lead:', error);
      
      // Show error message
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || 'Failed to convert lead. Please try again.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if email is required
  const isEmailRequired = () => {
    // For Lead mode
    const isLeadMode = ['Lead', 'Disqualified Lead'].includes(formData.CustomerType || '');
    if (isLeadMode) {
      return formData.Source === 'Online Portal';
    }
    
    // For Customer mode (New, Active, Dormant)
    const isCustomerMode = ['New', 'Active', 'Dormant'].includes(formData.CustomerType || '');
    if (isCustomerMode) {
      // Optional for Channel Partner/Relative, required for others
      return formData.Source !== 'Channel Partner/Relative';
    }
    
    return false;
  };

  // Helper function to check if phone is required
  const isPhoneRequired = () => {
    // For Lead mode, phone is always optional
    const isLeadMode = ['Lead', 'Disqualified Lead'].includes(formData.CustomerType || '');
    if (isLeadMode) {
      return false;
    }
    
    // For Customer mode (New, Active, Dormant)
    const isCustomerMode = ['New', 'Active', 'Dormant'].includes(formData.CustomerType || '');
    if (isCustomerMode) {
      // Optional for Channel Partner/Relative, required for others
      return formData.Source !== 'Channel Partner/Relative';
    }
    
    return false;
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
            {/* First row: Name fields */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
                <TextField
                  label="First Name"
                  name="FirstName"
                  value={formData.FirstName || ''}
                  onChange={handleTextChange}
                  fullWidth
                  margin="normal"
                  error={!!errors.LastName}
                  helperText={errors.LastName}
                />
              </Box>
            </Box>

            {/* Second row: Email and Phone */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'space-between' }}>
              <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
                <TextField
                  fullWidth
                  type="email"
                  label={`Email${(formData.AllowPortalAccess || isEmailRequired()) ? ' *' : ''}`}
                  name="Email"
                  value={formData.Email || ''}
                  onChange={handleTextChange}
                  error={!!errors.Email}
                  helperText={errors.Email}
                  required={formData.AllowPortalAccess || isEmailRequired()}
                  inputProps={{ maxLength: 254 }}
                />
              </Box>
                
              <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
                <TextField
                  fullWidth
                  label={`Phone${isPhoneRequired() ? ' *' : ''}`}
                  name="Phone"
                  value={formData.Phone || ''}
                  onChange={handleTextChange}
            )}
          </FormControl>

          <FormControl sx={{ flex: '1 1 45%', minWidth: '250px' }} error={!!errors.Source}>
            <InputLabel id="source-label">Source *</InputLabel>
            <Select
              labelId="source-label"
              name="Source"
              value={formData.Source || ''}
              onChange={handleSelectChange}
              required
              label="Source *"
            >
              {SOURCE_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {errors.Source && (
              <FormHelperText>{errors.Source}</FormHelperText>
            )}
          </FormControl>
        </Box>

        {/* Fourth row: ReferredBy field (only shown when Source is Referral) */}
        {formData.Source === 'Referral' && (
          <Box sx={{ mb: 2 }}>
            <Autocomplete
              disablePortal
              id="referred-by-autocomplete"
              options={referralOptions}
              loading={loadingReferrals}
              getOptionLabel={(option) => 
                option.type === 'loading' ? 'Loading...' :
                `${option.FirstName} ${option.LastName} (${option.Email || 'No email'})`
              }
              loading={loadingReferrals}
              value={referralOptions.find(option => 
                option.type !== 'loading' && 
                formData.ReferredBy?.includes(`${option.FirstName} ${option.LastName}`)
              ) || null}
              onInputChange={(event, value) => {
                if (value) {
                  handleReferralSearch(value);
                }
              }}
              onChange={(event, value) => {
                setFormData(prev => ({
                  ...prev,
                  ReferredBy: value ? `${value.FirstName} ${value.LastName}` : ''
                }));
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Referred By *"
                  error={!!errors.ReferredBy}
                  helperText={
                    errors.ReferredBy || 
                    (formData.ReferredBy && !referralOptions.length ? 
                      `Current: ${formData.ReferredBy}` : 
                      'Search by name or email')
                  }
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
          </Box>
        )}
      </Box>
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} disabled={loading}>
        Cancel
      </Button>
      <Button 
        onClick={handleSave} 
        color="primary" 
        variant="contained"
      </Alert>
    </Snackbar>
  </>
        disabled={loading}
        startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </DialogActions>
  </Dialog>
  
  <Snackbar
    open={snackbar.open}
    autoHideDuration={6000}
    onClose={handleCloseSnackbar}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  >
    <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
      {snackbar.message}
    </Alert>
  </Snackbar>
</>
);
};

export default ConvertLeadModal;
