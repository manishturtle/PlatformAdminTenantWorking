"use client";
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  InputAdornment,
  Switch,
  FormControlLabel,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility,
  VisibilityOff,
  Close as CloseIcon,
} from "@mui/icons-material";

interface Application {
  app_id: number;
  application_name: string;
  client_id: number;
  company_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  app_default_url?: string;
  app_secret_key?: string;
  app_endpoint_route?: string;
  description?: string;
  app_backend_url?: string;
  migrate_schema_endpoint?: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [newAppName, setNewAppName] = useState("");
  const [defaultUrl, setDefaultUrl] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [endpointUrl, setEndpointUrl] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [appBackendUrl, setAppBackendUrl] = useState("");
  const [migrateSchemaEndpoint, setMigrateSchemaEndpoint] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        "http://localhost:8000/platform-admin/api/applications/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const data = await response.json();
      // Sort applications by updated_at in descending order
      const sortedApps = data.results.sort(
        (a: Application, b: Application) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setApplications(sortedApps);
      setError("");
    } catch (err) {
      setError("Error fetching applications");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!newAppName.trim()) {
      newErrors.application_name = "Application name is required";
    }

    if (!defaultUrl.trim()) {
      newErrors.app_default_url = "Default URL is required";
    } else if (
      !defaultUrl.startsWith("http://") &&
      !defaultUrl.startsWith("https://")
    ) {
      newErrors.app_default_url = "URL must start with http:// or https://";
    }

    if (!secretKey.trim()) {
      newErrors.app_secret_key = "Secret key is required";
    } else if (secretKey.length < 6) {
      newErrors.app_secret_key =
        "Secret key must be at least 6 characters long";
    }

    if (!endpointUrl.trim()) {
      newErrors.app_endpoint_route = "Endpoint URL is required";
    } else if (!endpointUrl.startsWith("/")) {
      newErrors.app_endpoint_route = "Endpoint must start with a slash (/)";
    }

    if (!appBackendUrl.trim()) {
      newErrors.app_backend_url = "Backend URL is required";
    } else if (
      !appBackendUrl.startsWith("http://") &&
      !appBackendUrl.startsWith("https://")
    ) {
      newErrors.app_backend_url =
        "Backend URL must start with http:// or https://";
    } else if (!appBackendUrl.endsWith("/")) {
      newErrors.app_backend_url = "Backend URL must end with a slash (/)";
    }

    if (!migrateSchemaEndpoint.trim()) {
      newErrors.migrate_schema_endpoint =
        "Migration schema endpoint is required";
    } else if (!migrateSchemaEndpoint.endsWith("/")) {
      newErrors.migrate_schema_endpoint =
        "Migration schema endpoint must end with a slash (/)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setNewAppName("");
    setDefaultUrl("");
    setSecretKey("");
    setEndpointUrl("");
    setAppDescription("");
    setAppBackendUrl("");
    setMigrateSchemaEndpoint("");
    setIsActive(true);
    setEditingApp(null);
  };

  const handleEdit = (app: Application) => {
    setEditingApp(app);
    setNewAppName(app.application_name);
    setDefaultUrl(app.app_default_url || "");
    setSecretKey(app.app_secret_key || "");
    setEndpointUrl(app.app_endpoint_route || "");
    setAppDescription(app.description || "");
    setAppBackendUrl(app.app_backend_url || "");
    setMigrateSchemaEndpoint(app.migrate_schema_endpoint || "");
    setIsActive(app.is_active);
    setOpenDialog(true);
  };

  const handleDelete = async (appId: number) => {
    if (!window.confirm("Are you sure you want to delete this application?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `http://localhost:8000/platform-admin/api/applications/${appId}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete application");
      }

      // Refresh the applications list
      fetchApplications();
    } catch (err) {
      setError("Error deleting application");
      console.error("Error:", err);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const url = editingApp
        ? `http://localhost:8000/platform-admin/api/applications/${editingApp.app_id}/`
        : "http://localhost:8000/platform-admin/api/applications/";

      const response = await fetch(url, {
        method: editingApp ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          application_name: newAppName,
          app_default_url: defaultUrl,
          app_secret_key: secretKey,
          app_endpoint_route: endpointUrl,
          description: appDescription,
          app_backend_url: appBackendUrl.endsWith("/")
            ? appBackendUrl
            : `${appBackendUrl}/`,
          migrate_schema_endpoint: migrateSchemaEndpoint.endsWith("/")
            ? migrateSchemaEndpoint
            : `${migrateSchemaEndpoint}/`,
          is_active: isActive,
        }),
      });

      if (response.ok) {
        // Refresh the applications list
        fetchApplications();
        // Reset form fields
        resetForm();
        setOpenDialog(false);
      } else {
        const errorData = await response.json();
        const newErrors: { [key: string]: string } = {};

        // Handle backend validation errors
        Object.keys(errorData).forEach((key) => {
          newErrors[key] = Array.isArray(errorData[key])
            ? errorData[key][0]
            : errorData[key];
        });

        setErrors(newErrors);
      }
    } catch (error) {
      console.error("Error creating application:", error);
      setErrors({ general: "Failed to create application. Please try again." });
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5" component="h1">
          Applications
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          Add Application
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell>Updated At</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {applications.map((app) => (
              <TableRow key={app.app_id}>
                <TableCell>{app.application_name}</TableCell>
                <TableCell>{app.is_active ? "Active" : "Inactive"}</TableCell>
                <TableCell>
                  {new Date(app.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {new Date(app.updated_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    onClick={() => handleEdit(app)}
                    color="primary"
                    title="Edit"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(app.app_id)}
                    color="error"
                    title="Delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingApp ? "Edit Application" : "Add New Application"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Application Name"
            value={newAppName}
            onChange={(e) => setNewAppName(e.target.value)}
            fullWidth
            helperText={errors.application_name || "Example: My Application"}
            error={!!errors.application_name}
          />
          <TextField
            label="Default URL"
            value={defaultUrl}
            onChange={(e) => setDefaultUrl(e.target.value)}
            fullWidth
            margin="normal"
            helperText={
              errors.app_default_url ||
              "Base URL of the application (e.g., https://myapp.com)"
            }
            error={!!errors.app_default_url}
            autoComplete="off"
            type="url"
          />
          <TextField
            label="Secret Key"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            fullWidth
            margin="normal"
            helperText={
              errors.app_secret_key ||
              "Secret key for API authentication (min 6 characters)"
            }
            error={!!errors.app_secret_key}
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleTogglePassword} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <TextField
            margin="dense"
            label="Endpoint URL"
            fullWidth
            value={endpointUrl}
            onChange={(e) => setEndpointUrl(e.target.value)}
            helperText={
              errors.app_endpoint_route ||
              "Enter the first route of your application (e.g., '/login')"
            }
            error={!!errors.app_endpoint_route}
          />

          <TextField
            margin="dense"
            label="Backend URL"
            fullWidth
            value={appBackendUrl}
            onChange={(e) => setAppBackendUrl(e.target.value)}
            helperText={
              errors.app_backend_url ||
              "Enter the backend URL (e.g., https://api.myapp.com/)"
            }
            error={!!errors.app_backend_url}
          />

          <TextField
            margin="dense"
            label="Migration Schema Endpoint"
            fullWidth
            value={migrateSchemaEndpoint}
            onChange={(e) => setMigrateSchemaEndpoint(e.target.value)}
            helperText={
              errors.migrate_schema_endpoint ||
              "Enter the migration schema endpoint (e.g., api/migrate/)"
            }
            error={!!errors.migrate_schema_endpoint}
          />

          <FormControlLabel
            control={
              <Switch
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                color="primary"
              />
            }
            label={`Status: ${isActive ? "Active" : "Inactive"}`}
            sx={{ my: 2 }}
          />

          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={4}
            value={appDescription}
            onChange={(e) => setAppDescription(e.target.value)}
            helperText={
              errors.description || "Enter a description for your application"
            }
            error={!!errors.description}
          />

          {errors.general && (
            <Typography color="error" sx={{ mt: 2 }}>
              {errors.general}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ padding: "16px 24px" }}>
          <Button
            onClick={() => setOpenDialog(false)}
            variant="outlined"
            color="secondary"
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            sx={{ ml: 2 }}
          >
            {editingApp ? "Update Application" : "Create Application"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
