  'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
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
  Container,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { plansService, Plan } from './plans.service';

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const fetchPlans = async () => {
    try {
      const response = await plansService.getPlans();
      setPlans(response.results || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to load plans. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreatePlanClick = () => {
    router.push('/platform-admin/plans/create');
  };

  const handleDeletePlan = async (planId: number) => {
    try {
      await plansService.deletePlan(planId);
      setDeleteSuccess(true);
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      setError('Failed to delete plan. Please try again later.');
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: {
        color: 'success',
        label: 'Active'
      },
      inactive: {
        color: 'default',
        label: 'Inactive'
      },
      deprecated: {
        color: 'error',
        label: 'Deprecated'
      }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.inactive;
    
    return (
      <Chip
        label={config.label}
        color={config.color as 'success' | 'default' | 'error'}
        size="small"
      />
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>Subscription Plans</Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your subscription plans and their features
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleCreatePlanClick}
          size="large"
        >
          Create New Plan
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Plan Name</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Features</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Last Updated</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    <Typography variant="subtitle2">{plan.name}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {plan.description}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(plan.status)}</TableCell>
                  <TableCell>
                    <Chip 
                      label={`${plan.feature_entitlements?.length || 0} features`}
                      size="small"
                      sx={{ bgcolor: 'primary.lighter', color: 'primary.dark' }}
                    />
                  </TableCell>
                  <TableCell>${plan.price}</TableCell>
                  <TableCell>{plan.created_at ? format(new Date(plan.created_at), 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell>{plan.updated_at ? format(new Date(plan.updated_at), 'MMM d, yyyy') : '-'}</TableCell>
                  <TableCell align="right">
                    <Button
                      startIcon={<EditIcon />}
                      onClick={() => router.push(`/platform-admin/plans/${plan.id}/edit`)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      Edit
                    </Button>
                    <IconButton 
                      size="small"
                      color="error"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {plans.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1" color="text.secondary">
                      No plans found. Click the "Create New Plan" button to create your first plan.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar
        open={deleteSuccess}
        autoHideDuration={3000}
        onClose={() => setDeleteSuccess(false)}
      >
        <Alert severity="success">
          Plan deleted successfully
        </Alert>
      </Snackbar>
    </Container>
  );
}
