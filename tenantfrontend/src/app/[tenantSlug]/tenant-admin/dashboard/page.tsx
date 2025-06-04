"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Paper,
  Typography,
  Box,
  Button,
  CircularProgress,
  Card,
  CardContent,
  CardActions,
  Alert,
  Divider,
  Container,
} from "@mui/material";
import Grid from "@mui/material/Grid";

export default function TenantAdminDashboard() {
  const router = useRouter();
  const params = useParams();
  const tenantSlug = params?.tenantSlug as string;
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace(`/${tenantSlug}/tenant-admin/login`);
      return;
    }

    // Fetch subscription details
    fetch(
      `http://localhost:8000/platform-admin/api/tenant-subscription/${tenantSlug}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch subscription details");
        }
        return response.json();
      })
      .then((data) => {
        setSubscriptionDetails(data);
      })
      .catch((err) => {
        console.error("Error fetching subscription details:", err);
      });

    // Fetch tenant applications
    fetch(
      `http://localhost:8000/platform-admin/api/tenant-applications/${tenantSlug}/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch applications");
        }
        return response.json();
      })
      .then((data) => {
        setApplications(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching applications:", err);
        setError(err.message);
        setIsLoading(false);
      });

    return () => {};
  }, [router, tenantSlug]);

  // Mock dashboard data for initial development
  const mockDashboardData = {
    tenantInfo: {
      name: tenantSlug ? tenantSlug.toUpperCase() : "Your Tenant",
      status: "Active",
      subscription: "Professional Plan",
      usersCount: 12,
      storageUsed: "2.4 GB",
      storageLimit: "10 GB",
    },
    recentActivity: [
      {
        id: 1,
        action: "User login",
        user: "john.doe@example.com",
        timestamp: "2025-03-23T01:15:22Z",
      },
      {
        id: 2,
        action: "Invoice created",
        user: "finance@example.com",
        timestamp: "2025-03-22T22:45:11Z",
      },
      {
        id: 3,
        action: "New user added",
        user: "admin@example.com",
        timestamp: "2025-03-22T18:30:05Z",
      },
    ],
  };

  // Use mock data if real data is not available yet
  const displayData = dashboardData || mockDashboardData;

  if (isLoading)
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
      >
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box maxWidth={600} mx="auto" mt={8}>
        <Alert severity="error">{error}</Alert>
        <Button
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </Box>
    );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome to {displayData.tenantInfo.name} Dashboard
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Manage your tenant resources and settings
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Subscription Details Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscription Details
              </Typography>
              {subscriptionDetails ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Plan: {subscriptionDetails.plan_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Status: {subscriptionDetails.tenant_status}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Price: ${subscriptionDetails.price}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Users: {subscriptionDetails.max_users}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    API Calls: {subscriptionDetails.api_call_limit}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Storage: {subscriptionDetails.storage_limit} GB
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Valid Until: {subscriptionDetails.valid_until}
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Loading subscription details...
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Applications Card */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Assigned Applications
              </Typography>
              {applications.length > 0 ? (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {applications.map((app) => (
                    <Grid item key={app.app_id}>
                      <Card sx={{ minWidth: 200 }}>
                        <CardContent>
                          <Typography variant="h6" component="div">
                            {app.application_name}
                          </Typography>
                          <Typography sx={{ mb: 1.5 }} color="text.secondary">
                            {app.is_active ? "Active" : "Inactive"}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button
                            size="small"
                            onClick={() =>
                              router.push(
                                `/${tenantSlug}/tenant-admin/apps/${app.app_id}`
                              )
                            }
                          >
                            Open
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  No applications assigned
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
