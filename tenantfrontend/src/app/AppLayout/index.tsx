'use client';

import React, { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

// Dynamically import client-only components with ssr: false
const TopNav = dynamic(() => import('./TopNav'), { ssr: false });
const SideNav = dynamic(() => import('./SideNav'), { ssr: false });

interface AppLayoutProps {
  children: React.ReactNode;
  userType?: 'platform-admin' | 'tenant-admin' | string;
}

// Constants
const DRAWER_WIDTH = 240;
const COLLAPSED_DRAWER_WIDTH = 64;
const TOPBAR_HEIGHT = 64;

export default function AppLayout({ children, userType = 'tenant-admin' }: AppLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Get current pathname to determine if we're on a login page
  const pathname = usePathname();
  const isLoginPage = pathname?.includes('/login');

  // Add style to prevent layout shift from modal dialogs
useEffect(() => {
  // Add a style to the root HTML element to prevent layout shifts
  document.documentElement.style.setProperty('overflow-y', 'scroll');
  
  return () => {
    // Clean up when component unmounts
    document.documentElement.style.removeProperty('overflow-y');
  };
}, []);

useEffect(() => {
    // Check for mobile only on the client side
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 600);
    };
    
    // Set initial values
    checkMobile();
    setIsDrawerOpen(!isMobile);
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [isMobile]);
  
  // Check authentication status
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
  }, []);

  const handleDrawerToggle = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Hide navigation components on login pages */}
      {!isLoginPage && (
        <>
          {/* Fixed TopNav */}
          <TopNav 
            onMenuClick={handleDrawerToggle} 
            isDrawerOpen={isDrawerOpen} 
          />
          
          {/* Collapsible SideNav below TopNav */}
          <SideNav 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)}
            userType={userType}
            isAuthenticated={isAuthenticated}
            isLoginPage={isLoginPage}
          />
        </>
      )}
      
      <Box
        component="main"
        role="main"
        aria-label="Main content"
        sx={(theme) => ({
          flexGrow: 1,
          p: 3,
          // Adjust top margin only for pages with navigation
          mt: isLoginPage ? 0 : `${TOPBAR_HEIGHT}px`,
          ml: { xs: 0 },
          width: {
            xs: '100%',
            // Only account for drawer width when not on login page and drawer is showing
            sm: !isLoginPage ? `calc(100% - ${isDrawerOpen ? DRAWER_WIDTH : COLLAPSED_DRAWER_WIDTH}px)` : '100%'
          },
          maxWidth: '100%',
          marginRight: 'auto',
          paddingRight: { xs: 3, sm: 4 },
          paddingLeft: { xs: 3, sm: 4 },
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
          overflowX: 'hidden',
          boxSizing: 'border-box',
        })}
      >
        <Box sx={{ 
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          maxWidth: '1400px',
          margin: '0 auto',
          transition: (theme) => theme.transitions.create('opacity', {
            duration: theme.transitions.duration.shortest,
          }),
        }}>
          <Box sx={{ 
            width: '100%',
            animation: isDrawerOpen ? 'none' : 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0.9 },
              '100%': { opacity: 1 }
            }
          }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
