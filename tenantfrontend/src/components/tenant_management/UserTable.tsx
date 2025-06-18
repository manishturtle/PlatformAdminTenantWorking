import React, { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import AppsIcon from '@mui/icons-material/Apps';
import WidgetsIcon from '@mui/icons-material/Widgets';
import DashboardCustomizeIcon from '@mui/icons-material/DashboardCustomize';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';

export interface User {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: 'active' | 'inactive' | 'invited' | 'suspended';
  role: string;
  applications: Array<{
    id: string | number;
    name: string;
    icon: React.ReactNode;
    color: string;
  }>;
  lastLogin?: string;
}

interface UserTableProps {
  users: User[];
  onEditUser: (userId: string | number) => void;
  onDeleteUser: (userId: string | number) => void;
  onSuspendUser?: (userId: string | number) => void;
}

const getStatusChipProps = (status: User['status']) => {
  switch (status) {
    case 'active':
      return { color: 'success', bg: '#e8f5e9', textColor: '#2e7d32' };
    case 'invited':
      return { color: 'warning', bg: '#fff8e1', textColor: '#f57f17' };
    case 'inactive':
      return { color: 'default', bg: '#f5f5f5', textColor: '#757575' };
    case 'suspended':
      return { color: 'error', bg: '#ffebee', textColor: '#c62828' };
    default:
      return { color: 'default', bg: '#f5f5f5', textColor: '#757575' };
  }
};

/**
 * A table component for displaying and managing users
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  onEditUser,
  onDeleteUser,
  onSuspendUser,
}) => {
  const [anchorEl, setAnchorEl] = useState<Record<string | number, HTMLElement | null>>({});

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, userId: string | number) => {
    setAnchorEl({ ...anchorEl, [userId]: event.currentTarget });
  };

  const handleCloseMenu = (userId: string | number) => {
    setAnchorEl({ ...anchorEl, [userId]: null });
  };

  const formatLastLogin = (lastLogin?: string) => {
    if (!lastLogin) return 'Never';
    
    const now = new Date();
    const loginDate = new Date(lastLogin);
    const diffTime = Math.abs(now.getTime() - loginDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return diffHours > 0 ? `${diffHours} hours ago` : 'Just now';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return loginDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getAppIcon = (appName: string) => {
    const iconMap: Record<string, { icon: React.ReactNode; color: string }> = {
      'CRM': { icon: <AppsIcon fontSize="small" />, color: '#1976d2' },
      'Analytics': { icon: <WidgetsIcon fontSize="small" />, color: '#4caf50' },
      'Dashboard': { icon: <DashboardCustomizeIcon fontSize="small" />, color: '#9c27b0' },
      'Marketing': { icon: <GridViewIcon fontSize="small" />, color: '#f44336' },
      'HR': { icon: <ViewQuiltIcon fontSize="small" />, color: '#ff9800' },
    };

    return iconMap[appName] || { icon: <AppsIcon fontSize="small" />, color: '#757575' };
  };

  return (
    <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}>
      <Table aria-label="user management table">
        <TableHead sx={{ backgroundColor: '#f5f7fa' }}>
          <TableRow>
            <TableCell sx={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500 }}>User</TableCell>
            <TableCell sx={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500 }}>Status</TableCell>
            <TableCell sx={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500 }}>Role</TableCell>
            <TableCell sx={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500 }}>Assigned Apps</TableCell>
            <TableCell sx={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500 }}>Last Login</TableCell>
            <TableCell sx={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 500 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => {
            const statusProps = getStatusChipProps(user.status);
            
            return (
              <TableRow key={user.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Avatar 
                      alt={`${user.firstName} ${user.lastName}`} 
                      src={user.avatarUrl} 
                      sx={{ width: 32, height: 32, mr: 1.5 }}
                    />
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="text.primary">
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.status.charAt(0).toUpperCase() + user.status.slice(1)} 
                    size="small"
                    sx={{ 
                      backgroundColor: statusProps.bg,
                      color: statusProps.textColor,
                      fontWeight: 500,
                      fontSize: '0.65rem',
                      height: 20,
                      borderRadius: '9999px',
                      '& .MuiChip-label': { px: 1.5 }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ color: 'text.primary', fontWeight: 400 }}>
                  {user.role}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {user.applications.map((app) => (
                      <Box key={app.id} sx={{ color: app.color }}>
                        {app.icon}
                      </Box>
                    ))}
                  </Box>
                </TableCell>
                <TableCell sx={{ color: 'text.primary' }}>
                  {formatLastLogin(user.lastLogin)}
                </TableCell>
                <TableCell>
                  <IconButton 
                    size="small" 
                    onClick={(e) => handleOpenMenu(e, user.id)}
                    sx={{ color: 'text.secondary' }}
                  >
                    <MoreHorizIcon fontSize="small" />
                  </IconButton>
                  <Menu
                    anchorEl={anchorEl[user.id] || null}
                    open={Boolean(anchorEl[user.id])}
                    onClose={() => handleCloseMenu(user.id)}
                    transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                    anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                  >
                    <MenuItem onClick={() => { handleCloseMenu(user.id); onEditUser(user.id); }}>
                      <ListItemIcon>
                        <EditIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Edit User</ListItemText>
                    </MenuItem>
                    {onSuspendUser && (
                      <MenuItem onClick={() => { handleCloseMenu(user.id); onSuspendUser(user.id); }}>
                        <ListItemIcon>
                          <BlockIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Suspend User</ListItemText>
                      </MenuItem>
                    )}
                    <MenuItem 
                      onClick={() => { handleCloseMenu(user.id); onDeleteUser(user.id); }}
                      sx={{ color: 'error.main' }}
                    >
                      <ListItemIcon sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Delete User</ListItemText>
                    </MenuItem>
                  </Menu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default UserTable;
