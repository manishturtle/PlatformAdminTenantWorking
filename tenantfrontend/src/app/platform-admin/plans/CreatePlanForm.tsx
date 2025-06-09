import React, { useState, useEffect } from "react";
import { Snackbar, Alert } from "@mui/material";
import {
  Grid,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { getAuthHeader } from "../../../utils/authUtils";
import { plansService } from "./plans.service";
import { getActiveLineOfBusinesses } from "../../../services/lineOfBusinessService";

interface LineOfBusiness {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: number | null;
  updated_by: number | null;
}

interface SubFeature {
  id: number;
  name: string;
  key: string;
  description: string;
  settings: {
    enabled: boolean;
    [key: string]: any;
  };
}

interface Feature {
  id: number;
  name: string;
  key: string;
  description: string;
  granual_settings: {
    subfeatures: SubFeature[];
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ApplicationFeatures {
  application: number;
  application_name: string;
  features: Feature[];
}

interface CreatePlanFormProps {
  onSubmit: (formData: FormData) => void;
  onCancel?: () => void;
  initialData?: FormData;
  isEditMode?: boolean;
}

interface FormData {
  name: string;
  description: string;
  status: "active" | "inactive" | "draft";
  price: string;
  billing_cycle: "monthly" | "quarterly" | "annually" | "one_time" | "weekly";
  max_users: string;
  transaction_limit: string;
  api_call_limit: string;
  storage_limit: string;
  session_type: "concurrent" | "named";
  support_level: "basic" | "standard" | "premium";
  valid_from: Date;
  valid_until: Date | null;
  line_of_business: number | null;
  detailed_entitlements: Record<string, any>;
}

export default function CreatePlanForm({
  onSubmit,
  onCancel,
  initialData,
  isEditMode = false,
}: CreatePlanFormProps): JSX.Element {
  const [formData, setFormData] = useState<FormData>(initialData || {
    detailed_entitlements: {},
    name: "",
    description: "",
    status: "active",
    price: "",
    billing_cycle: "monthly",
    max_users: "",
    transaction_limit: "",
    api_call_limit: "",
    storage_limit: "",
    session_type: "concurrent",
    support_level: "basic",
    valid_from: new Date(),
    valid_until: null,
    line_of_business: null,
    detailed_entitlements: {},
  });

  const [applications, setApplications] = useState<ApplicationFeatures[]>([]);
  const [selectedApps, setSelectedApps] = useState<number[]>(initialData?.selectedApps || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linesOfBusiness, setLinesOfBusiness] = useState<LineOfBusiness[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  useEffect(() => {
    fetchFeatures();
    fetchLinesOfBusiness();
  }, []);

  const fetchLinesOfBusiness = async () => {
    try {
      const data = await getActiveLineOfBusinesses();
      setLinesOfBusiness(data);
    } catch (err) {
      console.error("Error fetching lines of business:", err);
    }
  };

  const fetchFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        "http://localhost:8000/api/platform-admin/subscription/features/get_features/",
        {
          headers: await getAuthHeader(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch features");
      }

      const data = await response.json();
      
      if (initialData?.applications) {
        // Create a map of existing features by app_id and feature_id
        const existingFeatures = new Map();
        initialData.applications.forEach(app => {
          app.features.forEach(feature => {
            const key = `${app.application}_${feature.id}`;
            existingFeatures.set(key, feature);
          });
        });

        // Merge existing features' settings with all available features
        const mergedData = data.map(app => ({
          ...app,
          features: app.features.map(feature => {
            const key = `${app.application}_${feature.id}`;
            const existingFeature = existingFeatures.get(key);
            return existingFeature ? {
              ...feature,
              granual_settings: existingFeature.granual_settings
            } : feature;
          })
        }));
        setApplications(mergedData);
      } else {
        setApplications(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch features");
    } finally {
      setLoading(false);
    }
  };

  const handleTextFieldChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAppChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value as number[];
    setSelectedApps(value);
  };

  const isFeatureSelected = (featureId: string): boolean => {
    return Object.keys(formData.detailed_entitlements || {}).includes(featureId);
  };

  const isSubfeatureEnabled = (
    featureId: string,
    subfeatureId: string
  ): boolean => {
    return (
      formData.detailed_entitlements[
        featureId
      ]?.granual_settings?.subfeatures?.some(
        (s) => s.id === parseInt(subfeatureId) && s.enabled
      ) || false
    );
  };

  const handleFeatureChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    feature: Feature
  ) => {
    const checked = event.target.checked;
    const featureId = feature.id;

    setFormData((prev) => {
      if (checked) {
        // Add new feature with all subfeatures enabled by default
        const newFeature = {
          [featureId]: {
            granual_settings: {
              enabled: true,
              subfeatures:
                feature.granual_settings?.subfeatures.map((sf) => ({
                  id: sf.id,
                  enabled: true,
                })) || [],
            },
          },
        };

        return {
          ...prev,
          detailed_entitlements: {
            ...prev.detailed_entitlements,
            ...newFeature,
          },
        };
      } else {
        // Remove feature
        const newEntitlements = { ...prev.detailed_entitlements };
        delete newEntitlements[featureId];
        return {
          ...prev,
          detailed_entitlements: newEntitlements,
        };
      }
    });
  };

  const handleSubfeatureChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    feature: Feature,
    subfeatureId: number
  ) => {
    const checked = event.target.checked;

    setFormData((prev) => {
      const featureId = feature.id;
      const newEntitlements = { ...prev.detailed_entitlements };

      if (!newEntitlements[featureId]) {
        // Feature doesn't exist, add it with the subfeature
        newEntitlements[featureId] = {
          granual_settings: {
            enabled: true,
            subfeatures: [{ id: subfeatureId, enabled: checked }],
          },
        };
      } else {
        // Feature exists, update the subfeature
        const subfeatures =
          newEntitlements[featureId].granual_settings?.subfeatures || [];
        const subfeatureIndex = subfeatures.findIndex(
          (s) => s.id === subfeatureId
        );

        if (subfeatureIndex === -1) {
          // Subfeature doesn't exist, add it
          subfeatures.push({ id: subfeatureId, enabled: checked });
        } else {
          // Update existing subfeature
          subfeatures[subfeatureIndex].enabled = checked;
        }

        newEntitlements[featureId].granual_settings = {
          enabled: true,
          subfeatures,
        };
      }

      return {
        ...prev,
        detailed_entitlements: newEntitlements,
      };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setFormErrors({});

    const submissionData = {
      ...formData,
      valid_from: formData.valid_from.toISOString(),
      valid_until: formData.valid_until ? formData.valid_until.toISOString() : null,
    };

    try {
      await onSubmit(submissionData);
      // Clear form errors on success
      setFormErrors({});
    } catch (error: any) {
      console.error("Failed to submit form:", error);

      // Handle API error responses
      if (error.response && error.response.data) {
        const errorData = error.response.data;

        // Check for field-specific errors
        if (typeof errorData === "object") {
          const newFormErrors: Record<string, string> = {};

          // Handle name field error specifically for duplicate plans
          if (errorData.name) {
            if (Array.isArray(errorData.name)) {
              newFormErrors.name = errorData.name[0];
            } else {
              newFormErrors.name = errorData.name;
            }

            // Show snackbar for duplicate plan name
            if (newFormErrors.name.includes("already exists")) {
              setSnackbarMessage(
                "A subscription plan with this name already exists"
              );
              setSnackbarOpen(true);
            }
          }

          // Handle other field errors
          Object.keys(errorData).forEach((key) => {
            if (key !== "name") {
              if (Array.isArray(errorData[key])) {
                newFormErrors[key] = errorData[key][0];
              } else {
                newFormErrors[key] = errorData[key];
              }
            }
          });

          setFormErrors(newFormErrors);
        } else {
          // Generic error message
          setSnackbarMessage("Failed to create subscription plan");
          setSnackbarOpen(true);
        }
      } else {
        // Generic error message for non-API errors
        setSnackbarMessage(
          "An error occurred while creating the subscription plan"
        );
        setSnackbarOpen(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // const handleSnackbarClose = () => {
  //   setSnackbarOpen(false);
  // };

  return (
    <Grid
      container
      component="form"
      onSubmit={handleSubmit}
      spacing={3}
      sx={{ width: "100%" }}
    >
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="error"
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
      <Grid item xs={12} component="div" width={1}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Typography variant="h5">Create New Plan</Typography>
            </Grid>
            <Grid item>
              <Grid container spacing={2}>
                <Grid item>
                  <Button onClick={onCancel} variant="outlined" size="large">
                    Cancel
                  </Button>
                </Grid>
                <Grid item>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading}
                  >
                    Create Plan
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Basic Information
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Plan Name"
                name="name"
                value={formData.name}
                onChange={handleTextFieldChange}
                required
                error={!!formErrors.name}
                helperText={formErrors.name || ""}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleSelectChange}
                  label="Status"
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="deprecated">Deprecated</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price"
                name="price"
                type="number"
                value={formData.price}
                onChange={handleTextFieldChange}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Billing Cycle</InputLabel>
                <Select
                  name="billing_cycle"
                  value={formData.billing_cycle}
                  onChange={handleSelectChange}
                  label="Billing Cycle"
                  required
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                  <MenuItem value="one_time">One Time</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Valid From"
                  value={formData.valid_from}
                  onChange={(newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      valid_from: newValue || new Date(),
                    }));
                  }}
                  sx={{ width: "100%" }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Valid Until"
                  value={formData.valid_until}
                  onChange={(newValue) => {
                    setFormData((prev) => ({
                      ...prev,
                      valid_until: newValue,
                    }));
                  }}
                  sx={{ width: "100%" }}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ minWidth: 200 }}>
                <InputLabel>Line of Business</InputLabel>
                <Select
                  name="line_of_business"
                  value={formData.line_of_business || ""}
                  onChange={(e) => {
                    const value =
                      e.target.value === "" ? null : Number(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      line_of_business: value,
                    }));
                  }}
                  label="Line of Business"
                >
                  <MenuItem value="">None</MenuItem>
                  {linesOfBusiness.map((lob) => (
                    <MenuItem key={lob.id} value={lob.id}>
                      {lob.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleTextFieldChange}
                multiline
                rows={3}
              />
            </Grid> */}
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Plan Limits
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Maximum Users"
                name="max_users"
                type="number"
                value={formData.max_users}
                onChange={handleTextFieldChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Transaction Limit"
                name="transaction_limit"
                type="number"
                value={formData.transaction_limit}
                onChange={handleTextFieldChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Call Limit"
                name="api_call_limit"
                type="number"
                value={formData.api_call_limit}
                onChange={handleTextFieldChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Storage Limit (GB)"
                name="storage_limit"
                type="number"
                value={formData.storage_limit}
                onChange={handleTextFieldChange}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Session Type</InputLabel>
                <Select
                  name="session_type"
                  value={formData.session_type}
                  onChange={handleSelectChange}
                  label="Session Type"
                >
                  <MenuItem value="concurrent">Concurrent</MenuItem>
                  <MenuItem value="named">Named</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Support Level</InputLabel>
                <Select
                  name="support_level"
                  value={formData.support_level}
                  onChange={handleSelectChange}
                  label="Support Level"
                >
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>
      </Grid>

      <Grid item xs={12} width="100%">
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            {isEditMode ? 'Edit Features' : 'Features'}
          </Typography>
          {loading ? (
            <Grid container justifyContent="center" sx={{ p: 3 }}>
              <CircularProgress />
            </Grid>
          ) : error ? (
            <Typography color="error">{error}</Typography>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} width="100%">
                <FormControl fullWidth>
                  <InputLabel>Select Application</InputLabel>
                  <Select
                    multiple
                    value={selectedApps}
                    onChange={handleAppChange}
                    label="Select Applications"
                    renderValue={(selected) =>
                      applications
                        .filter((app) => selected.includes(app.application))
                        .map((app) => app.application_name)
                        .join(", ")
                    }
                  >
                    {applications.map((app) => (
                      <MenuItem key={app.application} value={app.application}>
                        {app.application_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedApps.length > 0 && (
                <Grid item xs={12}>
                  <Grid container spacing={2}>
                    {applications
                      .filter((app) => selectedApps.includes(app.application))
                      .flatMap((app) => app.features)
                      .map((feature) => (
                        <Grid item xs={12} key={feature.id} component="div">
                          <Paper sx={{ p: 2 }}>
                            <Grid container spacing={2} direction="column">
                              <Grid item xs={12} component="div">
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={isFeatureSelected(
                                        feature.id.toString()
                                      )}
                                      onChange={(e) =>
                                        handleFeatureChange(e, feature)
                                      }
                                      name={feature.key}
                                    />
                                  }
                                  label={
                                    <Grid container direction="column">
                                      <Typography variant="subtitle1">
                                        {feature.name}
                                      </Typography>
                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {feature.description}
                                      </Typography>
                                    </Grid>
                                  }
                                />
                              </Grid>

                              {feature.granual_settings?.subfeatures && (
                                <Grid
                                  item
                                  xs={12}
                                  component="div"
                                  sx={{ pl: 4 }}
                                >
                                  <Grid container spacing={1}>
                                    {feature.granual_settings.subfeatures.map(
                                      (subfeature) => (
                                        <Grid
                                          item
                                          xs={12}
                                          key={subfeature.id}
                                          component="div"
                                        >
                                          <FormControlLabel
                                            control={
                                              <Checkbox
                                                checked={isSubfeatureEnabled(
                                                  feature.id.toString(),
                                                  subfeature.id.toString()
                                                )}
                                                onChange={(e) =>
                                                  handleSubfeatureChange(
                                                    e,
                                                    feature,
                                                    subfeature.id
                                                  )
                                                }
                                                name={`${feature.key}_${subfeature.id}`}
                                                disabled={
                                                  !isFeatureSelected(
                                                    feature.id.toString()
                                                  )
                                                }
                                                size="small"
                                              />
                                            }
                                            label={
                                              <Grid
                                                container
                                                direction="column"
                                              >
                                                <Typography variant="body2">
                                                  {subfeature.name}
                                                </Typography>
                                                <Typography
                                                  variant="caption"
                                                  color="text.secondary"
                                                >
                                                  {subfeature.description}
                                                </Typography>
                                              </Grid>
                                            }
                                          />
                                        </Grid>
                                      )
                                    )}
                                  </Grid>
                                </Grid>
                              )}
                            </Grid>
                          </Paper>
                        </Grid>
                      ))}
                  </Grid>
                </Grid>
              )}
            </Grid>
          )}
        </Paper>
      </Grid>

      <Grid item xs={12} container spacing={2} justifyContent="flex-end">
        {onCancel && (
          <Grid item>
            <Button
              variant="outlined"
              color="primary"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </Grid>
        )}
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            type="submit"
          >
            {isEditMode ? 'Edit Plan' : 'Create Plan'}
          </Button>
        </Grid>
      </Grid>
    </Grid>
  );
}
