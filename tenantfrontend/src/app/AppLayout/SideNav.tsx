'use client';

import { useState, useCallback, useTransition, useMemo } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  ListItemButton,
  Tooltip,
  alpha,
  CircularProgress,
  Box,
  Collapse,
  TextField,
  InputAdornment,
  Typography,
  Divider,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  PeopleOutlined as PeopleIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Search as SearchIcon,
  Business as BusinessIcon,
  SecurityOutlined,
  AdminPanelSettingsOutlined,
  ColorLens,
  ReceiptOutlined as ReceiptIcon,
  Apps as AppsIcon,
  ArticleOutlined as PlansIcon, // Using ArticleOutlined for Plans
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';

// Combined props from both components
interface SideNavProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'platform-admin' | 'tenant-admin' | string;
  isAuthenticated: boolean;
  isLoginPage?: boolean;
}

interface MenuItem {
  text: string;
  path: string;
  icon: React.ReactNode;
}

interface MenuSection {
  title: string;
  icon?: React.ReactNode;
  items: MenuItem[];
}

export default function SideNav({ isOpen, onClose, userType, isAuthenticated, isLoginPage = false }: SideNavProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const router = useRouter();
  const pathname = usePathname();
  // Extract tenant slug from URL path if present
  const tenantSlug = pathname?.split('/')?.[1] || '';
  const [isPending, startTransition] = useTransition();
  const [activeNavPath, setActiveNavPath] = useState<string | null>(pathname || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({
    'Platform Admin': true,
    'Tenant Admin': true,
  });

  // Logic from SideDrawer to define menu items based on userType
  const menuSections: MenuSection[] = useMemo(() => {
    const tenantSlug = pathname?.split('/')[1] || '';
    console.log('user_type:::', userType);
    if (userType === 'platform-admin') {
      return [{
        title: 'Platform Admin',
        icon: <AdminPanelSettingsOutlined />,
        items: [
           { text: 'Dashboard', icon: <DashboardIcon />, path: '/platform-admin' },
                 { text: 'Tenants', icon: <BusinessIcon />, path: '/platform-admin/tenants' },
                 { text: 'CRM Clients', icon: <PeopleIcon />, path: '/platform-admin/crmclients' },
                 { text: 'Plans', icon: <PlansIcon />, path: '/platform-admin/plans' },
                 { text: 'Features', icon: <SettingsIcon />, path: '/platform-admin/features' },
                 { text: 'Applications', icon: <AppsIcon />, path: '/platform-admin/applications' },
                 { text: 'Lines of Business', icon: <BusinessIcon />, path: '/platform-admin/lines-of-business' },
                 { text: 'Settings', icon: <SettingsIcon />, path: '/platform-admin/settings' },
        ]
      }];
    } else {
      // Default to tenant-admin navigation
      return [{
        title: 'Tenant Admin',
        icon: <AdminPanelSettingsOutlined />,
        items: [
          { text: 'Dashboard', icon: <DashboardIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/dashboard` },
                 { text: 'User Management', icon: <PeopleIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/users` },
                 { text: 'Billing & Invoicing', icon: <ReceiptIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/billing-invoicing` },
                 { text: 'Subscription', icon: <ReceiptIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/subscription` },
                 { text: 'Settings', icon: <SettingsIcon />, path: `/${pathname?.split('/')[1]}/tenant-admin/login-config` },
                // { text: 'Theme Configuration', icon: <ColorLens />, path: `/${pathname?.split('/')[1]}/tenant-admin/theme-configuration` },
        ]
      }];
    }
  }, [userType, pathname]);

  

  // Toggle section open state
  const toggleSectionOpenState = (title: string): void => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  // Navigation handler
  const handleNavigation = useCallback((e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>, path: string) => {
    // Prevent default anchor behavior
    e.preventDefault();
    
    // Force active navigation path for visual feedback even if not authenticated
    setActiveNavPath(path);
    
    if (!isAuthenticated && !isLoginPage) {
      // If not authenticated and not on login page, redirect to login
      const baseLoginPath = userType === 'platform-admin' 
        ? '/platform-admin/login' 
        : `/${tenantSlug || 'demo'}/tenant-admin/login`;
      
      console.log('Not authenticated, redirecting to:', baseLoginPath);
      router.push(baseLoginPath);
      return;
    }
    
    // Use router navigation
    console.log('Navigating to path:', path);
    
    // Make sure the path is absolute
    const absolutePath = path.startsWith('/') ? path : `/${path}`;
    router.push(absolutePath);
    
    // Only close drawer if it's on mobile
    if (isMobile) {
      onClose();
    }
  }, [isMobile, onClose, router, isAuthenticated, isLoginPage, userType, tenantSlug]);

  // Filter menu items based on search query
  const filteredMenuSections = useMemo(() => {
    if (!searchQuery) return menuSections;
    
    return menuSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => 
          item.text.toLowerCase().includes(searchQuery.toLowerCase())
        )
      }))
      .filter(section => section.items.length > 0);
  }, [menuSections, searchQuery]);

  // Render each section with its menu items
  const renderSection = (section: MenuSection) => {
    const isOpen = openSections[section.title] !== false; // Default to open if not specified
    
    return (
      <div key={section.title}>
        <ListItem disablePadding>
          <ListItemButton 
            onClick={() => toggleSectionOpenState(section.title)}
            sx={{
              transition: theme.transitions.create(['background-color'], {
                duration: theme.transitions.duration.shortest,
              }),
            }}
          >
            {section.icon && (
              <ListItemIcon sx={{ minWidth: 36 }}>
                {section.icon}
              </ListItemIcon>
            )}
            <ListItemText primary={section.title} />
            {isOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        
        <Collapse in={isOpen} timeout="auto">
          <List disablePadding>
            {section.items.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  onClick={(e) => handleNavigation(e, item.path)}
                  selected={pathname === item.path || activeNavPath === item.path}
                  component="a"
                  href={item.path}
                  sx={{ 
                    pl: 4,
                    position: 'relative',
                    borderLeft: (pathname === item.path || activeNavPath === item.path) ? 
                      `3px solid ${theme.palette.primary.main}` : 'none',
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.1),
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.15),
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: 2,
                      color: pathname === item.path 
                        ? theme.palette.primary.main 
                        : theme.palette.text.secondary,
                    }}
                  >
                    {isPending && activeNavPath === item.path ? 
                      <CircularProgress size={20} color="primary" /> : 
                      item.icon
                    }
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
      </div>
    );
  };

  const drawerWidth = isOpen ? 240 : 0;

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      open={isOpen}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          overflowX: 'hidden',
          marginTop: '64px', // Height of the AppBar
          height: 'calc(100% - 64px)', // Subtract AppBar height
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      <Box
        role="navigation"
        aria-label="Sidebar navigation"
        sx={{ 
          width: '100%',
          overflowY: 'auto',
          height: '100%',
          display: 'flex', 
          flexDirection: 'column',
          background: theme.palette.background.paper,
        }}
      >
        {/* Search box */}
        <Box sx={{ p: 2, position: 'sticky', top: 0, zIndex: 1, background: theme.palette.background.paper }}>
          <TextField
            fullWidth
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search menu..."
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            aria-label="Search navigation menu"
            sx={{ 
              '.MuiOutlinedInput-root': {
                borderRadius: theme.shape.borderRadius,
              } 
            }}
          />
        </Box>
        
        <Divider />
        
        {/* Navigation sections */}
        <List component="nav" sx={{ width: '100%', p: 0.5 }}>
          {filteredMenuSections.map(renderSection)}
        </List>
      </Box>
    </Drawer>
  );
}
