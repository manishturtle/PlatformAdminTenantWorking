"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Divider,
  CircularProgress,
  Stack,
} from "@mui/material";
import {
  ArrowBack,
  Visibility,
  VisibilityOff,
  Delete,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import PortalEntryForm from "../components/PortalEntryForm";

// Define portal entry interface
interface PortalEntry {
  id?: number;
  name: string;
  url: string;
  description?: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function AddApplicationPage() {
  const router = useRouter();
  const [applicationName, setApplicationName] = useState("");
  const [defaultUrl, setDefaultUrl] = useState("");
  const [backendUrl, setBackendUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Portal Entry State
  const [portalEntries, setPortalEntries] = useState<PortalEntry[]>([]);

  const validateForm = (): boolean => {
    // ... (your validation logic remains the same)
    const newErrors: FormErrors = {};

    if (!applicationName.trim()) {
      newErrors.applicationName = "Application name is required";
    }

    // Validate Application URL
    if (!defaultUrl.trim()) {
      newErrors.defaultUrl = "Application URL is required";
    } else if (
      !defaultUrl.startsWith("https://") &&
      !defaultUrl.startsWith("http://")
    ) {
      newErrors.defaultUrl = "URL must start with http:// or https://";
    } else if (!defaultUrl.endsWith("/")) {
      newErrors.defaultUrl = "URL must end with /";
    }

    // Validate Backend URL
    if (!backendUrl.trim()) {
      newErrors.backendUrl = "Backend URL is required";
    } else if (
      !backendUrl.startsWith("https://") &&
      !backendUrl.startsWith("http://")
    ) {
      newErrors.backendUrl = "URL must start with http:// or https://";
    } else if (!backendUrl.endsWith("/")) {
      newErrors.backendUrl = "URL must end with /";
    }

    // Validate Secret Key
    if (!secretKey.trim()) {
      newErrors.secretKey = "Secret key is required";
    } else if (secretKey.length < 6) {
      newErrors.secretKey = "Secret key must be at least 6 characters";
    }

    // Validate Endpoint URL
    if (!endpointUrl.trim()) {
      newErrors.endpointUrl = "Endpoint URL is required";
    } else if (!endpointUrl.startsWith("/")) {
      newErrors.endpointUrl = "Endpoint URL must start with /";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Handlers for Portal Entry state ---
  const getNextPortalId = () => {
    if (portalEntries.length === 0) return 1;
    return Math.max(...portalEntries.map((p) => p.id || 0)) + 1;
  };

  const handleAddNewPortalEntry = (newEntry: Omit<PortalEntry, "id">) => {
    setPortalEntries([
      ...portalEntries,
      { ...newEntry, id: getNextPortalId() },
    ]);
    setIsAddingPortal(false);
  };

  const handleUpdatePortalEntry = (
    index: number,
    updatedEntry: Omit<PortalEntry, "id">
  ) => {
    const updatedEntries = [...portalEntries];
    updatedEntries[index] = { ...updatedEntry, id: updatedEntries[index].id };
    setPortalEntries(updatedEntries);
    setEditingIndex(null);
  };

  const handleRemovePortalEntry = (index: number) => {
    const updatedEntries = portalEntries.filter((_, i) => i !== index);
    setPortalEntries(updatedEntries);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // ... (your handleSubmit logic remains the same)
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("token");
      if (!token)
        throw new Error("Authentication required. Please log in again.");

      const applicationData = {
        application_name: applicationName,
        app_default_url: defaultUrl,
        app_backend_url: backendUrl,
        app_secret_key: secretKey,
        app_endpoint_route: endpointUrl,
        is_active: true,
        portals_config: portalEntries.map((entry) => ({
          id: entry.id,
          name: entry.name,
          url: entry.url,
          description: entry.description || "",
        })),
      };

      const response = await fetch(
        "http://localhost:8000/platform-admin/api/applications/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(applicationData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create application");
      }

      setSuccess(true);
      setTimeout(() => router.push("/platform-admin/applications"), 1500);
    } catch (err: any) {
      setError(
        err.message || "An error occurred while creating the application"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
        <IconButton
          onClick={() => router.back()}
          sx={{ mr: 1 }}
          aria-label="back"
        >
          <ArrowBack />
        </IconButton>
        <Typography variant="h5" component="h1">
          Add New Application
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Application created successfully! Redirecting...
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Application Details
          </Typography>
          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* First Row: Application Name and URL */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <TextField
                fullWidth
                label="Application Name*"
                value={applicationName}
                onChange={(e) => setApplicationName(e.target.value)}
                error={!!errors.applicationName}
                helperText={errors.applicationName}
                disabled={isLoading}
                size="small"
              />
              <TextField
                fullWidth
                label="Application URL*"
                placeholder="https://myapp.com"
                value={defaultUrl}
                onChange={(e) => setDefaultUrl(e.target.value)}
                error={!!errors.defaultUrl}
                helperText={errors.defaultUrl}
                disabled={isLoading}
                size="small"
                autoComplete="off"
              />
            </Stack>
            {/* Second Row: Backend URL and Secret Key */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <TextField
                fullWidth
                label="Backend URL*"
                placeholder="https://api.myapp.com"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                error={!!errors.backendUrl}
                helperText={errors.backendUrl}
                disabled={isLoading}
                size="small"
                autoComplete="off"
              />
              <TextField
                fullWidth
                label="Secret Key*"
                type={showPassword ? "text" : "password"}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                error={!!errors.secretKey}
                helperText={errors.secretKey || "Minimum 6 characters required"}
                disabled={isLoading}
                size="small"
                autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Stack>
            {/* Third Row: Endpoint URL */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={3}>
              <TextField
                fullWidth
                label="Endpoint URL*"
                placeholder="/api/webhook"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                error={!!errors.endpointUrl}
                helperText={errors.endpointUrl}
                disabled={isLoading}
                size="small"
              />
              <Box sx={{ flex: 1 }} />
            </Stack>
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Typography variant="h6">Portal Entries</Typography>
          </Box>
          <Box
            sx={{
              p: 2,
              border: "1px solid #e0e0e0",
              borderRadius: 1,
              bgcolor: "#f9f9f9",
            }}
          >
            <PortalEntryForm
              entry={{ name: "", url: "", description: "" }}
              onSave={handleAddNewPortalEntry}
            />
          </Box>
          {portalEntries.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Added Portal Entries
              </Typography>
              <Stack divider={<Divider />} spacing={2}>
                {portalEntries.map((entry, index) => (
                  <Box
                    key={index}
                    sx={{ p: 2, border: "1px solid #e0e0e0", borderRadius: 1 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {entry.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {entry.url}
                        </Typography>
                        {entry.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            {entry.description}
                          </Typography>
                        )}
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => handleRemovePortalEntry(index)}
                        disabled={isLoading}
                        sx={{ mt: -1 }}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>

        <Button
          type="submit"
          variant="contained"
          color="primary"
          disabled={isLoading}
          startIcon={
            isLoading ? <CircularProgress size={20} color="inherit" /> : null
          }
        >
          {isLoading ? "Creating..." : "Create Application"}
        </Button>
      </Box>
    </Box>
  );
}
