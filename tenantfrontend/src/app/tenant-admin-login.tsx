import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
} from "@mui/material";
import LockOpenIcon from "@mui/icons-material/LockOpen";

export default function TenantAdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      const response = await fetch(
        "https://bedevcockpit.turtleit.in/api/qa/tenant/auth/login/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid credentials");
      }

      const data = await response.json();

      // Store the token
      localStorage.setItem("token", data.token);

      setSuccess(true);
    } catch (error: any) {
      console.error("Login error:", error);
      setError(error.message || "Failed to login. Please try again.");
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={12}>
      <Card elevation={6}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <LockOpenIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" fontWeight="bold">
              Tenant Admin Login
            </Typography>
          </Box>
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Login successful!
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <form onSubmit={handleSubmit}>
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              required
              margin="normal"
              type="email"
              variant="outlined"
            />
            <TextField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              sx={{ mt: 2, fontWeight: "bold" }}
            >
              Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
