import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Link
} from '@mui/material';
import { portalApi } from '@/services/portalApi';
import PortalLogin from '../layouts/PortalLogin';

interface Props {
    mode: 'signup' | 'login';
}

const CustomerOTPScreen: React.FC<Props> = ({ mode }) => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [success, setSuccess] = useState('');

    // Initialize email from sessionStorage
    useEffect(() => {
        console.log('OTP Screen initialized. Mode:', mode);
        const storageKey = mode === 'signup' ? 'signupEmail' : 'loginEmail';
        const storedEmail = sessionStorage.getItem(storageKey);
        console.log('Retrieved from sessionStorage:', { key: storageKey, email: storedEmail });

        if (!storedEmail) {
            console.log('No email found in sessionStorage, redirecting to', mode === 'signup' ? '/portal/signup' : '/portal/login');
            router.replace(mode === 'signup' ? '/portal/signup' : '/portal/login');
            return;
        }
        setEmail(storedEmail);

        // Check if countdown is active
        const lastRequestTime = sessionStorage.getItem('lastOTPRequestTime');
        if (lastRequestTime) {
            const elapsedSeconds = Math.floor((Date.now() - parseInt(lastRequestTime)) / 1000);
            if (elapsedSeconds < 60) {
                setCountdown(60 - elapsedSeconds);
                return;
            }
        }

        // Only request OTP in login mode or if not already requested
        // In signup mode, the OTP is already sent during signup
        const otpRequested = sessionStorage.getItem('otpRequested');
        if (mode === 'login' && !otpRequested) {
            handleRequestOtp();
            // Mark OTP as requested to prevent duplicate requests
            sessionStorage.setItem('otpRequested', 'true');
        } else if (mode === 'signup' && otpRequested) {
            // Show success message for signup mode since OTP was already sent
            setSuccess('OTP sent successfully!');
            // Set countdown based on last request time
            const lastRequestTime = sessionStorage.getItem('lastOTPRequestTime');
            if (lastRequestTime) {
                const elapsedSeconds = Math.floor((Date.now() - parseInt(lastRequestTime)) / 1000);
                if (elapsedSeconds < 60) {
                    setCountdown(60 - elapsedSeconds);
                }
            }
        }
    }, [mode]);

    // Countdown timer for OTP resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleRequestOtp = async () => {
        if (countdown > 0) {
            setError(`Please wait ${countdown} seconds before requesting another OTP`);
            return;
        }
        
        const storedEmail = sessionStorage.getItem(mode === 'signup' ? 'signupEmail' : 'loginEmail');
        if (!storedEmail) {
            setError('Email not found. Please try again.');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            await portalApi.requestOTP(storedEmail, mode as 'signup' | 'login');
            sessionStorage.setItem('otpRequested', 'true');
            sessionStorage.setItem('lastOTPRequestTime', Date.now().toString());
            setCountdown(60);
            setSuccess('OTP sent successfully!');
        } catch (err: any) {
            console.error('Error requesting OTP:', err);
            if (err.response?.status === 429) {
                setError('Too many requests. Please wait before requesting another OTP.');
                setCountdown(60); // Force countdown on rate limit
                sessionStorage.setItem('lastOTPRequestTime', Date.now().toString());
            } else {
                setError('Failed to send OTP. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!otp.trim()) {
            setError('Please enter the OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await portalApi.verifyOTP(email, otp);
            
            // Show success message
            setSuccess('OTP verified successfully!');
            
            // Store authentication token
            localStorage.setItem('authToken', response.token);
            if (response.user) {
                localStorage.setItem('userInfo', JSON.stringify(response.user));
            }
            
            // Get hasPassword from sessionStorage before clearing
            const hasPassword = sessionStorage.getItem('hasPassword') === 'true';
            const loginEmail = sessionStorage.getItem('loginEmail');
            
            // Clear all temporary storage except loginEmail if needed for setpassword
            sessionStorage.removeItem('signupEmail');
            sessionStorage.removeItem('otpRequested');
            sessionStorage.removeItem('lastOTPRequestTime');
            
            // Delay to show success message
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            if (!hasPassword && mode === 'login') {
                console.log('User has no password, redirecting to set password...');
                // Keep loginEmail in sessionStorage for set password page
                router.push('/portal/setpassword');
            } else {
                console.log('User has password or signup mode, redirecting to dashboard...');
                // Clear loginEmail as it's not needed
                sessionStorage.removeItem('loginEmail');
                router.push('/portal/dashboard');
            }
        } catch (err: any) {
            console.error('OTP verification failed:', err);
            setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
            setOtp(''); // Clear OTP field on error
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        // Clear stored emails and OTP state
        sessionStorage.removeItem('loginEmail');
        sessionStorage.removeItem('signupEmail');
        sessionStorage.removeItem('otpRequested');
        sessionStorage.removeItem('lastOTPRequestTime');
        router.push('/portal/login'); // Always go back to login page
    };

    return (
        <PortalLogin title={mode === 'signup' ? 'Verify Your Account' : 'Enter OTP'}>
            <Box sx={{ width: '100%' }}>
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    {mode === 'signup' ? 'Verify Your Account' : 'Enter OTP'}
                </Typography>

                <Typography color="textSecondary" align="center" sx={{ mb: 3 }}>
                    {email}
                </Typography>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {success}
                        </Alert>
                    )}

                    <TextField
                        fullWidth
                        label="One-Time Password"
                        value={otp}
                        onChange={(e) => {
                            setOtp(e.target.value);
                            setError('');
                        }}
                        error={!!error}
                        disabled={loading}
                        sx={{ mb: 2 }}
                        inputProps={{
                            maxLength: 6,
                            pattern: '[0-9]*',
                            inputMode: 'numeric'
                        }}
                        placeholder="Enter 6-digit OTP"
                    />

                    <Button
                        variant="text"
                        onClick={handleRequestOtp}
                        disabled={loading || countdown > 0}
                        sx={{ mb: 2 }}
                    >
                        {countdown > 0 
                            ? `Resend OTP in ${countdown}s` 
                            : 'Resend OTP'}
                    </Button>

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
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </Button>
                    </Box>
                </form>
            </Box>
        </PortalLogin>
    );
};

export default CustomerOTPScreen;
