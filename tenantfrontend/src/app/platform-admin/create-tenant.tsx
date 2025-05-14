import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert } from '@mui/material';
import AddBusinessIcon from '@mui/icons-material/AddBusiness';

export default function CreateTenantPage() {
  const [tenantName, setTenantName] = useState('');
  const [domain, setDomain] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call backend API to create tenant
    setSuccess(true);
    setTenantName('');
    setDomain('');
  };

  return (
    <Box maxWidth={500} mx="auto" mt={8}>
      <Card elevation={6}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <AddBusinessIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" fontWeight="bold">Create Tenant</Typography>
          </Box>
          {success && <Alert severity="success" sx={{ mb: 2 }}>Tenant created successfully!</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Tenant Name"
              value={tenantName}
              onChange={e => setTenantName(e.target.value)}
              fullWidth
              required
              margin="normal"
              variant="outlined"
            />
            <TextField
              label="Domain"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              fullWidth
              required
              margin="normal"
              variant="outlined"
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              sx={{ mt: 2, fontWeight: 'bold' }}
            >
              Create Tenant
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
