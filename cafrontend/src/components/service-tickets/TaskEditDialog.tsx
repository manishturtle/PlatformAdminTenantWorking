import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  CircularProgress,
  Box,
  Typography
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ServiceTicketTask, ServiceTicketTaskFormData } from '@/types/serviceTicketTask';
import { ServiceAgent } from '@/types/serviceagent';
import { serviceTicketTaskApi } from '@/services/api/serviceTicketTaskApi';
import { serviceAgentApi } from '@/services/api/serviceAgentApi';

interface TaskEditDialogProps {
  open: boolean;
  onClose: () => void;
  task: ServiceTicketTask | null;
  serviceTicketId: number;
  onSave: () => void;
}

interface FormErrors {
  TaskName?: string;
  TaskServiceAgent?: string;
  TaskStartDate?: string;
  TaskClosureDate?: string;
  TaskStatus?: string;
  Sequence?: string;
}

const TaskEditDialog: React.FC<TaskEditDialogProps> = ({
  open,
  onClose,
  task,
  serviceTicketId,
  onSave
}) => {
  const [formData, setFormData] = useState<ServiceTicketTaskFormData>({
    ServiceTicketId: serviceTicketId,
    SOPStepID: null,
    Sequence: 0,
    TaskName: '',
    TaskServiceAgent: null,
    TaskStartDate: null,
    TaskClosureDate: null,
    TaskStatus: 'New'
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [agents, setAgents] = useState<ServiceAgent[]>([]);

  useEffect(() => {
    if (open) {
      fetchAgents();
      if (task) {
        setFormData({
          ServiceTicketId: serviceTicketId,
          SOPStepID: typeof task.SOPStepID === 'number' ? task.SOPStepID : null,
          Sequence: task.Sequence,
          TaskName: task.TaskName,
          TaskServiceAgent: typeof task.TaskServiceAgent === 'number' 
            ? task.TaskServiceAgent 
            : (task.TaskServiceAgent as ServiceAgent)?.serviceagentid || null,
          TaskStartDate: task.TaskStartDate,
          TaskClosureDate: task.TaskClosureDate,
          TaskStatus: task.TaskStatus
        });
      } else {
        // Reset form for new task
        setFormData({
          ServiceTicketId: serviceTicketId,
          SOPStepID: null,
          Sequence: 0,
          TaskName: '',
          TaskServiceAgent: null,
          TaskStartDate: null,
          TaskClosureDate: null,
          TaskStatus: 'New'
        });
      }
      setErrors({});
    }
  }, [open, task, serviceTicketId]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await serviceAgentApi.getServiceAgents({ status: 'Active' });
      setAgents(response.results);
    } catch (error) {
      console.error('Error fetching service agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Clear error when field is changed
      if (errors[name as keyof FormErrors]) {
        setErrors(prev => ({
          ...prev,
          [name]: undefined
        }));
      }
    }
  };

  const handleDateChange = (name: string, date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      [name]: date ? date.toISOString().split('T')[0] : null
    }));
    
    // Clear error when date is changed
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.TaskName.trim()) {
      newErrors.TaskName = 'Task name is required';
    }
    
    if (formData.TaskStartDate && formData.TaskClosureDate) {
      const startDate = new Date(formData.TaskStartDate);
      const closureDate = new Date(formData.TaskClosureDate);
      
      if (closureDate < startDate) {
        newErrors.TaskClosureDate = 'Closure date cannot be before start date';
      }
    }
    
    if (formData.Sequence < 0) {
      newErrors.Sequence = 'Sequence must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      if (task?.ServiceTicketTaskId) {
        // Update existing task
        await serviceTicketTaskApi.updateServiceTicketTask(
          task.ServiceTicketTaskId,
          formData as Partial<ServiceTicketTask>
        );
      } else {
        // Create new task
        await serviceTicketTaskApi.createServiceTicketTask(
          formData as Partial<ServiceTicketTask>
        );
      }
      onSave();
    } catch (error) {
      console.error('Error saving task:', error);
      // Handle specific validation errors from API if needed
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>
        {task ? 'Edit Task' : 'Create New Task'}
      </DialogTitle>
      
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="TaskName"
                label="Task Name"
                value={formData.TaskName}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.TaskName}
                helperText={errors.TaskName}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                name="Sequence"
                label="Sequence"
                type="number"
                value={formData.Sequence}
                onChange={handleChange}
                fullWidth
                required
                error={!!errors.Sequence}
                helperText={errors.Sequence}
                InputProps={{ inputProps: { min: 0 } }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="task-agent-label">Service Agent</InputLabel>
                <Select
                  labelId="task-agent-label"
                  name="TaskServiceAgent"
                  value={formData.TaskServiceAgent || ''}
                  onChange={handleChange}
                  label="Service Agent"
                  error={!!errors.TaskServiceAgent}
                >
                  <MenuItem value="">
                    <em>None</em>
                  </MenuItem>
                  {agents.map((agent) => (
                    <MenuItem key={agent.serviceagentid} value={agent.serviceagentid}>
                      {agent.serviceagentname}
                    </MenuItem>
                  ))}
                </Select>
                {errors.TaskServiceAgent && (
                  <FormHelperText error>{errors.TaskServiceAgent}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="task-status-label">Status</InputLabel>
                <Select
                  labelId="task-status-label"
                  name="TaskStatus"
                  value={formData.TaskStatus}
                  onChange={handleChange}
                  label="Status"
                  error={!!errors.TaskStatus}
                >
                  <MenuItem value="New">New</MenuItem>
                  <MenuItem value="Assigned">Assigned</MenuItem>
                  <MenuItem value="InProgress">In Progress</MenuItem>
                  <MenuItem value="Closed">Closed</MenuItem>
                </Select>
                {errors.TaskStatus && (
                  <FormHelperText error>{errors.TaskStatus}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Start Date"
                  value={formData.TaskStartDate ? new Date(formData.TaskStartDate) : null}
                  onChange={(date) => handleDateChange('TaskStartDate', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.TaskStartDate,
                      helperText: errors.TaskStartDate
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Closure Date"
                  value={formData.TaskClosureDate ? new Date(formData.TaskClosureDate) : null}
                  onChange={(date) => handleDateChange('TaskClosureDate', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.TaskClosureDate,
                      helperText: errors.TaskClosureDate
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          color="primary"
          disabled={loading || saving}
        >
          {saving ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Saving...
            </>
          ) : (
            'Save'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskEditDialog;
