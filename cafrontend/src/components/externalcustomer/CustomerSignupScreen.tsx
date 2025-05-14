import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { portalApi } from '@/services/portalApi';
import PortalLogin from '../layouts/PortalLogin';

interface ValidationErrors {
    FirstName?: string;
    LastName?: string;
    Phone?: string;
    Password?: string;
}

const CustomerSignupScreen: React.FC = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        Email: '',
        Password: '',
        FirstName: '',
        LastName: '',
        Phone: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [loading, setLoading] = useState(false);

    // Initialize email from session storage
    useEffect(() => {
        const storedEmail = sessionStorage.getItem('signupEmail');
        if (!storedEmail) {
            router.replace('/customers/login');
            return;
        }
        setFormData(prev => ({ ...prev, Email: storedEmail }));
    }, [router]);

    const validateForm = (): boolean => {
        const errors: ValidationErrors = {};
        let isValid = true;

        if (!formData.FirstName.trim()) {
            errors.FirstName = 'First Name is required';
            isValid = false;
        }

        if (!formData.LastName.trim()) {
            errors.LastName = 'Last Name is required';
            isValid = false;
        }

        if (!formData.Phone.trim()) {
            errors.Phone = 'Phone number is required';
            isValid = false;
        } else if (!/^\+?[\d\s-]{10,}$/.test(formData.Phone.trim())) {
            errors.Phone = 'Please enter a valid phone number';
            isValid = false;
        }

        if (!formData.Password) {
            errors.Password = 'Password is required';
            isValid = false;
        } else if (formData.Password.length < 8) {
            errors.Password = 'Password must be at least 8 characters long';
            isValid = false;
        }

        setValidationErrors(errors);
        return isValid;
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (validationErrors[name as keyof ValidationErrors]) {
            setValidationErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setLoading(true);
        setError('');

        try {
            console.log('Submitting signup form with data:', {
                ...formData,
                Password: formData.Password ? '***' : undefined
            });

            const response = await portalApi.signup({
                Email: formData.Email,
                Password: formData.Password,
                FirstName: formData.FirstName,
                LastName: formData.LastName,
                Phone: formData.Phone
            });

            setLoading(false);
            console.log('Signup response:', response);

            if (response.message === 'OTP sent successfully.') {
                // Store email for OTP verification
                sessionStorage.setItem('signupEmail', formData.Email);
                // Set OTP as requested to prevent duplicate requests
                sessionStorage.setItem('otpRequested', 'true');
                sessionStorage.setItem('lastOTPRequestTime', Date.now().toString());
                console.log('Stored email in sessionStorage:', formData.Email);

                // Redirect to OTP verification page
                router.push('/portal/otp?mode=signup');
            } else {
                setError('Failed to send OTP. Please try again.');
            }
        } catch (error: any) {
            setLoading(false);
            if (error.response?.data?.message) {
                setError(error.response.data.message);
            } else if (error.response?.data?.errors) {
                // Handle field-specific errors
                const errorMessages = Object.values(error.response.data.errors).flat();
                setError(errorMessages.join('\n'));
            } else {
                setError('An error occurred during signup. Please try again.');
            }
        }
    };

    const handleBack = () => {
        // Clear signup email
        sessionStorage.removeItem('signupEmail');
        router.push('/portal/login');
    };

    return (
        <PortalLogin title="Create Account">
            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    width: '100%',
                    maxWidth: '600px',
                    margin: '0 auto'
                }}
            >
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    Create Your Account
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                    <TextField
                        fullWidth
                        label="Email Address"
                        value={formData.Email}
                        disabled
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <TextField
                            label="First Name *"
                            name="FirstName"
                            value={formData.FirstName}
                            onChange={handleInputChange}
                            error={!!validationErrors.FirstName}
                            helperText={validationErrors.FirstName}
                            disabled={loading}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            label="Last Name *"
                            name="LastName"
                            value={formData.LastName}
                            onChange={handleInputChange}
                            error={!!validationErrors.LastName}
                            helperText={validationErrors.LastName}
                            disabled={loading}
                            sx={{ flex: 1 }}
                        />
                    </Box>

                    <TextField
                        fullWidth
                        label="Phone Number *"
                        name="Phone"
                        value={formData.Phone}
                        onChange={handleInputChange}
                        error={!!validationErrors.Phone}
                        helperText={validationErrors.Phone}
                        disabled={loading}
                        placeholder="+91 XXXXX XXXXX"
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        type={showPassword ? 'text' : 'password'}
                        label="Password *"
                        name="Password"
                        value={formData.Password}
                        onChange={handleInputChange}
                        error={!!validationErrors.Password}
                        helperText={validationErrors.Password || 'Must be at least 8 characters'}
                        disabled={loading}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            )
                        }}
                        sx={{ mb: 3 }}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                            disabled={loading}
                            fullWidth
                        >
                            Back
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </Button>
                    </Box>
            </Box>
        </PortalLogin>
    );
};

export default CustomerSignupScreen;
