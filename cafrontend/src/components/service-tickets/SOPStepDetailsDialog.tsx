import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Alert,
  Link,
  Chip,
  Grid,
  Paper
} from '@mui/material';
import { 
  Description as DescriptionIcon, 
  Assignment as AssignmentIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { SOPStep } from '@/types/sop';
import { sopApi } from '@/services/api/sopApi';

interface SOPStepDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  sopStep: SOPStep | number | null;
  taskName: string;
}

const SOPStepDetailsDialog: React.FC<SOPStepDetailsDialogProps> = ({
  open,
  onClose,
  sopStep,
  taskName
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepDetails, setStepDetails] = useState<SOPStep | null>(null);

  useEffect(() => {
    const fetchStepDetails = async () => {
      // If sopStep is already a SOPStep object, use it directly
      if (sopStep && typeof sopStep !== 'number') {
        setStepDetails(sopStep);
        return;
      }
      
      // If sopStep is a number, fetch the details
      if (sopStep && typeof sopStep === 'number') {
        setLoading(true);
        setError(null);
        try {
          const response = await sopApi.getSOPStep(sopStep);
          setStepDetails(response);
        } catch (err) {
          console.error('Error fetching SOP step details:', err);
          setError('Failed to load SOP step details. Please try again later.');
        } finally {
          setLoading(false);
        }
      }
    };

    if (open) {
      fetchStepDetails();
    }
  }, [open, sopStep]);

  const handleDocumentClick = () => {
    if (stepDetails?.URL) {
      window.open(stepDetails.URL, '_blank');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: 24,
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <AssignmentIcon />
        <Typography variant="h6" component="div">
          {taskName || 'SOP Step Details'}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" p={3}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : !stepDetails ? (
          <Alert severity="info">No SOP step details available for this task.</Alert>
        ) : (
          <Box>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <DescriptionIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Step Information</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>Step Name:</strong> {stepDetails.StepName}
                  </Typography>
                  
                  <Typography variant="body1" paragraph>
                    <strong>Comments:</strong> {stepDetails.Comments || 'No comments provided'}
                  </Typography>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <ScheduleIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Duration:</strong> {stepDetails.Duration} minutes
                    </Typography>
                  </Box>
                  
                  <Chip 
                    label={`Sequence: ${stepDetails.Sequence}`} 
                    size="small" 
                    color="primary" 
                    sx={{ mt: 1, mb: 2 }}
                  />
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ArrowBackIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">Prerequisites</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2">
                    {stepDetails.Prerequisites || 'No prerequisites specified'}
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default', height: '100%' }}>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ArrowForwardIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle1">Postrequisites</Typography>
                  </Box>
                  <Divider sx={{ mb: 2 }} />
                  <Typography variant="body2">
                    {stepDetails.Postrequisites || 'No postrequisites specified'}
                  </Typography>
                </Paper>
              </Grid>
              
              {stepDetails.URL && (
                <Grid item xs={12}>
                  <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Box display="flex" alignItems="center" mb={1}>
                      <AttachFileIcon color="primary" sx={{ mr: 1 }} />
                      <Typography variant="subtitle1">Attached Document</Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Link
                      component="button"
                      variant="body2"
                      onClick={handleDocumentClick}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                    >
                      <AttachFileIcon fontSize="small" />
                      {stepDetails.OriginalFileName || 'View Document'}
                    </Link>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SOPStepDetailsDialog;
