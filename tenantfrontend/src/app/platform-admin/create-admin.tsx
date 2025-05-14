import React, { useState } from 'react';
import { Box, Button, Card, CardContent, TextField, Typography, Alert } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

export default function CreateTenantAdminPage() {
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Call backend API to create tenant admin
    setSuccess(true);
    setAdminName('');
    setEmail('');
    setPassword('');
  };

  return (
    <Box maxWidth={500} mx="auto" mt={8}>
      <Card elevation={6}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" fontWeight="bold">Create Tenant Admin</Typography>
          </Box>
          {success && <Alert severity="success" sx={{ mb: 2 }}>Tenant Admin created successfully!</Alert>}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Admin Name"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              fullWidth
              required
              margin="normal"
              variant="outlined"
            />
            <TextField
              label="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
              type="email"
              variant="outlined"
            />
            <TextField
              label="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              required
              margin="normal"
              type="password"
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
              Create Admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
