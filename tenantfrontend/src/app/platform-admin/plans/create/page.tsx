'use client';
import { Grid, Container, Typography, Paper } from '@mui/material';
import CreatePlanForm from '../CreatePlanForm';
import { useRouter } from 'next/navigation';
import { plansService } from '../plans.service';

export default function CreatePlanPage() {
  const router = useRouter();

  const handleCancel = () => {
    router.push('/platform-admin/plans');
  };

  const handleSubmit = async (formData: any) => {
    try {
      await plansService.createPlan(formData);
      router.push('/platform-admin/plans');
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <CreatePlanForm onSubmit={handleSubmit} onCancel={handleCancel} />
    </Container>
  );
}
