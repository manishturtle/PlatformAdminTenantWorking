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
} from "@mui/material";
import Link from "next/link";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { getAuthHeader } from "../../../utils/authUtils";

interface CrmClient {
  id: number;
  client_name: string;
  contact_person_email: string;
  created_at: string;
}

export default function CrmClientsPage() {
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const router = useRouter();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        setLoading(true);
        const authHeader = getAuthHeader();

        const response = await fetch(
          "https://bedevcockpit.turtleit.in/platform-admin/api/crmclients/",
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
        setClients(Array.isArray(data.results) ? data.results : []);
        setError("");
      } catch (err: any) {
        console.error("Error fetching CRM clients:", err);
        setError(err.message || "Failed to load CRM clients");
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const handleAddClient = () => {
    router.push("/platform-admin/crmclients/create");
  };

  const handleEditClient = (id: number) => {
    router.push(`/platform-admin/crmclients/edit/${id}`);
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this client?")) {
      return;
    }

    try {
      const authHeader = getAuthHeader();

      const response = await fetch(
        `https://bedevcockpit.turtleit.in/platform-admin/api/crm-clients/${id}/`,
        {
          method: "DELETE",
          headers: {
            ...authHeader,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete client");
      }

      // Remove the deleted client from the list
      setClients(clients.filter((client) => client.id !== id));
    } catch (err: any) {
      console.error("Error deleting client:", err);
      setError(err.message || "Failed to delete client");
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
            <Typography color="text.primary">CRM Clients</Typography>
          </Breadcrumbs>
          <Typography variant="h4" component="h1">
            CRM Clients
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddClient}
        >
          Add Client
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
          <Table stickyHeader aria-label="CRM clients table">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Client Name</TableCell>
                <TableCell>Contact Email</TableCell>
                <TableCell>Created At</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                    No CRM clients found
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id} hover>
                    <TableCell>{client.id}</TableCell>
                    <TableCell>{client.client_name}</TableCell>
                    <TableCell>{client.contact_person_email}</TableCell>
                    <TableCell>
                      {new Date(client.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => handleEditClient(client.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClient(client.id)}
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
