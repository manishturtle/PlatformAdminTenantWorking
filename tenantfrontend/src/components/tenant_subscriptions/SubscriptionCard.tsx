import { Card, CardContent, Box, Typography, Button, Chip, useTheme, Divider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { CloudQueue, AutoAwesome, Campaign, Badge, MoreVert } from '@mui/icons-material';

const StyledCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
  borderRadius: '12px',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
  },
}));

const IconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'bgcolor',
})<{ bgcolor: string }>(({ theme, bgcolor }) => ({
  padding: theme.spacing(1.5),
  backgroundColor: `${bgcolor}1a`,
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  marginRight: theme.spacing(2),
  '& .MuiSvgIcon-root': {
    color: bgcolor,
    fontSize: 20,
  },
}));

const StatusChip = styled(Chip)(({ theme }) => ({
  height: 20,
  fontSize: '0.65rem',
  fontWeight: 500,
  '& .MuiChip-label': {
    padding: '0 6px',
  },
}));

type SubscriptionStatus = 'active' | 'pending' | 'trial' | 'cancelled';

interface SubscriptionCardProps {
  title: string;
  plan: string;
  status: SubscriptionStatus;
  icon: React.ReactNode;
  iconColor: string;
  metrics: Array<{ label: string; value: string }>;
  renewInfo?: string;
  cost?: string;
  showActions?: boolean;
}

export const SubscriptionCard = ({
  title,
  plan,
  status,
  icon,
  iconColor,
  metrics,
  renewInfo,
  cost,
  showActions = true,
}: SubscriptionCardProps) => {
  const theme = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case 'active':
        return { bg: theme.palette.success.light, text: theme.palette.success.dark };
      case 'pending':
        return { bg: theme.palette.warning.light, text: theme.palette.warning.dark };
      case 'trial':
        return { bg: theme.palette.info.light, text: theme.palette.info.dark };
      case 'cancelled':
        return { bg: theme.palette.grey[300], text: theme.palette.grey[700] };
      default:
        return { bg: theme.palette.grey[300], text: theme.palette.grey[700] };
    }
  };

  const statusColors = getStatusColor();
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <StyledCard>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box display="flex" alignItems="center">
            <IconWrapper bgcolor={iconColor}>
              {icon}
            </IconWrapper>
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                {title}
              </Typography>
              <Box display="flex" alignItems="center" mt={0.5}>
                <Typography variant="body2" color="text.secondary" mr={1}>
                  {plan}
                </Typography>
                <StatusChip
                  label={statusText}
                  size="small"
                  sx={{
                    backgroundColor: statusColors.bg,
                    color: statusColors.text,
                  }}
                />
              </Box>
            </Box>
          </Box>
          <Button size="small" color="inherit">
            <MoreVert />
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(120px, 1fr))" gap={2} mb={3}>
          {metrics.map((metric, index) => (
            <Box key={index}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {metric.label}
              </Typography>
              <Typography variant="subtitle2" fontWeight={600}>
                {metric.value}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box mt={3}>
          <Box display="flex" justifyContent="center" gap={2} flexWrap="wrap">
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ 
                textTransform: 'none',
                minWidth: 120
              }}
            >
              Manage Users
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              sx={{ 
                textTransform: 'none',
                minWidth: 120
              }}
            >
              Change Plan
            </Button>
            <Button 
              variant="outlined" 
              size="small" 
              color="error" 
              sx={{ 
                textTransform: 'none',
                minWidth: 120
              }}
            >
              Cancel
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary" textAlign="center" mt={2}>
            {renewInfo && <span>{renewInfo}</span>}
            {renewInfo && cost && <span> • </span>}
            {cost && <span>Cost: {cost}</span>}
          </Typography>
        </Box>
      </CardContent>
    </StyledCard>
  );
};
