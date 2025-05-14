import React, { useState, useEffect, useCallback } from 'react';
import {
    Dialog,
    DialogContent,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Button,
    Box,
    TextField,
    MenuItem,
    CircularProgress,
    Autocomplete,
    FormControlLabel,
    Checkbox,
    Alert,
    Select,
    SelectChangeEvent,
    FormHelperText,
    FormControl,
    InputLabel,
    Grid
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import Slide from '@mui/material/Slide';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
// ** IMPORTANT: Adjust these import paths if necessary for your project structure **
import { Customer, SOURCE_OPTIONS, ServiceAgent } from '../../types/customer';
import { customerApi } from '../../services/api';
import { serviceAgentApi } from '../../services/serviceAgentApi';

// Type for Autocomplete options including meta states
type AutocompleteCustomerOption = Customer & { type?: 'loading' | 'error' | 'no_results' };

// Transition component for the dialog
const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children: React.ReactElement },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

interface ConvertLeadModalProps {
    open: boolean;
    customer: Customer | null; // The lead being converted
    onClose: () => void;
    onSuccess: () => void; // Called after successful conversion
}

const ConvertLeadModal: React.FC<ConvertLeadModalProps> = ({
    open,
    customer,
    onClose,
    onSuccess
}) => {
    const [formData, setFormData] = useState<Partial<Customer>>({});
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [serviceAgents, setServiceAgents] = useState<ServiceAgent[]>([]);
    const [loadingServiceAgents, setLoadingServiceAgents] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // State for Referral Autocomplete
    const [referralSearchTimeout, setReferralSearchTimeout] = useState<NodeJS.Timeout>();
    const [loadingReferrals, setLoadingReferrals] = useState(false);
    const [referralOptions, setReferralOptions] = useState<AutocompleteCustomerOption[]>([]);
    const [selectedReferrer, setSelectedReferrer] = useState<AutocompleteCustomerOption | null>(null);

    // State for Channel Partner Autocomplete
    const [channelPartnerSearchTimeout, setChannelPartnerSearchTimeout] = useState<NodeJS.Timeout>();
    const [loadingChannelPartners, setLoadingChannelPartners] = useState(false);
    const [channelPartnerOptions, setChannelPartnerOptions] = useState<AutocompleteCustomerOption[]>([]);
    const [selectedChannelPartner, setSelectedChannelPartner] = useState<AutocompleteCustomerOption | null>(null);

    // Helper to pre-fetch customer data for Autocomplete
    const searchCustomerByEmail = async (email: string): Promise<AutocompleteCustomerOption | null> => {
        if (!email) return null;
        try {
            const response = await customerApi.searchCustomers({ search: email, limit: 1, page: 1 });
            const found = response.data.customers.find(c => c.Email?.toLowerCase() === email.toLowerCase());
            return found || null;
        } catch (err) {
            console.error(`Error pre-fetching customer ${email}:`, err);
            return null;
        }
    };

    // Initialize form data
    useEffect(() => {
        if (open && customer) {
            // Initialize form with all customer data
            setFormData({
                ...customer,
                CustomerType: 'New',  // Override CustomerType to 'New' for conversion
                EmailVerified: customer.EmailVerified || false,
                MobileVerified: customer.MobileVerified || false,
                account_owner_id: customer.account_owner_id || ''
            });

            // Load service agents
            const loadServiceAgents = async () => {
                setLoadingServiceAgents(true);
                try {
                    const agents = await serviceAgentApi.getServiceAgents();
                    console.log('Fetched service agents:', agents);
                    setServiceAgents(agents);
                } catch (err) {
                    console.error('Error loading service agents:', err);
                    setError('Failed to load service agents');
                } finally {
                    setLoadingServiceAgents(false);
                }
            };

            loadServiceAgents();
        }
    }, [open, customer]);

    // Cleanup timeouts
    useEffect(() => {
        return () => {
            if (referralSearchTimeout) clearTimeout(referralSearchTimeout);
            if (channelPartnerSearchTimeout) clearTimeout(channelPartnerSearchTimeout);
        };
    }, [referralSearchTimeout, channelPartnerSearchTimeout]);

    // --- Event Handlers ---
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSelectChange = (event: SelectChangeEvent<string>) => {
        const { name, value } = event.target;
        const isSourceField = name === 'Source';

        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'Source') {
                // Clear related fields/selections when source changes
                newState.ReferredBy = (value === 'Referral' ? prev?.ReferredBy : ''); // Keep old value if source IS referral
                setSelectedReferrer(value === 'Referral' ? selectedReferrer : null); // Keep selection if source IS referral
                newState.ChannelPartner = (value === 'Channel Partner/Relative' ? prev?.ChannelPartner : '');
                setSelectedChannelPartner(value === 'Channel Partner/Relative' ? selectedChannelPartner : null);

                 // Clear validation errors for the fields being hidden
                 if (value !== 'Referral' && validationErrors.ReferredBy) {
                    setValidationErrors(v => ({...v, ReferredBy: ''}));
                 }
                 if (value !== 'Channel Partner/Relative' && validationErrors.ChannelPartner) {
                    setValidationErrors(v => ({...v, ChannelPartner: ''}));
                 }
            }
            return newState;
        });
        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: '' }));
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

        // Clear validation errors for the changed field
        if (validationErrors[name]) {
            setValidationErrors(prev => {
                const { [name]: _, ...rest } = prev;
                return rest;
            });
        }
    };

    // --- Autocomplete Search Handlers ---
    const searchReferrals = useCallback(async (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 2) { setReferralOptions([]); setLoadingReferrals(false); return; }
        setLoadingReferrals(true);
        try {
            const response = await customerApi.searchCustomers({ search: searchTerm, page: 1, limit: 10 });
            const filteredOptions = response.data.customers.filter(c => c.CustomerID !== customer?.CustomerID && c.Email);
            setReferralOptions(filteredOptions.length > 0 ? filteredOptions : [{ type: 'no_results', FirstName: 'No results', LastName: '', Email: '' }]);
        } catch (err) { console.error('Failed to search referrals:', err); setReferralOptions([{ type: 'error', FirstName: 'Error searching', LastName: '', Email: '' }]);
        } finally { setLoadingReferrals(false); }
    }, [customer?.CustomerID]);

    const handleReferralSearch = (searchTerm: string) => {
        if (referralSearchTimeout) clearTimeout(referralSearchTimeout);
        setLoadingReferrals(true);
        const timeout = setTimeout(() => searchReferrals(searchTerm), 500);
        setReferralSearchTimeout(timeout);
    };

    const searchChannelPartners = useCallback(async (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 2) { setChannelPartnerOptions([]); setLoadingChannelPartners(false); return; }
        setLoadingChannelPartners(true);
        try {
            const response = await customerApi.searchCustomers({ search: searchTerm, page: 1, limit: 10 });
            const filteredOptions = response.data.customers.filter(c => c.CustomerID !== customer?.CustomerID && c.Email);
            setChannelPartnerOptions(filteredOptions.length > 0 ? filteredOptions : [{ type: 'no_results', FirstName: 'No results', LastName: '', Email: '' }]);
        } catch (err) { console.error('Failed to search channel partners:', err); setChannelPartnerOptions([{ type: 'error', FirstName: 'Error searching', LastName: '', Email: '' }]);
        } finally { setLoadingChannelPartners(false); }
    }, [customer?.CustomerID]);

    const handleChannelPartnerSearch = (searchTerm: string) => {
        if (channelPartnerSearchTimeout) clearTimeout(channelPartnerSearchTimeout);
        setLoadingChannelPartners(true);
        const timeout = setTimeout(() => searchChannelPartners(searchTerm), 500);
        setChannelPartnerSearchTimeout(timeout);
    };

    // --- Form Validation ---
    const validateForm = () => {
        const errors: Record<string, string> = {};
        const data = formData;

        if (!data.FirstName?.trim()) errors.FirstName = 'First Name is required';
        if (!data.LastName?.trim()) errors.LastName = 'Last Name is required';
        if (!data.CustomerType) errors.CustomerType = 'Customer Type is required';
        if (!data.Source) errors.Source = 'Source is required';

        // Email and Phone validation based on Source
        if (data.Source !== 'Channel Partner/Relative') {
            // Both Email and Phone are required unless source is Channel Partner/Relative
            if (!data.Email?.trim()) {
                errors.Email = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
                errors.Email = 'Invalid email format';
            }

            if (!data.Phone?.trim()) {
                errors.Phone = 'Phone is required';
            } else if (!/^\d{10}$/.test(data.Phone)) {
                errors.Phone = 'Phone must be exactly 10 digits';
            }
        } else {
            // For Channel Partner/Relative, validate only if provided
            if (data.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.Email)) {
                errors.Email = 'Invalid email format';
            }
            if (data.Phone && !/^\d{10}$/.test(data.Phone)) {
                errors.Phone = 'Phone must be exactly 10 digits';
            }
        }

        if (data.AllowPortalAccess && !data.Password?.trim()) {
            errors.Password = 'Password is required when allowing portal access';
        }

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // --- Save Handler ---
    const handleSave = async () => {
        if (!validateForm() || !customer) return;
        setLoading(true);
        setValidationErrors({});

        const updatePayload: Partial<Customer> & { CustomerType: string } = {
            FirstName: formData.FirstName,
            LastName: formData.LastName,
            Email: formData.Email,
            Phone: formData.Phone,
            Source: formData.Source,
            AllowPortalAccess: formData.AllowPortalAccess,
            AadharCard: formData.AadharCard,
            PANCard: formData.PANCard,
            CustomerType: 'New', // Force type
            // Set ReferredBy/ChannelPartner based on selection's Email (or ID if preferred)
            ReferredBy: formData.Source === 'Referral' ? selectedReferrer?.Email || '' : '',
            ChannelPartner: formData.Source === 'Channel Partner/Relative' ? selectedChannelPartner?.Email || '' : '',
            Password: formData.AllowPortalAccess ? formData.Password : undefined,
            account_owner_id: formData.account_owner_id
        };
        if (!updatePayload.Password) delete updatePayload.Password;

        try {
            // Use the correct ID property (CustomerID or id) from your Customer type
            const customerIdToUpdate = customer.CustomerID ?? customer.id;
            if (!customerIdToUpdate) throw new Error("Customer ID is missing");

            await customerApi.updateCustomer(customerIdToUpdate, updatePayload as Customer);
            onSuccess();
        } catch (error: any) {
            console.error('Error converting lead:', error);
            const apiErrors = error.response?.data?.errors;
            const apiMessage = error.response?.data?.message;
            if (apiErrors && typeof apiErrors === 'object') {
                 setValidationErrors(apiErrors);
            } else {
                 setValidationErrors({ submit: apiMessage || 'Error converting lead. Please try again.' });
            }
        } finally {
            setLoading(false);
        }
    };

    // --- Render ---
    if (!customer) return null; // Don't render if customer data isn't available

    return (
        <Dialog fullScreen open={open} onClose={onClose} TransitionComponent={Transition} aria-labelledby="convert-lead-dialog-title">
            <AppBar sx={{ position: 'relative' }}>
                <Toolbar>
                    <IconButton edge="start" color="inherit" onClick={onClose} aria-label="close"><CloseIcon /></IconButton>
                    <Typography id="convert-lead-dialog-title" sx={{ ml: 2, flex: 1 }} variant="h6" component="div">Convert Lead: {customer.FirstName} {customer.LastName}</Typography>
                    <Button color="inherit" onClick={handleSave} disabled={loading} startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}>{loading ? 'Saving...' : 'Convert & Save'}</Button>
                </Toolbar>
            </AppBar>
            <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Box component="form" noValidate autoComplete="off" sx={{ mt: 1 }}>
                    {validationErrors.submit && (<Alert severity="error" sx={{ mb: 2 }} onClose={() => setValidationErrors(p => ({...p, submit: ''}))}>{validationErrors.submit}</Alert>)}
                    <Grid container spacing={2.5}>

                        {/* Row 1: Customer Type (Display Only) & Source */}
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Customer Type" value="New" disabled variant="filled" InputProps={{ readOnly: true }} sx={{ '.MuiInputBase-input': { cursor: 'default' } }} />
                            <FormHelperText sx={{ ml: 1.75 }}>Set to 'New' upon conversion.</FormHelperText>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={!!validationErrors.Source}>
                                <InputLabel id="source-select-label">Source *</InputLabel>
                                <Select labelId="source-select-label" label="Source *" name="Source" value={formData.Source || ''} onChange={handleSelectChange} required>
                                    {SOURCE_OPTIONS.map((option) => (<MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>))}
                                </Select>
                                {validationErrors.Source && (<FormHelperText>{validationErrors.Source}</FormHelperText>)}
                            </FormControl>
                        </Grid>

                        {/* Row 2: Conditional Autocompletes */}
                        {/* --- Moved Conditional Autocompletes Here --- */}
                        <Grid item xs={12}> {/* Use full width for the autocomplete */}
                             {formData.Source === 'Referral' && (
                                <Autocomplete
                                    options={referralOptions.filter(o => !o.type)}
                                    getOptionLabel={(option) => `${option.FirstName} ${option.LastName} (${option.Email || 'No email'})`}
                                    isOptionEqualToValue={(option, value) => option.CustomerID === value?.CustomerID}
                                    loading={loadingReferrals}
                                    value={selectedReferrer}
                                    onInputChange={(event, value, reason) => { if (reason === 'input') handleReferralSearch(value); else if (reason === 'clear') setReferralOptions([]); }}
                                    onChange={(event, value) => {
                                        setSelectedReferrer(value);
                                        setFormData(prev => ({ ...prev, ReferredBy: value ? value.Email : '' })); // Store email or ID
                                        if (validationErrors.ReferredBy) setValidationErrors(prev => ({ ...prev, ReferredBy: '' }));
                                    }}
                                    loadingText="Searching..."
                                    noOptionsText="No matching customers found"
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Referred By *"
                                            required
                                            error={!!validationErrors.ReferredBy}
                                            helperText={validationErrors.ReferredBy || 'Search existing customers'}
                                            InputProps={{...params.InputProps, endAdornment: (<>{loadingReferrals ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>)}}
                                        />
                                    )}
                                />
                             )}

                             {formData.Source === 'Channel Partner/Relative' && (
                                <Autocomplete
                                     options={channelPartnerOptions.filter(o => !o.type)}
                                     getOptionLabel={(option) => `${option.FirstName} ${option.LastName} (${option.Email || 'No email'})`}
                                     isOptionEqualToValue={(option, value) => option.CustomerID === value?.CustomerID}
                                     loading={loadingChannelPartners}
                                     value={selectedChannelPartner}
                                     onInputChange={(event, value, reason) => { if (reason === 'input') handleChannelPartnerSearch(value); else if (reason === 'clear') setChannelPartnerOptions([]); }}
                                     onChange={(event, value) => {
                                         setSelectedChannelPartner(value);
                                         setFormData(prev => ({ ...prev, ChannelPartner: value ? value.Email : '' })); // Store email or ID
                                         if (validationErrors.ChannelPartner) setValidationErrors(prev => ({ ...prev, ChannelPartner: '' }));
                                     }}
                                     loadingText="Searching..."
                                     noOptionsText="No matching customers found"
                                     renderInput={(params) => (
                                         <TextField
                                             {...params}
                                             label="Channel Partner *"
                                             required
                                             error={!!validationErrors.ChannelPartner}
                                             helperText={validationErrors.ChannelPartner || 'Search existing customers'}
                                             InputProps={{...params.InputProps, endAdornment: (<>{loadingChannelPartners ? <CircularProgress color="inherit" size={20} /> : null}{params.InputProps.endAdornment}</>)}}
                                         />
                                     )}
                                />
                             )}
                        </Grid>

                        {/* Row 3: Name */}
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="First Name *" name="FirstName" value={formData.FirstName || ''} onChange={handleChange} error={!!validationErrors.FirstName} helperText={validationErrors.FirstName} required />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Last Name *" name="LastName" value={formData.LastName || ''} onChange={handleChange} error={!!validationErrors.LastName} helperText={validationErrors.LastName} required />
                        </Grid>

                        {/* Row 4: Email and Phone */}
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                fullWidth 
                                label={`Email${formData.Source !== 'Channel Partner/Relative' ? ' *' : ''}`} 
                                name="Email" 
                                value={formData.Email || ''} 
                                onChange={handleChange} 
                                error={!!validationErrors.Email} 
                                helperText={validationErrors.Email} 
                                required={formData.Source !== 'Channel Partner/Relative'} 
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField 
                                fullWidth 
                                label={`Phone${formData.Source !== 'Channel Partner/Relative' ? ' *' : ''}`} 
                                name="Phone" 
                                value={formData.Phone || ''} 
                                onChange={handleChange} 
                                error={!!validationErrors.Phone} 
                                helperText={validationErrors.Phone} 
                                required={formData.Source !== 'Channel Partner/Relative'} 
                            />
                        </Grid>

                        {/* Row 5: Aadhar & PAN (Optional: include if editable during conversion) */}
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Aadhar Card" name="AadharCard" value={formData.AadharCard || ''} onChange={handleChange} error={!!validationErrors.AadharCard} helperText={validationErrors.AadharCard} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="PAN Card" name="PANCard" value={formData.PANCard || ''} onChange={handleChange} error={!!validationErrors.PANCard} helperText={validationErrors.PANCard} />
                        </Grid>

                        {/* Row 6: Verification Status */}
                        <Grid item xs={12} container spacing={2}>
                            <Grid item xs={6}>
                                <FormControlLabel
                                    control={<Checkbox checked={!!formData.EmailVerified} onChange={handleCheckboxChange} name="EmailVerified" />}
                                    label="Email Verified"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControlLabel
                                    control={<Checkbox checked={!!formData.MobileVerified} onChange={handleCheckboxChange} name="MobileVerified" />}
                                    label="Mobile Verified"
                                />
                            </Grid>
                        </Grid>

                        {/* Row 7: Account Owner */}
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel id="account-owner-label">Account Owner</InputLabel>
                                <Select
                                    labelId="account-owner-label"
                                    id="account-owner"
                                    name="account_owner_id"
                                    value={formData.account_owner_id?.toString() || ''}
                                    onChange={handleSelectChange}
                                    label="Account Owner"
                                    disabled={loadingServiceAgents}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {serviceAgents.map((agent) => (
                                        <MenuItem key={agent.serviceagentid} value={agent.serviceagentid}>
                                            {agent.serviceagentname}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>Assign an account owner to this customer</FormHelperText>
                            </FormControl>
                        </Grid>

                        {/* Row 8: Portal Access */}
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={<Checkbox checked={!!formData.AllowPortalAccess} onChange={handleCheckboxChange} name="AllowPortalAccess" />}
                                label="Allow Portal Access for New Customer"
                            />
                        </Grid>

                        {/* Row 7: Conditional Password */}
                        {formData.AllowPortalAccess && (
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Set Password *" name="Password" type="password" value={formData.Password || ''} onChange={handleChange} error={!!validationErrors.Password} helperText={validationErrors.Password} required />
                            </Grid>
                        )}

                         {/* Required field note */}
                         <Grid item xs={12}>
                             <Typography variant="caption">* Required fields</Typography>
                         </Grid>

                    </Grid>
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default ConvertLeadModal;