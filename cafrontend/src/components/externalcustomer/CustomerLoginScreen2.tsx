import React, { useState, useEffect, useCallback } from 'react';
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

const CustomerLoginScreen2: React.FC = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [hasPassword, setHasPassword] = useState(false);
    const [countdown, setCountdown] = useState(0);

    // Function to request OTP
    const handleRequestOtp = useCallback(async () => {
        if (countdown > 0) return;
        
        const storedEmail = sessionStorage.getItem('loginEmail');
        if (!storedEmail) {
            setError('Email not found. Please go back to login.');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            // Just redirect to OTP page, let it handle the OTP request
            router.push('/portal/otp?mode=login');
        } catch (err) {
            console.error('Error navigating to OTP page:', err);
            setError('Failed to navigate to OTP page. Please try again.');
            setLoading(false);
        }
    }, [router, countdown]);

    // Check if user has password and initialize email from sessionStorage
    useEffect(() => {
        const storedEmail = sessionStorage.getItem('loginEmail');
        const storedHasPassword = sessionStorage.getItem('hasPassword');
        
        if (!storedEmail) {
            router.replace('/portal/login');
            return;
        }
        
        setEmail(storedEmail);
        setHasPassword(storedHasPassword === 'true');

        // If user doesn't have password, request OTP immediately
        if (storedHasPassword === 'false') {
            handleRequestOtp();
        }
    }, [router]);

    // Countdown timer for OTP resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let response;
            if (hasPassword) {
                if (!password.trim()) {
                    setError('Please enter your password');
                    return;
                }
                response = await portalApi.login(email, password);
            } else {
                if (!otp.trim()) {
                    setError('Please enter the OTP');
                    return;
                }
                response = await portalApi.verifyOtp(email, otp);
            }

            // Store authentication token and user info
            localStorage.setItem('authToken', response.token);
            if (response.user) {
                localStorage.setItem('userInfo', JSON.stringify(response.user));
            }
            
            // Clear all temporary storage
            sessionStorage.removeItem('loginEmail');
            sessionStorage.removeItem('signupEmail');
            sessionStorage.removeItem('otpRequested');
            sessionStorage.removeItem('hasPassword');
            
            // Redirect to dashboard
            router.push('/portal/dashboard');
        } catch (err) {
            console.error('Authentication failed:', err);
            setError(hasPassword ? 
                'Invalid password. Please try again.' : 
                'Invalid OTP. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        router.push('/portal/login');
        sessionStorage.removeItem('loginEmail');
    };

    return (
        <PortalLogin>
            <Box sx={{
                width: '100%',
                maxWidth: 400,
                mx: 'auto',
                p: 3,
                display: 'flex',
                flexDirection: 'column',
            }}>
                <Typography variant="h5" component="h1" gutterBottom align="center">
                    {hasPassword ? 'Enter Password' : 'Enter OTP'}
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

                    {hasPassword ? (
                        <TextField
                            fullWidth
                            type="password"
                            label="Password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            error={!!error}
                            disabled={loading}
                            sx={{ mb: 2 }}
                        />
                    ) : (
                        <>
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
                        </>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
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
                            {loading 
                                ? (hasPassword ? 'Logging in...' : 'Verifying...') 
                                : (hasPassword ? 'Login' : 'Verify OTP')}
                        </Button>
                    </Box>

                    {hasPassword && (
                        <Typography variant="body2" align="center">
                            Forgot password?{' '}
                            <Link
                                component="button"
                                type="button"
                                onClick={handleRequestOtp}
                                disabled={loading || countdown > 0}
                            >
                                {countdown > 0 
                                    ? `Request OTP in ${countdown}s` 
                                    : 'Login with OTP'}
                            </Link>
                        </Typography>
                    )}
                </form>
            </Box>
        </PortalLogin>
    );
};

export default CustomerLoginScreen2;
