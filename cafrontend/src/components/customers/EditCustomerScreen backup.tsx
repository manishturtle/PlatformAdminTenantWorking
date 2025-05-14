import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import type { SxProps, Theme } from '@mui/material';
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
    FormControl,
    FormControlLabel,
    FormHelperText,
    InputLabel,
    Select,
    SelectChangeEvent,
    Autocomplete,
    Link as MuiLink,
    Breadcrumbs,
    Grid, // Import Grid from MUI
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { Customer, ServiceAgent, CUSTOMER_TYPE_OPTIONS, SOURCE_OPTIONS } from '../../types/customer';
import { customerApi } from '../../services/api';
import { serviceAgentApi } from '../../services/serviceAgentApi';
import ConvertLeadModalNew from './ConvertLeadModal';

type AutocompleteCustomerOption = Customer & { type?: 'loading' | 'error' | 'no_results' };

interface EditCustomerScreenProps {
    customerId: number;
}

const EditCustomerScreen = ({ customerId }: EditCustomerScreenProps) => {
    const router = useRouter();
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [convertModalOpen, setConvertModalOpen] = useState(false);

    // State for Autocomplete fields
    const [referralSearchTimeout, setReferralSearchTimeout] = useState<NodeJS.Timeout>();
    const [loadingReferrals, setLoadingReferrals] = useState(false);
    const [referralOptions, setReferralOptions] = useState<AutocompleteCustomerOption[]>([]);
    const [selectedReferrer, setSelectedReferrer] = useState<AutocompleteCustomerOption | null>(null);

    const [channelPartnerSearchTimeout, setChannelPartnerSearchTimeout] = useState<NodeJS.Timeout>();

    const [serviceAgents, setServiceAgents] = useState<ServiceAgent[]>([]);
    const [loadingServiceAgents, setLoadingServiceAgents] = useState(false);
    const [loadingChannelPartners, setLoadingChannelPartners] = useState(false);
    const [channelPartnerOptions, setChannelPartnerOptions] = useState<AutocompleteCustomerOption[]>([]);
    const [selectedChannelPartner, setSelectedChannelPartner] = useState<AutocompleteCustomerOption | null>(null);

    // State for the password field
    const [newPassword, setNewPassword] = useState('');

    const getFilteredCustomerTypes = useCallback(() => {
        if (!customer) return [];

        const currentType = customer.CustomerType;
        if (['New', 'Active', 'Dormant'].includes(currentType)) {
            return CUSTOMER_TYPE_OPTIONS.filter(option =>
                ['New', 'Active', 'Dormant'].includes(option.value)
            );
        } else if (['Lead', 'Disqualified Lead'].includes(currentType)) {
            return CUSTOMER_TYPE_OPTIONS.filter(option =>
                ['Lead', 'Disqualified Lead'].includes(option.value)
            );
        }
        return CUSTOMER_TYPE_OPTIONS;
    }, [customer?.CustomerType]);

    const searchCustomerByEmail = async (email: string): Promise<AutocompleteCustomerOption | null> => {
        if (!email) return null;
        try {
            console.log(`Attempting to pre-fetch customer with email: ${email}`);
            const response = await customerApi.searchCustomers({ search: email, limit: 1, page: 1 });
            const found = response.data.customers.find(c => c.Email?.toLowerCase() === email.toLowerCase());
            console.log("Pre-fetch result:", found);
            return found || null;
        } catch (err) {
            console.error(`Error pre-fetching customer ${email}:`, err);
            return null;
        }
    };

    const loadServiceAgents = async () => {
        setLoadingServiceAgents(true);
        try {
            const agents = await serviceAgentApi.getServiceAgents();
            console.log('Fetched service agents:', agents);
            setServiceAgents(agents);
            return agents;
        } catch (error) {
            console.error('Error loading service agents:', error);
            setError('Failed to load service agents');
            return [];
        } finally {
            setLoadingServiceAgents(false);
        }
    };

    useEffect(() => {
        const fetchCustomer = async () => {
            setLoading(true);
            setError(null);
            setSelectedReferrer(null);
            setSelectedChannelPartner(null);
            try {
                const agents = await loadServiceAgents();

                console.log(`Loading customer with ID: ${customerId}`);
                const data = await customerApi.getCustomer(customerId);
                console.log("Fetched customer data:", data);

                if (data.account_owner) {
                    console.log('Account owner from API:', data.account_owner);
                    data.account_owner_id = data.account_owner.serviceagentid;
                    data.serviceagentname = data.account_owner.serviceagentname;
                }

                setCustomer(data);
                console.log('Set customer data with account owner:', data);

                if (data.Source === 'Referral' && data.ReferredBy) {
                    const response = await customerApi.getCustomers({
                        search: data.ReferredBy,
                        page_size: 10
                    });
                    if (response.results.length > 0) {
                        setReferralOptions(response.results);
                    }
                }
                if (data.Source === 'Channel Partner/Relative' && data.ChannelPartner) {
                    const response = await customerApi.getCustomers({
                        search: data.ChannelPartner,
                        page_size: 10
                    });
                    if (response.results.length > 0) {
                        setChannelPartnerOptions(response.results);
                    }
                }
            } catch (err) {
                console.error('Failed to load customer:', err);
                setError('Failed to load customer data. Please try again.');
                setCustomer(null);
            } finally {
                setLoading(false);
            }
        };

        if (customerId) {
            fetchCustomer();
        } else {
            setError("Invalid Customer ID provided.");
            setLoading(false);
        }

        return () => {
            if (referralSearchTimeout) clearTimeout(referralSearchTimeout);
            if (channelPartnerSearchTimeout) clearTimeout(channelPartnerSearchTimeout);
        };
    }, [customerId]);

    useEffect(() => {
        const loadServiceAgents = async () => {
            setLoadingServiceAgents(true);
            try {
                const agents = await serviceAgentApi.getServiceAgents();
                console.log('Fetched service agents:', agents);
                setServiceAgents(agents);
            } catch (error) {
                console.error('Error loading service agents:', error);
                setError('Failed to load service agents');
            } finally {
                setLoadingServiceAgents(false);
            }
        };

        loadServiceAgents();
    }, []);

    const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        if (name) {
            setCustomer(prev => prev ? { ...prev, [name]: value } : null);
            if (validationErrors[name]) {
                setValidationErrors(prev => ({ ...prev, [name]: '' }));
            }
        }
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = event.target;
        if (name && customer) {
            setCustomer(prev => prev ? ({ ...prev, [name]: checked }) : null);
            if (validationErrors[name]) { setValidationErrors(prev => ({ ...prev, [name]: '' })); }
            if (name === 'AllowPortalAccess' && !checked) {
                setNewPassword('');
                if (validationErrors.Password) { setValidationErrors(prev => ({ ...prev, Password: '' })); }
            }
        }
    };

    const handleReferralSearch = (searchTerm: string) => {
        if (referralSearchTimeout) {
            clearTimeout(referralSearchTimeout);
        }

        setLoadingReferrals(true);
        setReferralOptions([{ type: 'loading' } as AutocompleteCustomerOption]);

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

    const handleSelectChange = (event: SelectChangeEvent<string>) => {
        const { name, value } = event.target;

        if (name === 'account_owner_id') {
            const selectedAgent = serviceAgents.find(agent => agent.serviceagentid === value);
            console.log('Selected agent:', selectedAgent);
            setCustomer(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    account_owner_id: value || null,
                    account_owner: selectedAgent ? {
                        serviceagentid: selectedAgent.serviceagentid,
                        serviceagentname: selectedAgent.serviceagentname,
                        emailid: selectedAgent.emailid,
                        expertat: selectedAgent.expertat,
                        expert_categories: selectedAgent.expert_categories,
                        clientid: selectedAgent.clientid,
                        companyid: selectedAgent.companyid,
                        status: selectedAgent.status,
                        allowportalaccess: selectedAgent.allowportalaccess,
                        created_at: selectedAgent.created_at,
                        updated_at: selectedAgent.updated_at,
                        created_by: selectedAgent.created_by,
                        updated_by: selectedAgent.updated_by
                    } : null,
                    serviceagentname: selectedAgent?.serviceagentname || ''
                };
            });
        } else if (name === 'Source') {
            setCustomer(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    Source: value,
                    ReferredBy: '',
                    ChannelPartner: ''
                };
            });
            setSelectedReferrer(null);
            setSelectedChannelPartner(null);

            if (value !== 'Referral' && validationErrors.ReferredBy) {
                setValidationErrors(v => ({ ...v, ReferredBy: '' }));
            }
            if (value !== 'Channel Partner/Relative' && validationErrors.ChannelPartner) {
                setValidationErrors(v => ({ ...v, ChannelPartner: '' }));
            }
        } else {
            setCustomer(prev => prev ? { ...prev, [name]: value } : null);
        }

        if (validationErrors[name]) {
            setValidationErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleChannelPartnerSearch = (searchTerm: string) => {
        if (channelPartnerSearchTimeout) {
            clearTimeout(channelPartnerSearchTimeout);
        }

        setLoadingChannelPartners(true);
        setChannelPartnerOptions([{ type: 'loading' } as AutocompleteCustomerOption]);

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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!customer) return;

        setSaving(true);
        const currentValidationErrors: Record<string, string> = {};
        setError(null);
        setSuccess(null);

        const isLeadType = ['Lead', 'Disqualified Lead'].includes(customer.CustomerType);
        const isActiveType = ['Active', 'Dormant', 'New'].includes(customer.CustomerType);
        const isChannelPartnerSource = customer.Source === 'Channel Partner/Relative';

        if (!customer.FirstName?.trim()) currentValidationErrors.FirstName = 'First Name is required.';
        if (!customer.LastName?.trim()) currentValidationErrors.LastName = 'Last Name is required.';
        if (!customer.CustomerType) currentValidationErrors.CustomerType = 'Customer Type is required.';
        if (!customer.Source) currentValidationErrors.Source = 'Source is required.';

        if (!isChannelPartnerSource && (customer.EmailVerified || isActiveType || customer.Email?.trim())) {
            if (!customer.Email?.trim()) {
                currentValidationErrors.Email = customer.EmailVerified
                    ? 'Email is required when Email Verified is checked'
                    : 'Email is required for this customer type';
            } else if (!/\S+@\S+\.\S+/.test(customer.Email)) {
                currentValidationErrors.Email = 'Please enter a valid email address';
            }
        }

        if (!isChannelPartnerSource && (customer.MobileVerified || isActiveType || customer.Phone?.trim())) {
            if (!customer.Phone?.trim()) {
                currentValidationErrors.Phone = customer.MobileVerified
                    ? 'Phone is required when Mobile Verified is checked'
                    : 'Phone is required for this customer type';
            } else if (!/^\d{10}$/.test(customer.Phone)) {
                currentValidationErrors.Phone = 'Phone must be exactly 10 digits';
            }
        }

        if (isLeadType && !isChannelPartnerSource && !customer.Email?.trim() && !customer.Phone?.trim()) {
            const msg = 'Either Email or Phone is required for Leads (unless Channel Partner source).';
            currentValidationErrors.Email = msg;
            currentValidationErrors.Phone = msg;
        }

        if (customer.Source === 'Referral' && !customer.ReferredBy) {
            currentValidationErrors.ReferredBy = 'Referred By selection is required.';
        }
        if (customer.Source === 'Channel Partner/Relative' && !customer.ChannelPartner) {
            currentValidationErrors.ChannelPartner = 'Channel Partner selection is required.';
        }
        if (customer.PANCard && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(customer.PANCard.toUpperCase())) {
            currentValidationErrors.PANCard = 'Invalid PAN format.';
        }

        if (Object.keys(currentValidationErrors).length > 0) {
            setValidationErrors(currentValidationErrors);
            setSaving(false);
            setError("Please correct the errors highlighted below.");
            return;
        }

        const updateData: Partial<Customer> & { Password?: string } = {
            FirstName: customer.FirstName, LastName: customer.LastName, CustomerType: customer.CustomerType,
            Source: customer.Source, Email: customer.Email, Phone: customer.Phone,
            AadharCard: customer.AadharCard, PANCard: customer.PANCard, AllowPortalAccess: customer.AllowPortalAccess,
            EmailVerified: customer.EmailVerified || false,
            MobileVerified: customer.MobileVerified || false,
            ReferredBy: customer.ReferredBy || '',
            ChannelPartner: customer.ChannelPartner || '',
            account_owner_id: customer.account_owner_id,
        };
        if (newPassword) { updateData.Password = newPassword; }

        try {
            const idToUpdate = customer.CustomerID ?? customer.id;
            if (!idToUpdate) throw new Error("Customer ID missing for update");

            console.log("Submitting update data:", updateData);
            await customerApi.updateCustomer(idToUpdate, updateData as Customer);
            setSuccess('Customer updated successfully!');
            setTimeout(() => router.push('/customers'), 1500);
        } catch (err: unknown) {
            console.error("Update failed:", err);
            let errorMessage = 'Failed to update customer. Please try again.';
            let backendErrors: Record<string, string> | null = null;
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const response = (err as any).response;
                if (response?.data) { backendErrors = response.data.errors || null; errorMessage = response.data.message || errorMessage; }
            } else if (err instanceof Error) { errorMessage = err.message; }
            const combinedErrors = { ...currentValidationErrors, ...(backendErrors || {}) };
            setValidationErrors(combinedErrors);
            setError(Object.keys(combinedErrors).length > 0 ? "Please correct the errors highlighted below." : errorMessage);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        router.push('/customers');
    };

    const handleConvertSuccess = () => {
        setConvertModalOpen(false);
        router.push('/customers');
    };

    if (loading) {
        return (<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 5, minHeight: '400px' }}><CircularProgress /><Typography sx={{ ml: 2 }}>Loading Customer Data...</Typography></Box>);
    }
    if (!customer) {
        return (<Box sx={{ p: 3 }}><Alert severity="error">{error || "Customer data could not be loaded."}</Alert><Button onClick={() => router.push('/customers')} sx={{ mt: 2 }} variant="outlined">Back to Customers</Button></Box>);
    }

    const isLeadType = ['Lead', 'Disqualified Lead'].includes(customer.CustomerType);
    const isActiveType = ['Active', 'Dormant', 'New'].includes(customer.CustomerType);
    const isChannelPartnerSource = customer.Source === 'Channel Partner/Relative';

    return (
        <Box component="main" sx={{ p: 3 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                <MuiLink component={NextLink} href="/customers" underline="hover" color="inherit">
                    Back to Customers
                </MuiLink>
                <Typography color="text.primary">
                    Edit Customer: {customer.FirstName} {customer.LastName}
                </Typography>
            </Breadcrumbs>

            <Paper sx={{ p: 3 }}>
                {success && (<Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>)}
                {error && !Object.values(validationErrors).some(v => !!v) && ( <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert> )}
                {Object.values(validationErrors).some(v => !!v) && (
                    <Alert severity="warning" sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold">Please correct the following errors:</Typography>
                        <ul style={{ marginTop: '8px', marginBottom: '0px', paddingLeft: '20px' }}>
                            {Object.entries(validationErrors).filter(([_, message]) => !!message).map(([field, message]) => (
                                <li key={field}><strong>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong> {message}</li>
                            ))}
                        </ul>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    {isLeadType && (
                        <Box sx={{ mb: 3 }}>
                            <Button variant="contained" color="secondary" startIcon={<PersonAddIcon />} onClick={() => setConvertModalOpen(true)} disabled={saving}>Convert to Customer</Button>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        {/* Row 1: Customer Type & Source */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth error={!!validationErrors.CustomerType}>
                                    <InputLabel id="customer-type-label">Customer Type *</InputLabel>
                                    <Select
                                        labelId="customer-type-label"
                                        id="CustomerType"
                                        name="CustomerType"
                                        value={customer.CustomerType || ''}
                                        label="Customer Type *"
                                        onChange={handleSelectChange}
                                        renderValue={(value) => value || 'None'}
                                        MenuProps={{ PaperProps: { style: { maxHeight: '200px' } } }}
                                    >
                                        {getFilteredCustomerTypes().map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>{validationErrors.CustomerType}</FormHelperText>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth error={!!validationErrors.Source}>
                                    <InputLabel id="source-label">Source *</InputLabel>
                                    <Select
                                        labelId="source-label"
                                        id="Source"
                                        name="Source"
                                        value={customer.Source || ''}
                                        label="Source *"
                                        onChange={handleSelectChange}
                                        renderValue={(value) => value || 'None'}
                                    >
                                        {SOURCE_OPTIONS.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>{validationErrors.Source}</FormHelperText>
                                </FormControl>
                            </Grid>
                        </Grid>

                        {/* Referral Information */}
                        {customer.Source === 'Referral' && (
                            <Grid container spacing={2}>
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
                                            setCustomer(prev => prev ? ({
                                                ...prev,
                                                ReferredBy: value?.Email || ''
                                            }) : null);
                                            if (validationErrors.ReferredBy) {
                                                setValidationErrors(prev => ({ ...prev, ReferredBy: '' }));
                                            }
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
                            </Grid>
                        )}

                        {/* Channel Partner */}
                        {customer.Source === 'Channel Partner/Relative' && (
                            <Box sx={{ mt: 2 }}>
                                <FormControl fullWidth error={!!validationErrors.ChannelPartner}>
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
                                            setCustomer(prev => prev ? ({
                                                ...prev,
                                                ChannelPartner: value?.Email || ''
                                            }) : null);
                                            if (validationErrors.ChannelPartner) {
                                                setValidationErrors(prev => ({ ...prev, ChannelPartner: '' }));
                                            }
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
                                        isOptionEqualToValue={(option, value) => option.emailid === value.emailid}
                                    />
                                </FormControl>
                            </Box>
                        )}

                        {/* Row 3: First Name & Last Name */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField label="First Name *" name="FirstName" value={customer.FirstName || ''} onChange={handleInputChange} error={!!validationErrors.FirstName} helperText={validationErrors.FirstName} required sx={{ width: '100%' }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField label="Last Name *" name="LastName" value={customer.LastName || ''} onChange={handleInputChange} error={!!validationErrors.LastName} helperText={validationErrors.LastName} required sx={{ width: '100%' }} />
                            </Grid>
                        </Grid>

                        {/* Row 4: Email & Phone */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField label={`Email ${isActiveType && !isChannelPartnerSource ? '*' : ''}`} name="Email" type="email" value={customer.Email || ''} onChange={handleInputChange} error={!!validationErrors.Email} helperText={validationErrors.Email} required={isActiveType && !isChannelPartnerSource} sx={{ width: '100%' }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField label={`Phone`} name="Phone" value={customer.Phone || ''} onChange={handleInputChange} error={!!validationErrors.Phone} helperText={validationErrors.Phone} required={false} sx={{ width: '100%' }} />
                            </Grid>
                        </Grid>
                        {isLeadType && !isChannelPartnerSource && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'left', mt: -1.5, ml: 0.5 }}>† Either Email or Phone is required for this customer type/source.</Typography>
                        )}

                        {/* Row 5: Aadhar & PAN */}
                        <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                                <TextField label="Aadhar Card" name="AadharCard" value={customer.AadharCard || ''} onChange={handleInputChange} error={!!validationErrors.AadharCard} helperText={validationErrors.AadharCard} sx={{ width: '100%' }} />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField label="PAN Card" name="PANCard" value={customer.PANCard || ''} onChange={handleInputChange} error={!!validationErrors.PANCard} helperText={validationErrors.PANCard} sx={{ width: '100%' }} />
                            </Grid>
                        </Grid>

                        {/* Account Owner */}
                        <Box sx={{ mt: 2, mb: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel id="account-owner-label">Account Owner</InputLabel>
                                <Select
                                    labelId="account-owner-label"
                                    id="account-owner"
                                    name="account_owner_id"
                                    value={customer?.account_owner_id || ''}
                                    label="Account Owner"
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        console.log('Selected account owner:', value);
                                        setCustomer(prev => {
                                            if (!prev) return null;
                                            return {
                                                ...prev,
                                                account_owner_id: value,
                                                account_owner: serviceAgents.find(agent => agent.serviceagentid === value) || null,
                                                serviceagentname: serviceAgents.find(agent => agent.serviceagentid === value)?.serviceagentname || ''
                                            };
                                        });
                                    }}
                                    disabled={loadingServiceAgents}
                                >
                                    <MenuItem value="">None</MenuItem>
                                    {Array.isArray(serviceAgents) && serviceAgents.map((agent) => (
                                        <MenuItem key={agent.serviceagentid} value={agent.serviceagentid}>
                                            {agent.serviceagentname}
                                        </MenuItem>
                                    ))}
                                </Select>
                                <FormHelperText>Assign an account owner to this customer</FormHelperText>
                            </FormControl>
                        </Box>

                        {/* Verification Status */}
                        <Box sx={{ mt: 1, mb: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Verification Status</Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                name="EmailVerified"
                                                checked={!!customer.EmailVerified}
                                                onChange={(e) => {
                                                    handleCheckboxChange(e);
                                                    if (!e.target.checked && !isActiveType) {
                                                        setValidationErrors(prev => {
                                                            const { Email, ...rest } = prev;
                                                            return rest;
                                                        });
                                                    }
                                                }}
                                            />
                                        }
                                        label="Email Verified"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                name="MobileVerified"
                                                checked={!!customer.MobileVerified}
                                                onChange={(e) => {
                                                    handleCheckboxChange(e);
                                                    if (!e.target.checked && !isActiveType) {
                                                        setValidationErrors(prev => {
                                                            const { Phone, ...rest } = prev;
                                                            return rest;
                                                        });
                                                    }
                                                }}
                                            />
                                        }
                                        label="Mobile Verified"
                                    />
                                </Grid>
                            </Grid>
                        </Box>

                        {/* Portal Access & Password */}
                        <Box sx={{ mt: 1 }}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        name="AllowPortalAccess"
                                        checked={!!customer.AllowPortalAccess}
                                        onChange={handleCheckboxChange}
                                    />
                                }
                                label="Allow Portal Access"
                            />
                            {customer.AllowPortalAccess && (
                                <Box sx={{ pl: 4, mt: 1, maxWidth: '400px' }}>
                                    <TextField
                                        label="Set New Password"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => {
                                            setNewPassword(e.target.value);
                                            if (validationErrors.Password) {
                                                setValidationErrors(prev => ({ ...prev, Password: '' }));
                                            }
                                        }}
                                        fullWidth
                                        error={!!validationErrors.Password}
                                        helperText={validationErrors.Password || (customer.Password ? 'Leave blank to keep current password' : 'Leave blank if no password is needed yet.')}
                                    />
                                </Box>
                            )}
                        </Box>

                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>* Required field {isLeadType && !isChannelPartnerSource && '| † See Email/Phone note above'}</Typography>

                        {/* Action Buttons */}
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" onClick={handleCancel} disabled={saving}>Cancel</Button>
                            <Button type="submit" variant="contained" color="primary" disabled={saving || loading} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : null}> {saving ? 'Saving...' : 'Save Changes'} </Button>
                        </Box>
                    </Box>
                </form>
            </Paper>

            {/* Lead Conversion Modal */}
            {customer && (
                <ConvertLeadModalNew open={convertModalOpen} customer={customer} onClose={() => setConvertModalOpen(false)} onSuccess={handleConvertSuccess} />
            )}
        </Box>
    );
};

export default EditCustomerScreen;