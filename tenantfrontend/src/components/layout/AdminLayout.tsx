"use client";
import React, { useState, ReactNode, useEffect } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  useMediaQuery,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import SideDrawer from './SideDrawer';

const drawerWidth = 240;
const closedDrawerWidth = 56; // Width when drawer is collapsed

interface AdminLayoutProps {
  children: ReactNode;
  userType: 'platform-admin' | 'tenant-admin';
}

export default function AdminLayout({ children, userType }: AdminLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Check if user is authenticated and if current page is a login page
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setIsAuthenticated(!!token);
  }, []);
  
  // Check if current path is a login page (but not login-config)
  const isLoginPage = pathname?.includes('/login') && !pathname?.includes('/login-config');

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

    return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Only show AppBar if not on a login page */}
      {!isLoginPage && (
        <AppBar
          position="fixed"
          sx={{
            width: '100%',
            zIndex: (theme) => theme.zIndex.drawer + 1,
          }}
        >
          <Toolbar>
            {isAuthenticated && (
              <IconButton
                color="inherit"
                aria-label="open drawer"
                edge="start"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 0, mr: 4 }}>
              Turtle Tenant Management
            </Typography>
            
            {/* Horizontal navigation - only show when authenticated */}
            {/* {isAuthenticated} */}
            
            <Box sx={{ flexGrow: 1 }} />
            
            {isAuthenticated ? (
              <>
                <Button 
                  color="inherit" 
                  onClick={handleLogout}
                  sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}
                >
                  Logout
                </Button>
                
                <IconButton
                  size="large"
                  edge="end"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleProfileMenuOpen}
                  color="inherit"
                  sx={{ ml: 1 }}
                >
                  <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                    <AccountCircleIcon />
                  </Avatar>
                </IconButton>
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                      <LogoutIcon fontSize="small" />
                    </ListItemIcon>
                    Logout
                  </MenuItem>
                </Menu>
              </>
            ) : !isLoginPage && (
              <Button 
                color="inherit" 
                component={Link} 
                href="/login"
                sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}
              >
                Login
              </Button>
            )}
          </Toolbar>
        </AppBar>
      )}
      
      {/* Side drawer component - only rendered when authenticated */}
      <SideDrawer 
        open={open} 
        onClose={handleDrawerToggle} 
        userType={userType} 
        isAuthenticated={isAuthenticated} 
        isLoginPage={isLoginPage}
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: '100%',
          mt: '64px',
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
