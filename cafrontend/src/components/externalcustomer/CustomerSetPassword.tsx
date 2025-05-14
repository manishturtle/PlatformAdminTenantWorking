import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    CircularProgress,
} from '@mui/material';
import { portalApi } from '@/services/portalApi';
import PortalLogin from '../layouts/PortalLogin';

const CustomerSetPassword: React.FC = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Get email from localStorage
        const storedEmail = sessionStorage.getItem('loginEmail');
        if (!storedEmail) {
            router.replace('/portal/login');
            return;
        }
        setEmail(storedEmail);
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate passwords
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Call API to set password
            await portalApi.setPassword(email, password);
            
            // Clear login email from storage
            sessionStorage.removeItem('loginEmail');
            
            // Redirect to dashboard
            router.push('/portal/dashboard');
        } catch (err: any) {
            console.error('Error setting password:', err);
            setError(err.message || 'Failed to set password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSkip = () => {
        // Clear login email from storage
        sessionStorage.removeItem('loginEmail');
        // Redirect to dashboard
        router.push('/portal/dashboard');
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
                gap: 2
            }}>
                <Typography variant="h5" component="h1" align="center" gutterBottom>
                    Set Password
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

                    <TextField
                        fullWidth
                        type="password"
                        label="Set Password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            setError('');
                        }}
                        error={!!error}
                        disabled={loading}
                        sx={{ mb: 2 }}
                    />

                    <TextField
                        fullWidth
                        type="password"
                        label="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            setError('');
                        }}
                        error={!!error}
                        disabled={loading}
                        sx={{ mb: 2 }}
                    />

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={handleSkip}
                            disabled={loading}
                            fullWidth
                        >
                            Skip
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                        >
                            {loading ? 'Setting Password...' : 'Set Password'}
                        </Button>
                    </Box>
                </form>
            </Box>
        </PortalLogin>
    );
};

export default CustomerSetPassword;
