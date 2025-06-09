"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, Button, Alert } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { GridColDef, GridRowId } from "@mui/x-data-grid";
import { DataGrid } from '@/components';

interface Application {
  app_id: number;
  application_name: string;
  client_id: number;
  company_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string | null;
  app_default_url?: string;
  app_secret_key?: string;
  app_endpoint_route?: string;
  description?: string;
  app_backend_url?: string;
  migrate_schema_endpoint?: string;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        "http://localhost:8000/platform-admin/api/applications/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }

      const data = await response.json();
      setApplications(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClick = (id: GridRowId) => {
    router.push(`/platform-admin/applications/edit/${id}`);
  };

  const handleDelete = async (id: GridRowId) => {
    if (!window.confirm("Are you sure you want to delete this application?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(
        `http://localhost:8000/platform-admin/api/applications/${id}/`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete application");
      }

      await fetchApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const columns: GridColDef[] = [
    { field: "application_name", headerName: "Name", flex: 1 },
    { field: "app_default_url", headerName: "Default URL", flex: 1 },
    { field: "app_endpoint_route", headerName: "Endpoint URL", flex: 1 },
    {
      field: "is_active",
      headerName: "Status",
      width: 120,
      valueGetter: (params) => (params?.row?.is_active ? "Active" : "Inactive"),
    },
    {
      field: "created_at",
      headerName: "Created At",
      width: 150,
      valueGetter: (params) => {
        const date = params;
        return date ? new Date(date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '';
      },
    },
    {
      field: "updated_at",
      headerName: "Updated At",
      width: 150,
      valueGetter: (params) => {
        const date = params;
        return date ? new Date(date).toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : '';
      },
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h5" component="h1">
          Applications
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => router.push("/platform-admin/applications/add")}
        >
          Add Application
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      <DataGrid<Application>
        rows={applications}
        columns={columns}
        loading={isLoading}
        onEdit={handleEditClick}
        onDelete={handleDelete}
        getRowId={(row) => row.app_id}
      />

    </Box>
  );
}
