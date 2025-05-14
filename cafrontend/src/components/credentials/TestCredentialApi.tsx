import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import axios from "axios";

// Test component to directly test the credentials API
const TestCredentialApi: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("1");
  const [credentialTypeId, setCredentialTypeId] = useState<string>("1");
  const [username, setUsername] = useState<string>("testuser");
  const [password, setPassword] = useState<string>("testpassword");

  const testGetCredentials = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `http://localhost:8020/api/customers/${customerId}/credentials/`
      );
      setResult(JSON.stringify(response.data, null, 2));
      console.log("GET response:", response.data);
    } catch (error: any) {
      setResult(
        `Error: ${error.message}\n${JSON.stringify(
          error.response?.data,
          null,
          2
        )}`
      );
      console.error("GET error:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const testCreateCredential = async () => {
    setLoading(true);
    try {
      // Create the request data
      const requestData = {
        ClientId: 1,
        CompanyId: 1,
        CredentialTypeId: parseInt(credentialTypeId),
        UserName: username,
        Password: password,
      };

      console.log("Sending data:", requestData);

      const response = await axios.post(
        `http://localhost:8020/api/customers/${customerId}/credentials/`,
        requestData
      );

      setResult(JSON.stringify(response.data, null, 2));
      console.log("POST response:", response.data);
    } catch (error: any) {
      setResult(
        `Error: ${error.message}\n${JSON.stringify(
          error.response?.data,
          null,
          2
        )}`
      );
      console.error("POST error:", error.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        Credential API Test
      </Typography>

      <Box sx={{ mb: 2 }}>
        <TextField
          label="Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          sx={{ mr: 1, mb: 1 }}
        />
        <TextField
          label="Credential Type ID"
          value={credentialTypeId}
          onChange={(e) => setCredentialTypeId(e.target.value)}
          sx={{ mr: 1, mb: 1 }}
        />
        <TextField
          label="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          sx={{ mr: 1, mb: 1 }}
        />
        <TextField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mr: 1, mb: 1 }}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          onClick={testGetCredentials}
          disabled={loading}
          sx={{ mr: 1 }}
        >
          Test GET
        </Button>
        <Button
          variant="contained"
          onClick={testCreateCredential}
          disabled={loading}
          color="primary"
        >
          Test POST
        </Button>
      </Box>

      {loading && <CircularProgress />}

      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
        Result:
      </Typography>
      <Paper
        elevation={3}
        sx={{
          p: 2,
          maxHeight: "400px",
          overflow: "auto",
          backgroundColor: "#f5f5f5",
          fontFamily: "monospace",
        }}
      >
        <pre>{result}</pre>
      </Paper>
    </Paper>
  );
};

export default TestCredentialApi;
