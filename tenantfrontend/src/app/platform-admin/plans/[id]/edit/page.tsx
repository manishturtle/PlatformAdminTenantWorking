'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { Plan } from '@/types/Plan';
import { plansService } from '../../plans.service';
import CreatePlanForm from '../../CreatePlanForm';

export default function EditPlanPage(): JSX.Element {
  const params = useParams();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const planData = await plansService.getPlanById(params.id as string);
        
        // Convert ISO date strings to Date objects
        planData.valid_from = new Date(planData.valid_from);
        if (planData.valid_until) {
          planData.valid_until = new Date(planData.valid_until);
        }

        // Initialize detailed_entitlements if not present
        planData.detailed_entitlements = planData.detailed_entitlements || {};
        
        // Map application features to detailed_entitlements if they exist
        if (planData.applications) {
          // Set the selected apps
          const selectedAppIds = planData.applications.map((app: any) => app.application);
          planData.selectedApps = selectedAppIds;

          // Map features to detailed_entitlements
          planData.applications.forEach((app: any) => {
            app.features.forEach((feature: any) => {
              planData.detailed_entitlements[feature.id] = {
                granual_settings: feature.granual_settings
              };
            });
          });
        }
        setPlan(planData);
      } catch (error) {
        console.error('Error fetching plan:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPlan();
    }
  }, [params.id]);

  const handleSubmit = async (formData: Plan) => {
    try {
      await plansService.updatePlan(params.id as string, formData);
      router.push('/platform-admin/plans');
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!plan) {
    return (
      <Typography variant="h6" color="error">
        Plan not found
      </Typography>
    );
  }

  const handleCancel = () => {
    router.push('/platform-admin/plans');
  };

  return (
    <Paper sx={{ p: 4 }}>
      <Typography variant="h5" mb={4}>
        Edit Plan: {plan.name}
      </Typography>
      <CreatePlanForm 
        initialData={plan} 
        onSubmit={handleSubmit} 
        onCancel={handleCancel}
        isEditMode 
      />
    </Paper>
  );
}
