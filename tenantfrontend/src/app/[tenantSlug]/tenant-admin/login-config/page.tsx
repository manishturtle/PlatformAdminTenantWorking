"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Grid,
  FormHelperText,
  Alert,
  Snackbar,
  Divider,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";

export default function LoginConfigPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;

  // State for form fields
  const [brandName, setBrandName] = useState("");
  const [fontFamily, setFontFamily] = useState("");
  const [themeColor, setThemeColor] = useState("#1976d2");
  const [appLanguage, setAppLanguage] = useState("en");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Available language options
  const languageOptions = [
    { value: "en", label: "English" },
    { value: "ar", label: "Arabic" },
    { value: "es", label: "Spanish" },
    { value: "fr", label: "French" },
    { value: "de", label: "German" },
  ];

  // Load existing configuration on component mount
  useEffect(() => {
    if (!tenantSlug) return;
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:8000/api/${tenantSlug}/tenant-admin/login-config/`
        );
        if (response.ok) {
          const data = await response.json();
          setBrandName(data.brand_name || "");
          setFontFamily(data.font_family || "");
          setThemeColor(data.theme_color || "#1976d2");
          setAppLanguage(data.app_language || "en");
          if (data.logo) {
            setLogoPreview(`http://localhost:8000${data.logo}`);
          }
        }
      } catch (err) {
        console.error("Error fetching login config:", err);
        setError("Could not load existing configuration.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [tenantSlug]);

  // Handle logo file selection
  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const allowedTypes = ["image/jpeg", "image/png", "image/svg+xml"];
      if (!allowedTypes.includes(file.type)) {
        setError("Please select a valid image file (PNG, JPG, or SVG).");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError("Image size should not exceed 2MB.");
        return;
      }
      setLogoFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("brand_name", brandName);
      formData.append("font_family", fontFamily);
      formData.append("theme_color", themeColor);
      formData.append("app_language", appLanguage);
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await fetch(
        `http://localhost:8000/api/${tenantSlug}/tenant-admin/login-config/`,
        {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save configuration.");
      }
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => setSuccess(false);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          {/* HEADER WITH TITLE AND SAVE BUTTON */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="h4" component="h1">
              Login Page Configuration
            </Typography>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Configuration"}
            </Button>
          </Box>
          <Typography variant="body1" color="text.secondary" paragraph>
            Customize the appearance of your login page to match your brand identity.
          </Typography>
          <Divider sx={{ my: 3 }} />

          {/* MAIN CONTENT GRID */}
          <Grid container spacing={4}>
            {/* --- COLUMN 1: BRAND NAME, FONT, LOGO --- */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  label="Brand Name"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  variant="outlined"
                />
                <TextField
                  fullWidth
                  label="Font Family"
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  variant="outlined"
                  placeholder="e.g., 'Roboto', sans-serif"
                />
                
                <Box mt={2}>
                   <Typography variant="h6" gutterBottom>
                     Company Logo
                   </Typography>
                   <Paper
                     variant="outlined"
                     sx={{
                       p: 2,
                       display: "flex",
                       alignItems: "center",
                       justifyContent: "center",
                       minHeight: 180,
                       bgcolor: "grey.50",
                       mb: 2,
                     }}
                   >
                     {logoPreview ? (
                       <Box
                         component="img"
                         src={logoPreview}
                         alt="Logo preview"
                         sx={{ maxWidth: "80%", maxHeight: 150, objectFit: "contain" }}
                       />
                     ) : (
                       <Typography color="text.secondary">
                         Logo preview
                       </Typography>
                     )}
                   </Paper>
                   <Button
                     component="label"
                     variant="outlined"
                     startIcon={<CloudUploadIcon />}
                     fullWidth
                   >
                     Upload Logo
                     <input
                       type="file"
                       accept="image/png, image/jpeg, image/svg+xml"
                       onChange={handleLogoChange}
                       hidden
                     />
                   </Button>
                    <FormHelperText sx={{ mt: 1, textAlign: 'center' }}>
                      PNG, JPG, SVG. Max size: 2MB.
                    </FormHelperText>
                </Box>
              </Box>
            </Grid>

            {/* --- COLUMN 2: THEME COLOR, LANGUAGE --- */}
            <Grid item xs={12} md={6}>
               <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                 <TextField
                   fullWidth
                   label="Theme Color"
                   type="color"
                   value={themeColor}
                   onChange={(e) => setThemeColor(e.target.value)}
                   variant="outlined"
                   InputLabelProps={{ shrink: true }}
                   helperText="Select the primary color for your theme."
                 />
                 <TextField
                   fullWidth
                   select
                   label="Application Language"
                   value={appLanguage}
                   onChange={(e) => setAppLanguage(e.target.value)}
                   variant="outlined"
                   SelectProps={{ native: true }}
                   helperText="Select the default language."
                 >
                   {languageOptions.map((option) => (
                     <option key={option.value} value={option.value}>
                       {option.label}
                     </option>
                   ))}
                 </TextField>
               </Box>
            </Grid>
          </Grid>

          {/* ERROR MESSAGE DISPLAY */}
          {error && (
            <Alert severity="error" sx={{ mt: 4 }}>
              {error}
            </Alert>
          )}
        </Box>
      </Paper>

      {/* SUCCESS NOTIFICATION */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Login page configuration saved successfully!
        </Alert>
      </Snackbar>
    </Container>
  );
}