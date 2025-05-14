import React from 'react';
import Head from 'next/head';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Badge,
  useTheme,
  Tabs,
  Tab,
  Button
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/router';
import { 
  Description as DescriptionIcon,
  Timeline as TimelineIcon,
  Receipt as ReceiptIcon,
  Announcement as AnnouncementIcon,
  Feedback as FeedbackIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Logout as LogoutIcon
} from '@mui/icons-material';

interface PortalLayoutProps {
  children: React.ReactNode;
  title?: string;
  currentPath?: string;
}

interface MenuTab {
  label: string;
  icon: React.ReactNode;
  path: string;
}

const AppBarStyled = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#1a237e', // Dark blue
  color: '#ffffff',
  boxShadow: theme.shadows[4],
}));

const MainContent = styled('main')(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  marginTop: 112, // Height of AppBar + Tabs
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
}));

const StyledTabs = styled(Tabs)(({ theme }) => ({
  backgroundColor: '#f5f5f5', // Light gray
  '& .MuiTab-root': {
    color: '#000000',
    minHeight: 48,
    textTransform: 'none',
  },
  '& .Mui-selected': {
    color: '#1a237e', // Dark blue to match header
  },
  '& .MuiTabs-indicator': {
    backgroundColor: '#1a237e', // Dark blue to match header
  }
}));

const menuTabs: MenuTab[] = [
  { label: 'ITR Requests', icon: <DescriptionIcon />, path: '/portal/requests' },
  { label: 'Timeline', icon: <TimelineIcon />, path: '/portal/timeline' },
  { label: 'Invoices & Payments', icon: <ReceiptIcon />, path: '/portal/invoices' },
  { label: 'Announcements', icon: <AnnouncementIcon />, path: '/portal/announcements' },
  { label: 'Feedback', icon: <FeedbackIcon />, path: '/portal/feedback' },
];

const PortalLayout = ({ children, title = 'Customer Portal', currentPath = '/' }: PortalLayoutProps) => {
  const theme = useTheme();
  const router = useRouter();

  const handleLogout = () => {
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    // Redirect to login
    router.push('/portal/login');
  };

  const currentTabIndex = menuTabs.findIndex(tab => tab.path === currentPath);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    router.push(menuTabs[newValue].path);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Head>
        <title>{title} - TurtleSoft</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <AppBarStyled position="fixed">
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Tax Portal
          </Typography>
          <IconButton sx={{ color: '#ffffff' }}>
            <Badge badgeContent={4} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton sx={{ color: '#ffffff' }}>
            <SettingsIcon />
          </IconButton>
          <Button
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
            sx={{ ml: 2, color: '#ffffff' }}
          >
            Logout
          </Button>
        </Toolbar>
        <StyledTabs
          value={currentTabIndex !== -1 ? currentTabIndex : 0}
          onChange={handleTabChange}
          variant="fullWidth"
          aria-label="navigation tabs"
        >
          {menuTabs.map((tab, index) => (
            <Tab
              key={tab.path}
              icon={tab.icon}
              label={tab.label}
              sx={{
                minWidth: 120,
                '& .MuiSvgIcon-root': {
                  color: '#000000',
                  marginBottom: 0.5
                }
              }}
            />
          ))}
        </StyledTabs>
      </AppBarStyled>

      <MainContent>
        {children}
      </MainContent>
    </Box>
  );
};

export default PortalLayout;
