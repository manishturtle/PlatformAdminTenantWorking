"use client";
import React from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Business as BusinessIcon,
  Settings as SettingsIcon,
  Apps as AppsIcon,
  Assignment as PlansIcon,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const drawerWidth = 240;
const closedDrawerWidth = 56; // Width when drawer is collapsed

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  userType: 'platform-admin' | 'tenant-admin';
  isAuthenticated: boolean;
  isLoginPage?: boolean;
}

export default function SideDrawer({ open, onClose, userType, isAuthenticated, isLoginPage = false }: SideDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();

  // Define menu items based on user type
  const menuItems = userType === 'platform-admin' 
    ? [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/platform-admin' },
        { text: 'Tenants', icon: <BusinessIcon />, path: '/platform-admin/tenants' },
        { text: 'CRM Clients', icon: <PeopleIcon />, path: '/platform-admin/crmclients' },
        { text: 'Plans', icon: <PlansIcon />, path: '/platform-admin/plans' },
        { text: 'Features', icon: <SettingsIcon />, path: '/platform-admin/features' },
        { text: 'Applications', icon: <AppsIcon />, path: '/platform-admin/applications' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/platform-admin/settings' },
      ]
    : [
        { text: 'Dashboard', icon: <DashboardIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/dashboard` },
        { text: 'User Management', icon: <PeopleIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/users` },
        { text: 'Login Config', icon: <SettingsIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/login-config` },
      ];

  // Don't render drawer if not authenticated or on login page (but allow for login-config)
  if (!isAuthenticated || (isLoginPage && !pathname?.includes('/login-config'))) {
    return null;
  }

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? open : true}
      onClose={isMobile ? onClose : undefined}
      sx={{
        width: open ? drawerWidth : closedDrawerWidth,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : closedDrawerWidth,
          boxSizing: 'border-box',
          marginTop: '64px',
          overflowX: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <List sx={{ pt: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
            <Link href={item.path} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
              <ListItemButton
                selected={pathname === item.path}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  sx={{ opacity: open ? 1 : 0 }} 
                />
              </ListItemButton>
            </Link>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
