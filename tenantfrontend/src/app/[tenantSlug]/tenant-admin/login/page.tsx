"use client";
import React, { useState } from "react";
import { useParams } from "next/navigation";
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
import { useRouter } from "next/navigation";

export default function TenantAdminLoginPage() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [userChecked, setUserChecked] = useState(false);

  // Login API call
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setChecking(true);
    try {
      // 1. Check user
      const checkRes = await fetch(
        `https://bedevcockpit.turtleit.in/api/${tenantSlug}/tenant-admin/auth/check-user/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      if (!checkRes.ok) throw new Error("User not found");
      // 2. Login
      const loginRes = await fetch(
        `https://bedevcockpit.turtleit.in/api/${tenantSlug}/tenant-admin/auth/login/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );
      if (!loginRes.ok) {
        const data = await loginRes.json().catch(() => ({}));
        throw new Error(data?.message || "Login failed");
      }

      const data = await loginRes.json();

      // Store token and user data in localStorage
      if (data.token) {
        console.log("Token received from API:", data.token);

        // The token is an object with access and refresh properties
        if (typeof data.token === "object" && data.token !== null) {
          if (data.token.access) {
            // Extract just the access token string and store it directly
            console.log("Extracting access token from response object");
            localStorage.setItem("token", data.token.access);
          } else {
            console.error("Token object does not have access property");
            // Fallback - stringify the whole token object
            localStorage.setItem("token", JSON.stringify(data.token));
          }
        } else if (typeof data.token === "string") {
          // If it's already a string, store it directly
          console.log("Token is already a string");
          // Remove Bearer prefix if present
          let tokenStr = data.token;
          if (tokenStr.startsWith("Bearer ")) {
            tokenStr = tokenStr.substring(7);
          }
          localStorage.setItem("token", tokenStr);
        } else {
          console.error("Unexpected token format:", typeof data.token);
          // Last resort fallback
          localStorage.setItem("token", String(data.token));
        }

        // For debugging
        console.log(
          "Token stored in localStorage:",
          localStorage.getItem("token")
        );
      } else {
        console.error("No token received from API");
      }

      if (data.user) {
        console.log("User data received:", data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      setSuccess(true);
      setError("");

      // 3. Redirect to dashboard after a small delay to ensure state updates
      setTimeout(() => {
        router.replace(`/${tenantSlug}/tenant-admin/dashboard`);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Login failed");
      setSuccess(false);
    } finally {
      setChecking(false);
    }
  };

  return (
    <Box maxWidth={400} mx="auto" mt={12}>
      <Card elevation={6}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <LockOpenIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
            <Typography variant="h4" fontWeight="bold">
              {tenantSlug
                ? `${tenantSlug.toUpperCase()} Admin Login`
                : "Tenant Admin Login"}
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
