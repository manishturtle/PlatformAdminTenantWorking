"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Collapse,
  Chip,
  Paper,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Select,
  MenuItem,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Upload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";

import yaml from "js-yaml";
import { getAuthHeader } from "@/utils/authUtils";

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

interface UploadResponse {
  created_features: string[];
  updated_features: string[];
  errors: string[];
  application: {
    id: number;
    name: string;
  };
}

interface FeatureResponse {
  features: ApplicationFeatures[];
}

function EditDialog({ open, onClose, onSave, title, initialValue }: any) {
  const [value, setValue] = useState(initialValue);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {title}
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          value={value}
          onChange={(e) => setValue(e.target.value)}
          margin="normal"
          label="Name"
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

const FeaturesPage: React.FC = () => {
  const [features, setFeatures] = useState<ApplicationFeatures[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editFeatureDialogOpen, setEditFeatureDialogOpen] = useState(false);
  const [editSubfeatureDialogOpen, setEditSubfeatureDialogOpen] =
    useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [selectedSubfeature, setSelectedSubfeature] =
    useState<SubFeature | null>(null);
  const [expandedFeatures, setExpandedFeatures] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/platform-admin/subscription/features/get_features/",
        {
          headers: await getAuthHeader(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch features");
      }

      const data = await response.json();
      setFeatures(data); // The API now returns array of ApplicationFeatures directly
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch features");
      setFeatures([]); // Set empty array on error
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File selected:", event.target.files);
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    console.log("Starting upload with file:", selectedFile);
    if (!selectedFile) {
      console.log("No file selected");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(false);

    try {
      // First read the YAML file to get the application_name
      const fileContent = await selectedFile.text();
      const yamlData = yaml.load(fileContent) as { application_name: string };

      if (!yamlData.application_name) {
        throw new Error("YAML file must contain application_name field");
      }

      const formData = new FormData();
      formData.append("yaml_file", selectedFile);
      formData.append("application_name", yamlData.application_name);

      const response = await fetch(
        "http://localhost:8000/api/platform-admin/subscription/features/upload_yaml/",
        {
          method: "POST",
          headers: await getAuthHeader(),
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload YAML file");
      }

      const result: UploadResponse = await response.json();

      // Show success message with details
      const successParts: string[] = [];
      if (result.created_features?.length > 0) {
        successParts.push(
          `Created features: ${result.created_features.join(", ")}`
        );
      }
      if (result.updated_features?.length > 0) {
        successParts.push(
          `Updated features: ${result.updated_features.join(", ")}`
        );
      }

      setUploadSuccess(true);
      await fetchFeatures(); // Refresh features after successful upload
      setSelectedFile(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload YAML file"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleEditFeature = (feature: Feature) => {
    setSelectedFeature(feature);
    setEditFeatureDialogOpen(true);
  };

  const handleEditSubfeature = (feature: Feature, subfeature: SubFeature) => {
    setSelectedFeature(feature);
    setSelectedSubfeature(subfeature);
    setEditSubfeatureDialogOpen(true);
  };

  const handleRemoveSubfeature = async (
    feature: Feature,
    subfeatureId: number
  ) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/platform-admin/subscription/features/${feature.id}/remove_subfeature/`,
        {
          method: "DELETE",
          headers: {
            ...(await getAuthHeader()),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subfeature_id: subfeatureId }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to remove subfeature");
      }

      // Refresh features after removing subfeature
      await fetchFeatures();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove subfeature"
      );
    }
  };

  const toggleFeatureExpanded = (featureKey: string) => {
    setExpandedFeatures((prev) => ({
      ...prev,
      [featureKey]: !prev[featureKey],
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Features Management
        </Typography>
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          <Button
            variant="contained"
            component="label"
            startIcon={<UploadIcon />}
            disabled={uploading}
          >
            Select YAML
            <input
              type="file"
              hidden
              accept=".yaml,.yml"
              onChange={handleFileChange}
            />
          </Button>
          {selectedFile && (
            <>
              <Typography variant="body2">{selectedFile.name}</Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={uploading}
                startIcon={
                  uploading ? <CircularProgress size={20} /> : undefined
                }
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </>
          )}
        </Box>
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {uploadSuccess && (
          <Alert
            severity="success"
            onClose={() => setUploadSuccess(false)}
            sx={{ mb: 2 }}
          >
            Features uploaded successfully!
          </Alert>
        )}
      </Box>

      {uploading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {features.map((appFeatures) => (
            <Card key={appFeatures.application} sx={{ mb: 3 }}>
              <CardHeader
                title={`Application: ${appFeatures.application_name}`}
                sx={{ bgcolor: "primary.main", color: "white" }}
              />
              <CardContent>
                <List>
                  {appFeatures.features.map((feature) => (
                    <React.Fragment key={feature.id}>
                      <ListItem
                        secondaryAction={
                          <IconButton
                            edge="end"
                            onClick={() => handleEditFeature(feature)}
                          >
                            <EditIcon />
                          </IconButton>
                        }
                      >
                        <ListItemText
                          primary={
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  toggleFeatureExpanded(feature.key)
                                }
                              >
                                {expandedFeatures[feature.key] ? (
                                  <ExpandMoreIcon />
                                ) : (
                                  <ChevronRightIcon />
                                )}
                              </IconButton>
                              <Typography>{feature.name}</Typography>
                              <Chip
                                label={
                                  feature.is_active ? "Active" : "Inactive"
                                }
                                color={
                                  feature.is_active ? "success" : "default"
                                }
                                size="small"
                                sx={{ ml: 1 }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2">
                                {feature.description}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="textSecondary"
                              >
                                Last updated:{" "}
                                {new Date(feature.updated_at).toLocaleString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      <Collapse in={expandedFeatures[feature.key]}>
                        <List sx={{ pl: 4 }}>
                          {feature.granual_settings?.subfeatures?.map(
                            (subfeature) => (
                              <ListItem
                                key={subfeature.id}
                                secondaryAction={
                                  <Box>
                                    <IconButton
                                      edge="end"
                                      onClick={() =>
                                        handleEditSubfeature(
                                          feature,
                                          subfeature
                                        )
                                      }
                                    >
                                      <EditIcon />
                                    </IconButton>
                                    <IconButton
                                      edge="end"
                                      onClick={() =>
                                        handleRemoveSubfeature(
                                          feature,
                                          subfeature.id
                                        )
                                      }
                                    >
                                      <DeleteIcon />
                                    </IconButton>
                                  </Box>
                                }
                              >
                                <ListItemText
                                  primary={
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Typography>{subfeature.name}</Typography>
                                      <Chip
                                        label={
                                          subfeature.settings?.enabled
                                            ? "Enabled"
                                            : "Disabled"
                                        }
                                        color={
                                          subfeature.settings?.enabled
                                            ? "success"
                                            : "default"
                                        }
                                        size="small"
                                        sx={{ ml: 1 }}
                                      />
                                    </Box>
                                  }
                                  secondary={
                                    <Box>
                                      <Typography variant="body2">
                                        {subfeature.description}
                                      </Typography>
                                      {Object.entries(subfeature.settings)
                                        .filter(([key]) => key !== "enabled")
                                        .map(([key, value]) => (
                                          <Typography
                                            key={key}
                                            variant="caption"
                                            display="block"
                                            color="textSecondary"
                                          >
                                            {key}:{" "}
                                            {Array.isArray(value)
                                              ? value.join(", ")
                                              : JSON.stringify(value)}
                                          </Typography>
                                        ))}
                                    </Box>
                                  }
                                />
                              </ListItem>
                            )
                          )}
                        </List>
                      </Collapse>
                      <Divider component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FeaturesPage;
