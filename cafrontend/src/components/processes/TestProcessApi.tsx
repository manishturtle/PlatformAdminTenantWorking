import React, { useState, useEffect } from 'react';
import { processApi } from '../../services/api';
import { Process } from '../../types/process';
import { Box, Button, Typography, Paper, CircularProgress, Alert } from '@mui/material';

const TestProcessApi: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [apiResponse, setApiResponse] = useState<any>(null);

  const testGetProcesses = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setApiResponse(null);
    
    try {
      console.log('Testing GET /api/processes/ endpoint...');
      const response = await processApi.getProcesses(1, 10);
      console.log('API Response:', response);
      setProcesses(response.results || []);
      setApiResponse(response);
      setSuccess('Successfully fetched processes!');
    } catch (err: any) {
      console.error('Error testing process API:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch processes');
      setApiResponse(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const testCreateProcess = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setApiResponse(null);
    
    const testProcess = {
      ProcessName: 'Test Process ' + new Date().toISOString(),
      Description: 'This is a test process created for API testing',
      ClientId: 1,
      CompanyId: 1
    };
    
    try {
      console.log('Testing POST /api/processes/ endpoint with data:', testProcess);
      const response = await processApi.createProcess(testProcess);
      console.log('API Response:', response);
      setApiResponse(response);
      setSuccess('Successfully created a test process!');
      // Refresh the process list
      testGetProcesses();
    } catch (err: any) {
      console.error('Error creating test process:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to create test process');
      setApiResponse(err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>Process API Test</Typography>
      
      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={testGetProcesses}
          disabled={loading}
          sx={{ mr: 2 }}
        >
          Test GET Processes
        </Button>
        
        <Button 
          variant="contained" 
          color="secondary" 
          onClick={testCreateProcess}
          disabled={loading}
        >
          Test CREATE Process
        </Button>
      </Box>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>API Response</Typography>
        <pre style={{ overflow: 'auto', maxHeight: '200px' }}>
          {apiResponse ? JSON.stringify(apiResponse, null, 2) : 'No response yet'}
        </pre>
      </Paper>
      
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Processes ({processes.length})</Typography>
        {processes.length > 0 ? (
          processes.map((process) => (
            <Box key={process.ProcessId} sx={{ mb: 1, p: 1, border: '1px solid #eee' }}>
              <Typography variant="subtitle1">{process.ProcessName}</Typography>
              <Typography variant="body2">{process.Description}</Typography>
              <Typography variant="caption">ID: {process.ProcessId}</Typography>
            </Box>
          ))
        ) : (
          <Typography>No processes found</Typography>
        )}
      </Paper>
    </Box>
  );
};

export default TestProcessApi;
