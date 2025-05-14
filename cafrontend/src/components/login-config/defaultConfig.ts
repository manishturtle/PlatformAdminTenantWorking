import { LoginPageConfig } from './types';

export const defaultLoginConfig: LoginPageConfig = {
  companyName: 'Your Company',
  logo: {
    altText: 'Company Logo',
  },
  theme: 'light',
  content: {
    title: 'Welcome Back',
    subtitle: 'Please sign in to continue',
    welcomeMessage: ' 2024 Your Company. All rights reserved.',
  },
  layout: {
    logoSize: 'medium',
    alignment: 'center',
    maxWidth: '400px',
  },
  socialLogin: {
    enabled: false,
    providers: {
      google: false,
      facebook: false,
      twitter: false,
    },
  },
  additionalFeatures: {
    rememberMe: true,
    forgotPassword: true,
    signUp: true,
  },
  colors: {
    primaryColor: '#1976d2',
    backgroundColor: '#ffffff',
    textColor: '#000000',
  },
  font: {
    family: 'Roboto, sans-serif',
    size: '16px',
    weight: '400',
  },
  buttonStyle: {
    borderRadius: '4px',
    padding: '8px 16px',
  },
  pageTitle: 'Login',
};
