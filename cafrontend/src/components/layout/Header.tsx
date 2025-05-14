import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, styled } from '@mui/material';
import { useRouter } from 'next/router';
import { logout } from '../../services/auth';
import MenuIcon from '@mui/icons-material/Menu';
import IconButton from '@mui/material/IconButton';

interface HeaderProps {
  open?: boolean;
}

const drawerWidth = 240;

const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: 'black',
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Header: React.FC<HeaderProps> = ({ open }) => {
  const router = useRouter();

  const handleLogout = () => {
    logout(); // Clear the auth token
    router.push('/login'); // Redirect to login page
  };

  return (
    <StyledAppBar position="fixed" open={open}>
      <Toolbar>
        {/* Left: Company Name */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          SHAH M V & ASSOCIATES
        </Typography>

        {/* Middle: Application Name */}
        <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
          <Typography variant="h6" component="div">
            Software4CA
          </Typography>
        </Box>

        {/* Right: Logout Button */}
        <Button color="inherit" onClick={handleLogout}>
          Logout
        </Button>
      </Toolbar>
    </StyledAppBar>
  );
};

export default Header;
