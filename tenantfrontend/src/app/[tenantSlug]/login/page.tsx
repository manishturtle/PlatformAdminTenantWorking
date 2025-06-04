"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  TextField,
  Button,
  Typography,
  Container,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Link as MuiLink,
} from "@mui/material";
import { getAuthHeader } from "../../../utils/authUtils";

interface UserCheckResponse {
  exists: boolean;
  has_role: boolean;
}

interface LoginConfig {
  brand_name: string;
  logo: string;
}

interface LoginResponse {
  token: {
    access: string;
    refresh: string;
  };
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    is_staff: boolean;
    is_tenant_admin: boolean;
    has_role: boolean;
    redirect_app_url: string;
  };
  requires_2fa?: boolean;
  needs_2fa_setup?: boolean;
  user_id?: number;
  tenant_info?: any;
}

const theme = createTheme({
  palette: {
    primary: {
      main: "#1e8e3e",
    },
    secondary: {
      main: "#f50057",
    },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#ffffff",
        },
      },
    },
  },
});

export default function TenantLoginPage({
  params: paramsPromise,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const params = React.use(paramsPromise);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info" as "info" | "success" | "warning" | "error",
  });
  const [loginConfig, setLoginConfig] = useState<LoginConfig | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenantSlug } = params || {};

  // Redirect if no tenant slug
  useEffect(() => {
    if (!tenantSlug) {
      router.replace("/");
    }
  }, [tenantSlug, router]);

  // Fetch login configuration
  useEffect(() => {
    const fetchLoginConfig = async () => {
      if (!tenantSlug) return; // Don't fetch if tenantSlug is undefined

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, ""); // Remove trailing slash if present
        const response = await fetch(
          `http://localhost:8000/api/${tenantSlug}/tenant-admin/login-config/`
        );
        if (response.ok) {
          const data = await response.json();
          setLoginConfig(data);
        }
      } catch (error) {
        console.error("Error fetching login config:", error);
      }
    };

    fetchLoginConfig();
  }, [tenantSlug]);

  useEffect(() => {
    // Log tenant information
    if (tenantSlug) {
      console.log(`Tenant slug: ${tenantSlug}`);
    }

    // Set email from URL query parameter if available
    const emailParam = searchParams.get("email");
    if (emailParam && !email) {
      setEmail(emailParam);
      // If email is in URL, automatically check if user exists
      if (validateEmail(emailParam)) {
        checkUser(emailParam);
      }
    }
  }, [tenantSlug, searchParams]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) setEmailError("");
    // Reset user exists state when email changes
    if (userExists) setUserExists(false);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) setPasswordError("");
  };

  const validateEmail = (email: string) => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
  };

  const checkUser = async (emailToCheck: string = email) => {
    // Reset errors
    setEmailError("");

    // Validate email
    if (!emailToCheck) {
      setEmailError("Email is required");
      return;
    } else if (!validateEmail(emailToCheck)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    // Check if user exists
    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, ""); // Remove trailing slash if present
      const response = await fetch(
        `http://localhost:8000/api/${tenantSlug}/tenant/auth/check-user/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: emailToCheck }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to check user");
      }

      const data: UserCheckResponse = await response.json();
      console.log("User check response:", data);

      if (data.exists) {
        setUserExists(true);

        // Check if user has a role
        if (!data.has_role) {
          setSnackbar({
            open: true,
            message:
              "Your account exists but does not have any assigned roles. Please contact your administrator.",
            severity: "warning",
          });
        }

        // Update URL with email parameter without navigation
        const url = new URL(window.location.href);
        url.searchParams.set("email", emailToCheck);
        window.history.replaceState({}, "", url.toString());
      } else {
        // User doesn't exist
        setSnackbar({
          open: true,
          message:
            "User not found. Please check your email or contact support.",
          severity: "error",
        });
      }

      setLoading(false);
    } catch (error) {
      console.error("Error checking user:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message: "Error checking user. Please try again.",
        severity: "error",
      });
    }
  };

  const handleCheckUser = (e: React.FormEvent) => {
    e.preventDefault();
    checkUser();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset errors
    setEmailError("");
    setPasswordError("");

    // Validate inputs
    let hasError = false;

    if (!email) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) return;

    // Attempt login
    setLoading(true);
    try {
      // Get currentUrl from searchParams
      const currentUrl =
        searchParams.get("currentUrl") ||
        `${
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"
        }/${tenantSlug}`;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, ""); // Remove trailing slash if present
      const response = await fetch(
        `http://localhost:8000/api/${tenantSlug}/tenant/auth/login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            redirect_url: currentUrl,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Login failed");
      }

      const data: LoginResponse = await response.json();

      // Store token and user data in localStorage
      localStorage.setItem("token", data.token.access);
      localStorage.setItem("refresh_token", data.token.refresh);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to the URL provided by the API
      if (data.user.redirect_app_url) {
        window.location.href = data.user.redirect_app_url;
      } else {
        // Fallback to dashboard if no redirect URL provided
        router.push(`/${tenantSlug}/dashboard`);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      setLoading(false);
      setSnackbar({
        open: true,
        message:
          error.message ||
          "Login failed. Please check your credentials and try again.",
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({
      ...snackbar,
      open: false,
    });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        <Container component="main" maxWidth="xs">
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Paper
              elevation={3}
              sx={{
                padding: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "100%",
              }}
            >
              <Box sx={{ mb: 3, display: "flex", justifyContent: "center" }}>
                {loginConfig?.logo ? (
                  <img
                    src={`${
                      process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
                      "http://localhost:8000"
                    }${loginConfig.logo}`}
                    alt={loginConfig.brand_name || "Company Logo"}
                    style={{
                      maxWidth: "200px",
                      maxHeight: "100px",
                      objectFit: "contain",
                    }}
                  />
                ) : (
                  <img
                    src="/default-logo.png"
                    alt="Default Logo"
                    style={{
                      maxWidth: "200px",
                      maxHeight: "100px",
                      objectFit: "contain",
                    }}
                  />
                )}
              </Box>
              <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                {loginConfig?.brand_name ||
                  (userExists ? "Sign in" : "Welcome")}
              </Typography>

              {userExists ? (
                <Box
                  component="form"
                  onSubmit={handleLogin}
                  noValidate
                  sx={{ mt: 1, width: "100%" }}
                >
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    error={!!emailError}
                    helperText={emailError}
                    disabled={loading}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={handlePasswordChange}
                    error={!!passwordError}
                    helperText={passwordError}
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : "Sign In"}
                  </Button>
                  <Box sx={{ mt: 2, textAlign: "center" }}>
                    <MuiLink
                      href="#"
                      variant="body2"
                      onClick={(e) => {
                        e.preventDefault();
                        setUserExists(false);
                      }}
                    >
                      Use a different email
                    </MuiLink>
                  </Box>
                </Box>
              ) : (
                <Box
                  component="form"
                  onSubmit={handleCheckUser}
                  noValidate
                  sx={{ mt: 1, width: "100%" }}
                >
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={handleEmailChange}
                    error={!!emailError}
                    helperText={emailError}
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    sx={{ mt: 3, mb: 2 }}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={24} /> : "Continue"}
                  </Button>
                </Box>
              )}

              <Box sx={{ mt: 2, textAlign: "center" }}>
                <Typography variant="body2">
                  Need help? Contact your administrator
                </Typography>
              </Box>
            </Paper>
          </Box>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={handleCloseSnackbar}
            anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
          >
            <Alert
              onClose={handleCloseSnackbar}
              severity={snackbar.severity}
              sx={{ width: "100%" }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
