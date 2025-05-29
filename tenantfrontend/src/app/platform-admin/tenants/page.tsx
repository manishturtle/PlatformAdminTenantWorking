"use client";
import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
  IconButton,
  Tooltip,
  Chip,
} from "@mui/material";
import Link from "next/link";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { getAuthHeader } from "../../../utils/authUtils";

interface Plan {
  id: string;
  name: string;
  price: string;
}

interface Application {
  app_id: string;
  application_name: string;
  is_active: boolean;
}

interface Tenant {
  id: number;
  name: string;
  schema_name: string;
  url_suffix: string;
  status: string;
  created_at: string;
  subscription_plan: {
    id: number;
    name: string;
    price: string;
    description: string;
  } | null;
}

interface SubscriptionPlan {
  id: number;
  name: string;
  price: string;
  description: string;
}

const plans: Record<string, Plan> = {
  basic: { id: "basic", name: "Basic Plan", price: "$10/month" },
  pro: { id: "pro", name: "Pro Plan", price: "$20/month" },
  enterprise: { id: "enterprise", name: "Enterprise Plan", price: "$50/month" },
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        setLoading(true);
        const authHeader = getAuthHeader();

        console.log("Fetching tenants from API...");
        const response = await fetch(
          "https://bedevcockpit.turtleit.in/platform-admin/api/tenants/",
          {
            headers: {
              ...authHeader,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error(
            `Failed to fetch tenants: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        console.log("Tenant data received:", data);

        // Handle both paginated and non-paginated responses
        const tenantList = Array.isArray(data.results)
          ? data.results
          : Array.isArray(data)
          ? data
          : [];
        console.log("Processed tenant list:", tenantList);

        setTenants(tenantList);
        setError("");
      } catch (err: any) {
        console.error("Error fetching tenants:", err);
        setError(err.message || "Failed to load tenants");
      } finally {
        setLoading(false);
      }
    };

    fetchTenants();
  }, []);

  const handleAddTenant = () => {
    router.push("/platform-admin/tenants/create");
  };

  const handleEditTenant = (id: number) => {
    router.push(`/platform-admin/tenants/edit/${id}`);
  };

  const handleDeleteTenant = async (id: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this tenant? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const authHeader = getAuthHeader();

      const response = await fetch(
        `https://bedevcockpit.turtleit.in/platform-admin/api/tenants/${id}/`,
        {
          method: "DELETE",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete tenant");
      }

      // Remove the deleted tenant from the list
      setTenants(tenants.filter((tenant) => tenant.id !== id));
    } catch (err: any) {
      console.error("Error deleting tenant:", err);
      setError(err.message || "Failed to delete tenant");
    }
  };

  // Get status color based on tenant status
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "success";
      case "trial":
        return "info";
      case "suspended":
        return "warning";
      case "inactive":
        return "error";
      default:
        return "default";
    }
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
        <Box>
          <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 1 }}>
            <Link href="/platform-admin" passHref>
              <MuiLink underline="hover" color="inherit">
                Dashboard
              </MuiLink>
            </Link>
            <Typography color="text.primary">Tenants</Typography>
          </Breadcrumbs>
          <Typography variant="h4" component="h1">
            Tenants
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddTenant}
        >
          Add Tenant
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
          <Table stickyHeader aria-label="tenants table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>URL</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Subscription Plan</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    No tenants found
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id} hover>
                    <TableCell>{tenant.id}</TableCell>
                    <TableCell>{tenant.name}</TableCell>
                    <TableCell>
                      <MuiLink
                        href={`http://localhost:3001/${tenant.url_suffix}`}
                        target="_blank"
                        rel="noopener"
                      >
                        {tenant.url_suffix}
                      </MuiLink>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={tenant.status}
                        color={getStatusColor(tenant.status) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {tenant.subscription_plan ? (
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography variant="body1">
                            {tenant.subscription_plan.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {tenant.subscription_plan.price}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography color="text.secondary" variant="body2">
                          No Subscription Plan
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(tenant.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditTenant(tenant.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteTenant(tenant.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
