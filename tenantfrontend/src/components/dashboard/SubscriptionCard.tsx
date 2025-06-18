import { Box, Typography, Button, Card, CardContent, Chip, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
}));

const IconWrapper = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: '8px',
  width: 'fit-content',
  height: 'fit-content',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    fontSize: 24,
  },
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  height: 20,
  fontSize: '0.65rem',
  fontWeight: 500,
  marginLeft: theme.spacing(1),
}));

type SubscriptionCardProps = {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  plan: string;
  status: 'active' | 'inactive' | 'trial' | 'suspended' | 'pending' | 'cancelled' | 'pending upgrade';
  metrics?: Array<{
    label: string;
    value: string;
  }>;
  // For backwards compatibility with dashboard page
  users?: {
    current: number;
    total: number;
  };
  color?: string; // For backwards compatibility
  renewInfo?: string;
  cost?: string;
  upgradeInfo?: {
    effective: string;
    cost: string;
  };
};

export const SubscriptionCard = ({
  icon,
  iconBgColor = '#e3f2fd', // default blue light background
  iconColor = '#1976d2',   // default blue color
  title,
  plan,
  status,
  metrics,
  users,
  color,
  upgradeInfo,
  renewInfo,
  cost,
}: SubscriptionCardProps) => {
  // Generate status colors based on status
  const getStatusInfo = () => {
    switch (status.toLowerCase()) {
      case 'active':
        return { bg: '#e8f5e9', text: '#2e7d32', label: 'Active' };
      case 'trial':
        return { bg: '#fff8e1', text: '#f57f17', label: 'Trial' };
      case 'pending upgrade':
        return { bg: '#fff8e1', text: '#f57f17', label: 'Pending upgrade' };
      case 'cancelled':
        return { bg: '#f5f5f5', text: '#616161', label: 'Cancelled' };
      default:
        return { bg: '#f5f5f5', text: '#616161', label: status.charAt(0).toUpperCase() + status.slice(1) };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <StyledCard>
      <CardContent sx={{ p: 6 }}>
        {/* Header Section */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={4}>
          {/* Left: Icon and Title */}
          <Box display="flex" alignItems="center" mb={1}>
            <IconWrapper sx={{ backgroundColor: iconBgColor }}>
              <Box sx={{ color: iconColor }}>{icon}</Box>
            </IconWrapper>
            <Box>
              <Typography variant="h6" fontWeight={600} color="text.primary">
                {title}
              </Typography>
              <Box display="flex" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {plan}
                </Typography>
                <StatusChip 
                  label={statusInfo.label}
                  size="small"
                  sx={{
                    backgroundColor: statusInfo.bg,
                    color: statusInfo.text,
                    '& .MuiChip-label': {
                      px: 1,
                      py: 0.25,
                    },
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* Right: Action Buttons */}
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{ 
                textTransform: 'none',
                borderRadius: 1,
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Manage Users
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{ 
                textTransform: 'none',
                borderRadius: 1,
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: 500,
                borderColor: 'rgba(0, 0, 0, 0.23)'
              }}
            >
              Change Plan
            </Button>
            <Button
              variant="text"
              color="error"
              size="small"
              sx={{ 
                textTransform: 'none',
                px: 2,
                py: 1,
                fontSize: '0.875rem',
                fontWeight: 500
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
        
        {/* Metrics Grid */}
        <Grid container spacing={4} sx={{ mb: 4 }}>
          {metrics && metrics.map((metric, index) => (
            <Grid key={index.toString()} sx={{ gridColumn: { xs: '1 / span 12', sm: '1 / span 6', md: '1 / span 4' } }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>
                {metric.label}
              </Typography>
              <Typography variant="body1" color="text.primary">
                {metric.value}
              </Typography>
            </Grid>
          ))}
          {users && (
            <Grid sx={{ gridColumn: { xs: '1 / span 12', sm: '1 / span 6', md: '1 / span 4' } }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500} mb={0.5}>
                Users Assigned
              </Typography>
              <Typography variant="body1" color="text.primary">
                {users.current}/{users.total}
              </Typography>
            </Grid>
          )}
        </Grid>
        
        {/* Footer Information */}
        <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
          {upgradeInfo ? (
            <>
              Upgrade effective: {upgradeInfo.effective} 
              <span style={{ margin: '0 8px' }}>|</span> 
              New cost: {upgradeInfo.cost}
            </>
          ) : (
            <>
              {renewInfo} 
              {cost && (
                <>
                  <span style={{ margin: '0 8px' }}>|</span> 
                  Cost: {cost}
                </>
              )}
            </>
          )}
        </Typography>
      </CardContent>
    </StyledCard>
  );
};
