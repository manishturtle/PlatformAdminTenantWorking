"use client";
import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Typography,
  Paper,
  Grid,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Box,
  SelectChangeEvent,
  FormHelperText,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { addMonths } from "date-fns";
import { getAuthHeader } from "../../utils/authUtils";

interface TenantFormProps {
  tenant?: any;
  onSubmit: () => void;
  onCancel: () => void;
}

interface CrmClient {
  id: number;
  client_name: string;
}

interface TenantFormData {
  name: string;
  schema_name: string;
  url_suffix: string;
  status: string;
  environment: string;
  trial_end_date: Date;
  contact_email: string;
  is_active: boolean;
  client_id: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_password: string;
}

const TenantForm: React.FC<TenantFormProps> = ({
  tenant,
  onSubmit,
  onCancel,
}) => {
  const isEditing = Boolean(tenant?.id);

  // State for form data
  const [formData, setFormData] = useState<TenantFormData>({
    name: "",
    schema_name: "",
    url_suffix: "",
    status: "trial",
    environment: "production",
    trial_end_date: new Date(),
    contact_email: "",
    is_active: true,
    client_id: "",
    admin_email: "",
    admin_first_name: "",
    admin_last_name: "",
    admin_password: "",
  });

  // Loading state
  const [loading, setLoading] = useState(false);

  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);

  // Form validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Success message state
  const [successMessage, setSuccessMessage] = useState("");

  // Error message state
  const [error, setError] = useState<string | null>(null);

  // CRM clients state
  const [crmClients, setCrmClients] = useState<CrmClient[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Fetch CRM clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const authHeader = getAuthHeader();

        const response = await fetch(
          "https://bedevcockpit.turtleit.in/platform-admin/api/crmclients/",
          {
            headers: {
              ...authHeader,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch CRM clients");
        }

        const data = await response.json();
        setCrmClients(Array.isArray(data.results) ? data.results : []);
      } catch (err: any) {
        console.error("Error fetching CRM clients:", err);
        setError("Failed to load CRM clients. Please try again.");
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, []);

  // Initialize form with tenant data if editing
  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || "",
        schema_name: tenant.schema_name || "",
        url_suffix: tenant.url_suffix || "",
        status: tenant.status || "trial",
        environment: tenant.environment || "production",
        trial_end_date: tenant.trial_end_date
          ? new Date(tenant.trial_end_date)
          : addMonths(new Date(), 1),
        contact_email: tenant.contact_email || "",
        is_active: tenant.is_active !== undefined ? tenant.is_active : true,
        client_id: tenant.client_id ? tenant.client_id.toString() : "",
        admin_email: "",
        admin_first_name: "",
        admin_last_name: "",
        admin_password: "",
      });
    }
  }, [tenant]);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Special handling for tenant name to auto-generate schema name and URL suffix
    if (name === "name") {
      handleTenantNameChange(e);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle select input changes
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle date picker changes
  const handleDateChange = (date: Date | null) => {
    if (date) {
      setFormData((prev) => ({
        ...prev,
        trial_end_date: date,
      }));
    }
  };

  // Handle switch changes
  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  // Toggle password visibility
  const handleTogglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  // Auto-generate schema name and URL suffix from tenant name
  const handleTenantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    // Generate schema name (lowercase, replace spaces with underscores)
    const schemaName = value
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");

    // Generate URL suffix (lowercase, replace spaces with hyphens)
    const urlSuffix = value
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");

    setFormData((prev) => ({
      ...prev,
      name: value,
      schema_name: schemaName,
      url_suffix: urlSuffix,
    }));

    // Clear errors for these fields if they exist
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors.name;
      delete newErrors.schema_name;
      delete newErrors.url_suffix;
      return newErrors;
    });
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate tenant name
    if (!formData.name.trim()) {
      newErrors.name = "Tenant name is required";
    }

    // Validate schema name
    if (!formData.schema_name.trim()) {
      newErrors.schema_name = "Schema name is required";
    } else if (!/^[a-z0-9_]+$/.test(formData.schema_name)) {
      newErrors.schema_name =
        "Schema name can only contain lowercase letters, numbers, and underscores";
    }

    // Validate URL suffix
    if (!formData.url_suffix.trim()) {
      newErrors.url_suffix = "URL suffix is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.url_suffix)) {
      newErrors.url_suffix =
        "URL suffix can only contain lowercase letters, numbers, and hyphens";
    }

    // Validate admin fields if creating a new tenant
    if (!isEditing) {
      // Validate admin email
      if (!formData.admin_email.trim()) {
        newErrors.admin_email = "Admin email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
        newErrors.admin_email = "Invalid email format";
      }

      // Validate admin first name
      if (!formData.admin_first_name.trim()) {
        newErrors.admin_first_name = "Admin first name is required";
      }

      // Validate admin last name
      if (!formData.admin_last_name.trim()) {
        newErrors.admin_last_name = "Admin last name is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authHeader = getAuthHeader();

      // Prepare data for API
      const apiData = {
        ...formData,
        client_id:
          formData.client_id && formData.client_id !== ""
            ? parseInt(formData.client_id)
            : null,
        trial_end_date: formData.trial_end_date.toISOString().split("T")[0], // Format as YYYY-MM-DD
      };

      console.log("Submitting tenant data:", apiData);

      const url = isEditing
        ? `https://bedevcockpit.turtleit.in/platform-admin/api/tenants/${tenant.id}/`
        : "https://bedevcockpit.turtleit.in/platform-admin/api/tenants/";

      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save tenant");
      }

      setSuccessMessage(
        isEditing
          ? "Tenant updated successfully!"
          : "Tenant created successfully!"
      );
      onSubmit();
    } catch (err: any) {
      console.error("Error saving tenant:", err);
      setError(err.message || "Failed to save tenant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        {isEditing ? "Edit Tenant" : "Create New Tenant"}
      </Typography>

      <form onSubmit={handleSubmit}>
        <Typography
          variant="h6"
          sx={{ mt: 3, mb: 2, borderBottom: "1px solid #e0e0e0", pb: 1 }}
        >
          Tenant Information
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Tenant Name *"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              error={Boolean(errors.name)}
              helperText={errors.name}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Schema Name *"
              name="schema_name"
              value={formData.schema_name}
              onChange={handleInputChange}
              error={Boolean(errors.schema_name)}
              helperText={
                errors.schema_name ||
                "Used for database schema (lowercase, underscores)"
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="URL Suffix *"
              name="url_suffix"
              value={formData.url_suffix}
              onChange={handleInputChange}
              error={Boolean(errors.url_suffix)}
              helperText={
                errors.url_suffix ||
                "This will be used in the tenant URL (e.g., example.com/{suffix})"
              }
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth error={Boolean(errors.client_id)}>
              <InputLabel id="client-id-label">CRM Client</InputLabel>
              <Select
                labelId="client-id-label"
                label="CRM Client"
                name="client_id"
                value={formData.client_id}
                onChange={handleSelectChange}
                disabled={loadingClients}
                startAdornment={
                  loadingClients ? (
                    <Box sx={{ display: "flex", alignItems: "center", mr: 1 }}>
                      <CircularProgress size={20} />
                    </Box>
                  ) : null
                }
              >
                <MenuItem value="" disabled>
                  Select Client
                </MenuItem>
                {crmClients.length > 0 ? (
                  crmClients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.client_name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="-1">
                    {loadingClients
                      ? "Loading clients..."
                      : "No CRM clients available"}
                  </MenuItem>
                )}
              </Select>
              {errors.client_id && (
                <FormHelperText error>{errors.client_id}</FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="environment-label">Environment</InputLabel>
              <Select
                labelId="environment-label"
                label="Environment"
                name="environment"
                value={formData.environment}
                onChange={handleSelectChange}
              >
                <MenuItem value="production">Production</MenuItem>
                <MenuItem value="staging">Staging</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel id="status-label">Status</InputLabel>
              <Select
                labelId="status-label"
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleSelectChange}
              >
                <MenuItem value="trial">Trial</MenuItem>
                <MenuItem value="active">Active</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Trial End Date"
                value={formData.trial_end_date}
                onChange={handleDateChange}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              label="Contact Email"
              name="contact_email"
              value={formData.contact_email}
              onChange={handleInputChange}
              error={Boolean(errors.contact_email)}
              helperText={
                errors.contact_email || "Primary contact email for this tenant"
              }
              autoComplete="off"
              type="email"
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleSwitchChange}
                />
              }
              label="Active"
            />
          </Grid>
        </Grid>

        {/* Initial Admin User Section */}
        {!isEditing && (
          <>
            <Typography
              variant="h6"
              sx={{ mt: 4, mb: 2, borderBottom: "1px solid #e0e0e0", pb: 1 }}
            >
              Initial Admin User
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Admin Email *"
                  name="admin_email"
                  value={formData.admin_email}
                  onChange={handleInputChange}
                  error={Boolean(errors.admin_email)}
                  helperText={
                    errors.admin_email ||
                    "Email address for the initial admin user"
                  }
                  autoComplete="off"
                  type="email"
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Admin First Name *"
                  name="admin_first_name"
                  value={formData.admin_first_name}
                  onChange={handleInputChange}
                  error={Boolean(errors.admin_first_name)}
                  helperText={errors.admin_first_name}
                  autoComplete="off"
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Admin Last Name *"
                  name="admin_last_name"
                  value={formData.admin_last_name}
                  onChange={handleInputChange}
                  error={Boolean(errors.admin_last_name)}
                  helperText={errors.admin_last_name}
                  autoComplete="new password"
                  fullWidth
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  label="Admin Password (Optional)"
                  name="admin_password"
                  value={formData.admin_password}
                  onChange={handleInputChange}
                  error={Boolean(errors.admin_password)}
                  helperText={
                    errors.admin_password ||
                    "Leave blank to auto-generate a secure password"
                  }
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={handleTogglePasswordVisibility}>
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Grid>
            </Grid>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        {successMessage && (
          <Alert severity="success" sx={{ mt: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <Button onClick={onCancel} sx={{ mr: 2 }} variant="outlined">
            CANCEL
          </Button>

          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : isEditing ? (
              "UPDATE TENANT"
            ) : (
              "CREATE TENANT"
            )}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default TenantForm;
