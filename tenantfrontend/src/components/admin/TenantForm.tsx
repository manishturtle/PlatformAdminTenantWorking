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
  Chip,
  SelectChangeEvent,
  FormHelperText,
  Checkbox,
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

interface Plan {
  id: number;
  name: string;
  description: string;
  status: string;
  price: string;
}

interface Subscription {
  id?: number;
  subscription_plan_id: number;
  license_key?: string;
  valid_from?: string;
  valid_until?: string;
  license_status?: string;
  plan_name?: string;
  plan_description?: string;
}

interface TenantFormData {
  name: string;
  schema_name: string;
  url_suffix: string;
  status?: string; // Optional since it's not in the form but needed for API
  environment: string;
  contact_email: string;
  is_active: boolean;
  client_id: string;
  admin_email: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_password: string;
  subscriptions: Subscription[];
  subscription_plan: number[];
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
    environment: "production",
    contact_email: "",
    is_active: true,
    client_id: "",
    admin_email: "",
    admin_first_name: "",
    admin_last_name: "",
    admin_password: "",
    subscriptions: [],
    subscription_plan: [],
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

  // Plans state
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Fetch CRM clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoadingClients(true);
        const authHeader = getAuthHeader();

        const response = await fetch(
          "http://localhost:8000/platform-admin/api/crmclients/",
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

  // Fetch plans on component mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoadingPlans(true);
        const authHeader = getAuthHeader();
        console.log("Fetching plans with headers:", authHeader);

        const response = await fetch(
          "http://localhost:8000/api/platform-admin/subscription/plans/",
          {
            headers: {
              ...authHeader,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch subscription plans");
        }

        const data = await response.json();
        console.log("Raw API response:", data);

        if (data.results && Array.isArray(data.results)) {
          console.log("Setting plans:", data.results);
          setPlans(data.results);
        } else {
          console.error("Invalid plans data format:", data);
          setError("Invalid plans data format received from server");
        }
      } catch (err: any) {
        console.error("Error fetching subscription plans:", err);
        setError("Failed to load subscription plans. Please try again.");
      } finally {
        setLoadingPlans(false);
      }
    };

    fetchPlans();
  }, []);

  // Set initial form data when component mounts or tenant prop changes
  useEffect(() => {
    if (tenant) {
      // Get all subscription plan IDs or fall back to the legacy single subscription
      const subscriptionPlans = tenant.subscriptions?.length > 0 
        ? tenant.subscriptions.map((sub: any) => sub.subscription_plan_id)
        : (tenant.subscription?.subscription_plan_id ? [tenant.subscription.subscription_plan_id] : []);

      setFormData({
        name: tenant.name || "",
        schema_name: tenant.schema_name || "",
        url_suffix: tenant.url_suffix || "",
        status: tenant.status || "active",
        environment: tenant.environment || "production",
        contact_email: tenant.contact_person_email || "",
        is_active: tenant.is_active !== undefined ? tenant.is_active : true,
        client_id: tenant.client_id ? String(tenant.client_id) : "",
        admin_email: tenant.admin_user?.email || "",
        admin_first_name: tenant.admin_user?.first_name || "",
        admin_last_name: tenant.admin_user?.last_name || "",
        admin_password: "",
        subscriptions: tenant.subscriptions || (tenant.subscription ? [tenant.subscription] : []),
        subscription_plan: subscriptionPlans,
      });
    }
  }, [tenant]);

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Handle subscription plan selection changes
  const handleSubscriptionChange = (planId: number, isSelected: boolean) => {
    setFormData((prev) => {
      const plan = plans.find((p) => p.id === planId);
      if (!plan) return prev;

      let updatedSubscriptions: Subscription[];
      
      if (isSelected) {
        // Add new subscription if not already in the list
        const subscriptionExists = prev.subscriptions.some(
          (sub) => sub.subscription_plan_id === planId
        );
        
        if (subscriptionExists) return prev;
        
        updatedSubscriptions = [
          ...prev.subscriptions,
          {
            subscription_plan_id: planId,
            plan_name: plan.name,
            plan_description: plan.description,
            license_status: 'active',
            valid_from: new Date().toISOString(),
            valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
          },
        ];
      } else {
        // Remove subscription
        updatedSubscriptions = prev.subscriptions.filter(
          (sub) => sub.subscription_plan_id !== planId
        );
      }

      // Update subscription_plan for backward compatibility
      const subscriptionPlanIds = updatedSubscriptions.map(
        (sub) => sub.subscription_plan_id
      );

      return {
        ...prev,
        subscriptions: updatedSubscriptions,
        subscription_plan: subscriptionPlanIds,
      };
    });

    // Clear any subscription plan error
    if (errors.subscription_plan) {
      setErrors((prev) => ({
        ...prev,
        subscription_plan: "",
      }));
    }
  };

  // Handle select input changes
  const handleSelectChange = (e: SelectChangeEvent<string | string[]>) => {
    const { name, value } = e.target;

    // Skip handling subscription_plan here as it's now handled by handleSubscriptionChange
    if (name === 'subscription_plan') {
      return;
    }

    // Handle array values
    if (Array.isArray(value)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value.map((v) => (typeof v === 'string' ? parseInt(v, 10) : v)),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error for this field
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    // Clear any previous error for this field
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
    setShowPassword(!showPassword);
  };

  // Auto-generate schema name and URL suffix from tenant name
  const handleTenantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const schemaName = value.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const urlSuffix = value.toLowerCase().replace(/[^a-z0-9]/g, "_");

    setFormData((prev) => ({
      ...prev,
      name: value,
      schema_name: schemaName,
      url_suffix: urlSuffix,
    }));

    // Clear errors
    if (errors.name || errors.schema_name || errors.url_suffix) {
      setErrors((prev) => ({
        ...prev,
        name: "",
        schema_name: "",
        url_suffix: "",
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Tenant name is required";
    }

    if (!formData.schema_name.trim()) {
      newErrors.schema_name = "Schema name is required";
    } else if (!/^[a-z0-9_]+$/.test(formData.schema_name)) {
      newErrors.schema_name =
        "Schema name can only contain lowercase letters, numbers, and underscores";
    }

    if (!formData.url_suffix.trim()) {
      newErrors.url_suffix = "URL suffix is required";
    } else if (!/^[a-z0-9-]+$/.test(formData.url_suffix)) {
      newErrors.url_suffix =
        "URL suffix can only contain lowercase letters, numbers, and hyphens";
    }

    if (!formData.contact_email.trim()) {
      newErrors.contact_email = "Contact email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = "Invalid email format";
    }

    if (!formData.client_id) {
      newErrors.client_id = "CRM client is required";
    }

    // Validate subscription plan is selected
    if (formData.subscription_plan.length === 0) {
      newErrors.subscription_plan =
        "At least one subscription plan is required";
    }

    // Validate admin user details if creating a new tenant
    if (!isEditing) {
      if (!formData.admin_email.trim()) {
        newErrors.admin_email = "Admin email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.admin_email)) {
        newErrors.admin_email = "Invalid email format";
      }

      if (!formData.admin_first_name.trim()) {
        newErrors.admin_first_name = "Admin first name is required";
      }

      if (!formData.admin_last_name.trim()) {
        newErrors.admin_last_name = "Admin last name is required";
      }

      if (!formData.admin_password.trim()) {
        newErrors.admin_password = "Admin password is required";
      } else if (formData.admin_password.length < 8) {
        newErrors.admin_password = "Password must be at least 8 characters";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage("");

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const url = tenant?.id
        ? `${baseUrl}/platform-admin/api/tenants/${tenant.id}/`
        : `${baseUrl}/platform-admin/api/tenants/`;
      
      const method = tenant?.id ? "PATCH" : "POST";

      // Prepare the data to be sent
      const requestData = {
        ...formData,
        // Only include admin password when creating a new tenant
        ...(tenant?.id ? {} : { admin_password: formData.admin_password }),
        // For existing tenants, include the admin user ID if available
        ...(tenant?.admin_user?.id ? { admin_user_id: tenant.admin_user.id } : {}),
        // Include all subscriptions
        subscriptions: formData.subscriptions,
      };

      // Create a new object without the subscription_plan field to avoid mutation
      const { subscription_plan, ...cleanedData } = requestData;

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred while saving the tenant"
        );
      }

      setSuccessMessage(
        `Tenant ${tenant?.id ? "updated" : "created"} successfully!`
      );
      
      // Call the parent's onSubmit callback if provided
      if (onSubmit) {
        onSubmit();
      }
    } catch (err: any) {
      console.error("Error saving tenant:", err);
      setError(err.message || "An error occurred while saving the tenant");
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEditing) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">
          {isEditing ? "Edit Tenant" : "Create New Tenant"}
        </Typography>
        <Box>
          <Button onClick={onCancel} sx={{ mr: 2 }} variant="outlined">
            CANCEL
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            form="tenant-form"
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
      </Box>

      <form id="tenant-form" onSubmit={handleSubmit} autoComplete="off">
        {/* Tenant Information Section */}
        <Typography variant="h6" sx={{ mb: 3, borderBottom: "1px solid #e0e0e0", pb: 1 }}>
          Tenant Information
        </Typography>

        <Grid container spacing={3}>
          {/* Left Column */}
          <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Tenant Name *"
                  name="name"
                  value={formData.name}
                  onChange={handleTenantNameChange}
                  error={Boolean(errors.name)}
                  helperText={errors.name || "Enter the name of the tenant organization"}
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                sx={{ minWidth: 25 }} 
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

              <Grid item xs={12}>
                <FormControl  sx={{ minWidth: 250 }} fullWidth error={Boolean(errors.client_id)}>
                  <InputLabel id="client-id-label">CRM Client *</InputLabel>
                  <Select
                    labelId="client-id-label"
                    label="CRM Client *"
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
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          width: "auto",
                          minWidth: 200,
                        },
                      },
                    }}
                  >
                    {crmClients.length > 0 ? (
                      crmClients.map((client) => (
                        <MenuItem key={client.id} value={client.id}>
                          {client.client_name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled value="-1">
                        {loadingClients ? "Loading clients..." : "No CRM clients available"}
                      </MenuItem>
                    )}
                  </Select>
                  {errors.client_id && (
                    <FormHelperText error>{errors.client_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
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
                    <MenuItem value="development">Development</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  label="Contact Email"
                  name="contact_email"
                  value={formData.contact_email}
                  onChange={handleInputChange}
                  error={Boolean(errors.contact_email)}
                  helperText="Primary contact email for this tenant"
                  fullWidth
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl  sx={{ minWidth: 250 }} fullWidth error={Boolean(errors.subscription_plan)}>
                  <InputLabel id="subscription-plan-label">Subscription Plan *</InputLabel>
                  <Select
                    labelId="subscription-plan-label"
                    label="Subscription Plan *"
                    name="subscription_plan"
                    value={formData.subscription_plan.map((id) => id.toString())}
                    onChange={handleSelectChange}
                    error={Boolean(errors.subscription_plan)}
                    disabled={loadingPlans}
                    multiple
                    fullWidth
                    renderValue={(selected) => {
                      if (formData.subscriptions.length === 0) {
                        return <em>Select plan(s)</em>;
                      }
                      const selectedPlanNames = formData.subscriptions
                        .map((sub) => {
                          const plan = plans.find((p) => p.id === sub.subscription_plan_id);
                          return plan ? plan.name : "";
                        })
                        .filter(Boolean);
                      return selectedPlanNames.join(", ") || 'Select plan(s)';
                    }}
                    
                  >
                    {loadingPlans ? (
                      <MenuItem disabled>
                        <CircularProgress size={20} /> Loading plans...
                      </MenuItem>
                    ) : plans && plans.length > 0 ? (
                      plans.map((plan: Plan) => {
                        const isSelected = formData.subscriptions.some(
                          (sub) => sub.subscription_plan_id === plan.id
                        );

                        const toggleSelection = () => {
                          handleSubscriptionChange(plan.id, !isSelected);
                        };

                        return (
                          <MenuItem
                            key={plan.id}
                            value={plan.id}
                            dense
                            sx={{
                              padding: "8px 16px",
                              "&:hover": {
                                backgroundColor: "rgba(0, 0, 0, 0.04)",
                              },
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSelection();
                            }}
                          >
                            <Box
                              display="flex"
                              alignItems="center"
                              width="100%"
                              sx={{ cursor: "pointer" }}
                            >
                              <Checkbox
                                checked={isSelected}
                                size="small"
                                sx={{ padding: "4px", marginRight: "8px" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                onChange={toggleSelection}
                              />
                              <Typography>{plan.name}</Typography>
                            </Box>
                          </MenuItem>
                        );
                      })
                    ) : (
                      <MenuItem disabled>No plans available</MenuItem>
                    )}
                  </Select>
                  {errors.subscription_plan && (
                    <FormHelperText error>{errors.subscription_plan}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData(prev => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                      name="is_active"
                      color="primary"
                    />
                  }
                  label={
                    <Box display="flex" justifyContent="space-between" width="100%">
                      <Typography variant="body2">Status</Typography>
                      {/* <Chip 
                        label={formData.is_active ? "Active" : "Inactive"} 
                        size="small" 
                        color={formData.is_active ? "success" : "default"}
                        variant="outlined"
                      /> */}
                    </Box>
                  }
                  labelPlacement="start"
                  sx={{
                    margin: 0,
                    padding: "8px 0",
                    width: "100%",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
            </Grid>
            
          </Grid>

          {/* Right Column */}
         
        </Grid>

        {/* Admin User Section */}
        <Typography variant="h6" sx={{ mt: 4, mb: 3, borderBottom: "1px solid #e0e0e0", pb: 1 }}>
          {isEditing ? "Admin User" : "Initial Admin User"}
        </Typography>

        <Grid container spacing={3}>
          {/* Admin fields in a single row */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Admin Email *"
              name="admin_email"
              value={formData.admin_email}
              onChange={handleInputChange}
              error={Boolean(errors.admin_email)}
              helperText={errors.admin_email || "Email address for the admin user"}
              fullWidth
              disabled={isEditing}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="First Name *"
              name="admin_first_name"
              value={formData.admin_first_name}
              onChange={handleInputChange}
              error={Boolean(errors.admin_first_name)}
              helperText={errors.admin_first_name}
              fullWidth
              disabled={isEditing}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Last Name *"
              name="admin_last_name"
              value={formData.admin_last_name}
              onChange={handleInputChange}
              error={Boolean(errors.admin_last_name)}
              helperText={errors.admin_last_name}
              fullWidth
              disabled={isEditing}
            />
          </Grid>

          {/* Password field in the same row */}
          {!isEditing ? (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                label="Admin Password *"
                name="admin_password"
                type={showPassword ? "text" : "password"}
                value={formData.admin_password}
                onChange={handleInputChange}
                error={Boolean(errors.admin_password)}
                helperText={
                  errors.admin_password ||
                  "Password must be at least 8 characters"
                }
                fullWidth
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
                        onMouseDown={(e) => e.preventDefault()}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Alert severity="info">
                To change the admin password, use the reset password feature in the tenant admin panel.
              </Alert>
            </Grid>
          )}
        </Grid>

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

        <Box sx={{ display: "none" }}>
          <Button type="submit">Submit</Button>
        </Box>
      </form>
    </Paper>
  );
};

export default TenantForm;
