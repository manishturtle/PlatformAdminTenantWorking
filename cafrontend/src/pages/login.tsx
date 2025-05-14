import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import LoginScreen from '../components/auth/LoginScreen';
import { isTokenValid, logout } from '../services/auth';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Redirect to customer page if already logged in and router is ready
  useEffect(() => {
    try {
      // Only redirect if router is ready to prevent errors
      if (router.isReady) {
        if (isTokenValid()) {
          router.push('/customers/');
        }
        setCheckingAuth(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      logout(); // Clear any invalid tokens
      setCheckingAuth(false);
    }
    // Add router.isReady to dependency array
  }, [router.isReady, router]); 

  return (
    <>
      <Head>
        <title>Login | Software4CA</title>
        <meta name="description" content="Login to Software4CA" />
      </Head>
      <LoginScreen />
    </>
  );
};

export default LoginPage;
