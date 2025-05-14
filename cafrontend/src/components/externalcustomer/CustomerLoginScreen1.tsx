import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { TextField, Button, Typography, Box, Alert } from '@mui/material';
import { portalApi } from '@/services/portalApi';
import PortalLogin from '../layouts/PortalLogin';

interface CustomerLoginScreen1Props {}

const CustomerLoginScreen1: React.FC<CustomerLoginScreen1Props> = () => {
    const router = useRouter();
    const handleBack = () => {
        // Clear session storage before going back
        sessionStorage.removeItem('loginEmail');
        sessionStorage.removeItem('hasPassword');
        router.back();
    };
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter your email address');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await portalApi.checkEmail(email);
            
            if (response.exists) {
                if (response.allowPortalAccess) {
                    if (response.hasPassword && !response.emailVerified) {
                        // If has password but email not verified, go to OTP verification
                        sessionStorage.setItem('loginEmail', email);
                        sessionStorage.setItem('hasPassword', 'true');
                        router.push('/portal/otp?mode=login');
                    } else if (response.hasPassword) {
                        // If has password and email verified, go to password screen
                        sessionStorage.setItem('loginEmail', email);
                        sessionStorage.setItem('hasPassword', 'true');
                        router.push('/portal/password');
                    } else {
                        // If no password, go to OTP page
                        sessionStorage.setItem('loginEmail', email);
                        sessionStorage.setItem('hasPassword', 'false');
                        router.push('/portal/otp?mode=login');
                    }
                } else {
                    setError('Portal access is not enabled for this account. Please contact support.');
                }
            } else {
                // Store email for signup screen
                sessionStorage.setItem('signupEmail', email);
                router.push('/portal/signup');
            }
        } catch (err) {
            console.error('Error checking email:', err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <PortalLogin title="Login">
            <Box
                component="form"
                onSubmit={handleSubmit}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    width: '100%',
                }}
            >
            <Typography variant="h5" component="h1" gutterBottom align="center">
                Customer Portal Login
            </Typography>

            {error && (
                <Alert severity="error">
                    {error}
                </Alert>
            )}

            <TextField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                required
                disabled={loading}
            />

            <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                disabled={loading}
            >
                {loading ? 'Checking...' : 'Continue'}
            </Button>
            </Box>
        </PortalLogin>
    );
};

export default CustomerLoginScreen1;
