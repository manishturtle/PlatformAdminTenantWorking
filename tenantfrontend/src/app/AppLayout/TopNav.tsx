'use client';

import {
  AppBar,
  IconButton,
  Toolbar,
  Typography,
  useTheme,
  Menu,
  MenuItem,
  Box,
  Tooltip,
  Avatar,
  Divider,
  alpha,
} from '@mui/material';
import { 
  Menu as MenuIcon
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useThemeContext } from '@/theme/ThemeContext';

interface TopNavProps {
  onMenuClick: () => void;
  isDrawerOpen: boolean;
}

export default function TopNav({ onMenuClick, isDrawerOpen }: TopNavProps) {
  const theme = useTheme();
  const { fontFamily } = useThemeContext();
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        transition: (theme) => theme.transitions.create(['width', 'margin'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        boxShadow: 'none',
        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        backgroundColor: (theme) => 
          theme.palette.mode === 'light' 
            ? theme.palette.background.paper
            : theme.palette.background.paper,
      }}
    >
      <Toolbar component="nav" role="navigation" aria-label="Main navigation">
        <IconButton
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ 
            mr: 2,
            color: theme.palette.text.primary
          }}
        >
          <MenuIcon />
        </IconButton>
        <Typography 
          variant="h6" 
          noWrap 
          component="div" 
          sx={{ 
            flexGrow: 1,
            color: theme.palette.text.primary,
            fontFamily: fontFamily === 'underdog' ? '"Underdog", cursive' : undefined
          }}
        >
          <Box component="img" src="/turtle-brand.png" alt="Logo" sx={{ height: 60 }} />
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          
          {/* User menu */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleUserMenuOpen}
              sx={{ 
                ml: 2,
                color: theme.palette.text.primary
              }}
              aria-controls={Boolean(userMenuAnchor) ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={Boolean(userMenuAnchor) ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>U</Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            id="account-menu"
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            PaperProps={{
              elevation: 3,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                width: 180,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleUserMenuClose}>Profile</MenuItem>
            <MenuItem onClick={handleUserMenuClose}>Settings</MenuItem>
            <Divider />
            <MenuItem onClick={handleUserMenuClose}>Logout</MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
