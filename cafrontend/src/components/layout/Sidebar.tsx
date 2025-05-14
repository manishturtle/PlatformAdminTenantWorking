import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Drawer as MuiDrawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  styled,
  useTheme,
  Theme,
  CSSObject,
  CssBaseline,
  Typography,
  Snackbar,
} from '@mui/material';

// Icons
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  PeopleAlt as PeopleAltIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';

import { checkModuleAccess } from '../../my_features';

// Define the drawer width
const drawerWidth = 240;

// Styled components for the drawer
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

interface SidebarProps {
  open: boolean;
  handleDrawerOpen: () => void;
  handleDrawerClose: () => void;
}

// Navigation items with their routes and icons
const navigationItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/', moduleKey: 'dashboard'},
  { text: 'Customers', icon: <PeopleIcon />, path: '/customers', moduleKey: 'customers' },
  { text: 'Service Tickets', icon: <AssignmentIcon />, path: '/servicetickets', moduleKey: 'servicetickets' },
  { text: 'Documents', icon: <DescriptionIcon />, path: '/documents/list', moduleKey: 'documents' },
  { text: 'Configuration', icon: <SettingsIcon />, path: '/configuration', moduleKey: 'configuration' },
  { text: 'Login Config', icon: <SettingsIcon />, path: '/login-config', moduleKey: 'login-config' },
  { text: 'Role Management', icon: <AdminPanelSettingsIcon />, path: '/role-management', moduleKey: 'role-management' },
  { text: 'User Management', icon: <PeopleAltIcon />, path: '/user-management', moduleKey: 'user-management' },
];

const Sidebar: React.FC<SidebarProps> = ({ open, handleDrawerOpen, handleDrawerClose }) => {
  const theme = useTheme();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Handle navigation
  const handleNavigation = async (path: string, moduleKey: string) => {
    try {
      // Skip access check for dashboard
      if (moduleKey === 'dashboard') {
        router.push(path);
        return;
      }

      const result = await checkModuleAccess(moduleKey);
      if (result.hasAccess) {
        router.push(path);
      } else {
        setError(result.message || "You don't have access to this module");
        setSnackbarOpen(true);
      }
    } catch (error) {
      setError('Error checking module access');
      setSnackbarOpen(true);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <MuiDrawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            [theme.breakpoints.up('sm')]: {
              width: open ? drawerWidth : theme.spacing(9),
            },
            [theme.breakpoints.down('sm')]: {
              width: open ? drawerWidth : theme.spacing(7),
            }
          },
        }}
        variant="permanent"
        open={open}
      >
        <DrawerHeader>
          {open ? (
            <IconButton onClick={handleDrawerClose}>
              {theme.direction === 'rtl' ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          ) : (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerOpen}
              edge="start"
              sx={{
                mx: 'auto',
              }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </DrawerHeader>
        <List>
          {navigationItems.map((item, index) => (
            <ListItem key={index} disablePadding sx={{ display: 'block' }}>
              <ListItemButton
                sx={{
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                }}
                onClick={() => handleNavigation(item.path, item.moduleKey)}
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
                <ListItemText primary={item.text} sx={{ opacity: open ? 1 : 0 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </MuiDrawer>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        message={error}
      />
    </Box>
  );
};

export default Sidebar;
