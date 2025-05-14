import React from 'react';
import { AppBar, Toolbar, Typography, Box, Container, Button } from '@mui/material';
import Link from 'next/link';
import { isAuthenticated, isPlatformAdmin, isTenantAdmin, logoutUser } from '@/services/authService';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const [isPlatformAdminUser, setIsPlatformAdminUser] = React.useState(false);
  const [isTenantAdminUser, setIsTenantAdminUser] = React.useState(false);

  React.useEffect(() => {
    // Check authentication status on client side
    setIsLoggedIn(isAuthenticated());
    setIsPlatformAdminUser(isPlatformAdmin());
    setIsTenantAdminUser(isTenantAdmin());
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/platform-admin/login');
  };

  return (
    <AppBar position="static" color="primary" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component={Link}
            href="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontWeight: 700,
              color: 'white',
              textDecoration: 'none',
            }}
          >
            {title || 'Turtle Tenant Management'}
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            {isLoggedIn && (
              <>
                {isPlatformAdminUser && (
                  <Button
                    component={Link}
                    href="/platform-admin"
                    sx={{ my: 2, color: 'white', display: 'block' }}
                  >
                    Dashboard
                  </Button>
                )}
                {isPlatformAdminUser && (
                  <Button
                    component={Link}
                    href="/platform-admin/tenants"
                    sx={{ my: 2, color: 'white', display: 'block' }}
                  >
                    Tenants
                  </Button>
                )}
                {isPlatformAdminUser && (
                  <Button
                    component={Link}
                    href="/platform-admin/crmclients"
                    sx={{ my: 2, color: 'white', display: 'block' }}
                  >
                    CRM Clients
                  </Button>
                )}
                {isTenantAdminUser && (
                  <Button
                    component={Link}
                    href="/tenant-admin"
                    sx={{ my: 2, color: 'white', display: 'block' }}
                  >
                    Tenant Admin
                  </Button>
                )}
              </>
            )}
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            {isLoggedIn ? (
              <Button
                onClick={handleLogout}
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Logout
              </Button>
            ) : (
              <Button
                component={Link}
                href="/platform-admin/login"
                sx={{ my: 2, color: 'white', display: 'block' }}
              >
                Login
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
