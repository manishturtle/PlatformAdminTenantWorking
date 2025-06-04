"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getAuthHeader } from "../utils/authUtils";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  OutlinedInput,
  Chip,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { Theme, useTheme } from "@mui/material/styles";

interface Application {
  app_id: string | number;
  application_name: string;
}

interface FormData {
  email: string;
  first_name: string;
  last_name: string;
  applications: string[];
  is_active: boolean;
  isSuperAdmin: boolean;
}

interface EditTenantUserFormProps {
  open: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  userId: string | number;
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

function getStyles(
  name: string,
  selectedItems: readonly string[],
  theme: Theme
) {
  return {
    fontWeight:
      selectedItems.indexOf(name) === -1
        ? theme.typography.fontWeightRegular
        : theme.typography.fontWeightMedium,
  };
}

const EditTenantUserForm = ({
  open,
  onClose,
  onUserUpdated,
  userId,
}: EditTenantUserFormProps) => {
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;
  const theme = useTheme();

  const [formData, setFormData] = useState<FormData>({
    email: "",
    first_name: "",
    last_name: "",
    applications: [],
    is_active: true,
    isSuperAdmin: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [appsLoading, setAppsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load applications
  useEffect(() => {
    if (open) {
      loadApplications();
      loadUserData();
    }
  }, [open, userId]);

  const loadApplications = async () => {
    setAppsLoading(true);
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(
        `http://localhost:8000/platform-admin/api/tenant-applications/${tenantSlug}/`,
        {
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const applications = await response.json();
      // Transform the response to match the expected format
      const transformedApps = applications.map((app: any) => ({
        app_id: app.app_id,
        application_name: app.application_name,
      }));
      setApplications(transformedApps);
    } catch (error) {
      console.error("Error loading applications:", error);
      setApplications([]); // Set to empty array on error
    } finally {
      setAppsLoading(false);
    }
  };

  const loadUserData = async () => {
    setLoadingUser(true);
    try {
      const authHeader = getAuthHeader();
      const response = await fetch(
        `http://localhost:8000/api/${tenantSlug}/tenant-admin/users/${userId}/`,
        {
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userData = await response.json();

      // Get user applications
      const userApps = userData.applications || [];
      const appIds = Array.isArray(userApps)
        ? userApps.map((app: any) => app.id.toString())
        : [];

      setFormData({
        email: userData.email || "",
        first_name: userData.first_name || "",
        last_name: userData.last_name || "",
        applications: appIds,
        is_active: userData.is_active,
        isSuperAdmin: userData.is_super_admin || false,
      });
    } catch (error) {
      console.error("Error loading user data:", error);
      setSubmitError("Failed to load user data. Please try again.");
    } finally {
      setLoadingUser(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear error when field is edited
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: "",
      });
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleApplicationChange = (
    event: SelectChangeEvent<typeof formData.applications>
  ) => {
    const {
      target: { value },
    } = event;

    setFormData({
      ...formData,
      applications: typeof value === "string" ? value.split(",") : value,
    });

    if (errors.applications) {
      setErrors({
        ...errors,
        applications: "",
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name) {
      newErrors.first_name = "First name is required";
    }

    if (!formData.last_name) {
      newErrors.last_name = "Last name is required";
    }

    if (!formData.applications || formData.applications.length === 0) {
      newErrors.applications = "Please select at least one application";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/${tenantSlug}/tenant-admin/users/${userId}/`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeader(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            first_name: formData.first_name,
            last_name: formData.last_name,
            application_ids: formData.applications,
            is_active: formData.is_active,
            isSuperAdmin: formData.isSuperAdmin,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      setSuccess(true);
      setTimeout(() => {
        onUserUpdated();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating user:", error);
      setSubmitError(
        error.message || "Failed to update user. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit User</DialogTitle>
      <DialogContent>
        {loadingUser ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            component="form"
            noValidate
            sx={{ mt: 1 }}
            onSubmit={handleSubmit}
          >
            {submitError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {submitError}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                User updated successfully!
              </Alert>
            )}

            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled // Email cannot be changed
              autoComplete="off"
              inputProps={{ autoComplete: "new-email" }}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="first_name"
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleInputChange}
              error={!!errors.first_name}
              helperText={errors.first_name}
            />

            <TextField
              margin="normal"
              required
              fullWidth
              id="last_name"
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleInputChange}
              error={!!errors.last_name}
              helperText={errors.last_name}
            />

            <FormControl
              fullWidth
              margin="normal"
              required
              error={!!errors.applications}
              disabled={loading || appsLoading || success}
            >
              <InputLabel id="applications-select-label">
                Applications
              </InputLabel>
              <Select
                labelId="applications-select-label"
                id="applications"
                name="applications"
                value={formData.applications}
                label="Applications"
                onChange={handleApplicationChange}
                multiple
                displayEmpty
                renderValue={(selected: string[]) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {(selected as string[]).map((value) => {
                      const app = applications.find(
                        (a) => a.app_id.toString() === value
                      );
                      return app ? (
                        <Box
                          key={value}
                          sx={{
                            bgcolor: "primary.light",
                            color: "white",
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: "0.875rem",
                          }}
                        >
                          {app.application_name}
                        </Box>
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {appsLoading ? (
                  <MenuItem disabled>Loading applications...</MenuItem>
                ) : applications.length === 0 ? (
                  <MenuItem disabled>No applications available</MenuItem>
                ) : (
                  applications.map((app) => (
                    <MenuItem value={app.app_id.toString()}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography>{app.application_name}</Typography>
                        {app.is_active && (
                          <Typography
                            sx={{ color: "success.main", fontSize: "0.875rem" }}
                          >
                            Active
                          </Typography>
                        )}
                      </Box>
                    </MenuItem>
                  ))
                )}
              </Select>
              {errors.applications && (
                <FormHelperText>{errors.applications}</FormHelperText>
              )}
            </FormControl>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.is_active}
                  onChange={handleCheckboxChange}
                  name="is_active"
                />
              }
              label="Active"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isSuperAdmin}
                  onChange={handleCheckboxChange}
                  name="isSuperAdmin"
                />
              }
              label="Super Admin"
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading || loadingUser}
        >
          {loading ? <CircularProgress size={24} /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTenantUserForm;
