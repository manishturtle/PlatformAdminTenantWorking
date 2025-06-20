import { Box, Typography, Button, Card, CardContent, Chip, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';

interface Metric {
  label: string;
  value: string | number;
}

interface UsersInfo {
  current: number;
  total: number;
}

interface SubscriptionCardProps {
  icon: React.ReactNode;
  iconBgColor?: string;
  iconColor?: string;
  title: string;
  plan: string;
  description?: string;
  status: 'active' | 'inactive' | 'trial' | 'suspended' | 'pending' | 'cancelled' | 'pending upgrade';
  metrics?: Metric[];
  users?: UsersInfo;
  appUrl?: string;
}

const StyledCard = styled(Card)({
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  transition: 'box-shadow 0.3s ease',
  '&:hover': {
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
  },
});

const StatusChip = styled(Chip)(({ theme }) => ({
  height: 20,
  fontSize: '0.65rem',
  fontWeight: 500,
  marginLeft: theme.spacing(1.5),
  '& .MuiChip-label': {
    paddingLeft: 8,
    paddingRight: 8,
  },
}));

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  icon,
  iconBgColor = '#e3f2fd',
  iconColor = '#1976d2',
  title,
  plan,
  description,
  status,
  metrics = [],
  users,
  appUrl,
}) => {
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
        return { 
          bg: '#f5f5f5', 
          text: '#616161', 
          label: status.charAt(0).toUpperCase() + status.slice(1) 
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <StyledCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
          <Box>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                mb: 0.5, 
                fontSize: '0.75rem', 
                fontWeight: 500, 
                textTransform: 'uppercase', 
                letterSpacing: '0.5px' 
              }}
            >
              APPLICATION
            </Typography>
            <Typography 
              variant="h6" 
              component="div" 
              fontWeight={600} 
              sx={{ 
                mb: 1.5, 
                fontSize: '1.125rem' 
              }}
            >
              {title}
            </Typography>
            <Box display="flex" alignItems="center" sx={{ mb: 1.5 }}>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mr: 1, 
                  fontSize: '0.875rem' 
                }}
              >
                Plan:
              </Typography>
              <Typography 
                variant="body2" 
                fontWeight={500} 
                sx={{ 
                  fontSize: '0.875rem' 
                }}
              >
                {plan}
              </Typography>
              <StatusChip
                label={statusInfo.label}
                size="small"
                sx={{
                  backgroundColor: statusInfo.bg,
                  color: statusInfo.text,
                }}
              />
            </Box>
            {description && (
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  fontSize: '0.875rem', 
                  lineHeight: 1.5 
                }}
              >
                {description}
              </Typography>
            )}
          </Box>
          
          <Box 
            sx={{ 
              backgroundColor: iconBgColor, 
              borderRadius: '8px',
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              color: iconColor,
              flexShrink: 0,
              '& .MuiSvgIcon-root': {
                fontSize: '1.5rem',
              }
            }}
          >
            {icon}
          </Box>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box mt={3}>
          <Box 
            display="grid" 
            gridTemplateColumns={{ 
              xs: '1fr', 
              sm: 'repeat(3, 1fr)' 
            }} 
            gap={3}
          >
            {metrics.map((metric: Metric, index: number) => (
              <Box key={index}>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  display="block" 
                  sx={{ 
                    mb: 0.5, 
                    fontSize: '0.75rem' 
                  }}
                >
                  {metric.label}
                </Typography>
                <Typography 
                  variant="body1" 
                  fontWeight={500} 
                  sx={{ 
                    fontSize: '0.9375rem' 
                  }}
                >
                  {metric.value}
                </Typography>
              </Box>
            ))}
            {users && (
              <Box>
                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  display="block" 
                  sx={{ 
                    mb: 0.5, 
                    fontSize: '0.75rem' 
                  }}
                >
                  Users
                </Typography>
                <Typography 
                  variant="body1" 
                  fontWeight={500} 
                  sx={{ 
                    fontSize: '0.9375rem' 
                  }}
                >
                  {users.current} / {users.total}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
        
        <Box mt={3} display="flex" gap={2} flexWrap="wrap">
          {appUrl && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ 
                textTransform: 'none',
                borderRadius: '4px',
                px: 2,
                py: 0.75,
                fontSize: '0.8125rem',
                fontWeight: 500,
                boxShadow: 'none',
                backgroundColor: iconColor,
                '&:hover': {
                  boxShadow: 'none',
                  backgroundColor: iconColor ? `${iconColor}dd` : undefined,
                }
              }}
            >
              GO_TO_APP
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            sx={{ 
              textTransform: 'none',
              borderRadius: '4px',
              px: 2,
              py: 0.75,
              fontSize: '0.8125rem',
              fontWeight: 500,
              borderColor: 'rgba(0, 0, 0, 0.23)',
              '&:hover': {
                borderColor: 'rgba(0, 0, 0, 0.5)',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              }
            }}
          >
            Manage Users
          </Button>
          <Button
            variant="outlined"
            size="small"
            sx={{ 
              textTransform: 'none',
              borderRadius: '4px',
              px: 2,
              py: 0.75,
              fontSize: '0.8125rem',
              fontWeight: 500,
              borderColor: 'rgba(0, 0, 0, 0.23)',
              '&:hover': {
                borderColor: 'rgba(0, 0, 0, 0.5)',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
              }
            }}
          >
            Change Plan
          </Button>
        </Box>
      </CardContent>
    </StyledCard>
  );
};
