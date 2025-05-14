import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Select,
  MenuItem,
  FormHelperText,
  Box,
  Alert,
  SelectChangeEvent,
  SxProps,
  Theme,
  FormControl,
  InputLabel
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { customerApi } from '@/services/api/customerApi';
import { serviceCategoryApi } from '@/services/api/serviceCategoryApi';
import { serviceAgentApi } from '@/services/api/serviceAgentApi';
import { Customer } from '@/types/customer';
import { ServiceCategory } from '@/types/servicecategory';
import { ServiceAgent } from '@/types/serviceagent';
import { ServiceTicket } from '@/types/serviceticket';
import { serviceTicketApi } from '@/services/api/serviceTicketApi';

interface ServiceTicketDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ServiceTicket) => Promise<void>;
  initialData?: ServiceTicket | null;
}

interface FormData {
  customerid: number | '';
  servicecategoryid: number | '';
  serviceagentid: number | '' | null;
  serviceticketsubject: string;
  serviceticketdesc: string;
  creationdate: string | null;
  targetclosuredate: string | null;
  companyid?: number;
  status?: string;
  createdby?: string;
  updatedby?: string;
}

interface ValidationErrors {
  customerid?: string;
  servicecategoryid?: string;
  serviceagentid?: string;
  serviceticketsubject?: string;
  serviceticketdesc?: string;
  creationdate?: string;
  targetclosuredate?: string;
}

const initialFormData: FormData = {
  customerid: '',
  servicecategoryid: '',
  serviceagentid: '',
  serviceticketsubject: '',
  serviceticketdesc: '',
  creationdate: dayjs().format('YYYY-MM-DD'),
  targetclosuredate: dayjs().format('YYYY-MM-DD'),
  status: 'New'
};

const ServiceTicketDialog: React.FC<ServiceTicketDialogProps> = ({ open, onClose, onSave, initialData }) => {
  const [formData, setFormData] = useState<FormData>({
    ...initialFormData,
    ...(initialData && {
      customerid: initialData.customerid,
      servicecategoryid: initialData.servicecategoryid,
      serviceagentid: initialData.serviceagentid ?? '',
      serviceticketsubject: initialData.serviceticketsubject || '',
      serviceticketdesc: initialData.serviceticketdesc,
      creationdate: initialData.creationdate,
      targetclosuredate: initialData.targetclosuredate,
      status: initialData.status || 'New',
    }),
  });
  
  // Reset form when dialog closes
  useEffect(() => {
    if (open) {
      setFormData({
        ...initialFormData,
        ...(initialData && {
          customerid: initialData.customerid,
          servicecategoryid: initialData.servicecategoryid,
          serviceagentid: initialData.serviceagentid ?? '',
          serviceticketsubject: initialData.serviceticketsubject || '',
          serviceticketdesc: initialData.serviceticketdesc,
          creationdate: initialData.creationdate || dayjs().format('YYYY-MM-DD'),
          targetclosuredate: initialData.targetclosuredate || dayjs().format('YYYY-MM-DD'),
          status: initialData.status || 'New',
        }),
      });
    }
  }, [open, initialData]);

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [agents, setAgents] = useState<ServiceAgent[]>([]);

  // Generate subject based on customer, category and date with time
  const generateSubject = useCallback(() => {
    const customer = customers.find(c => c.CustomerID === formData.customerid);
    const category = categories.find(c => c.servicecategoryid === formData.servicecategoryid);
    const today = dayjs().format('DD/MM/YYYY');
    const currentTime = dayjs().format('HH:mm');
    
    if (customer && category) {
      const customerName = `${customer.FirstName} ${customer.LastName}`;
      const categoryName = category.servicecategoryname;
      return `${customerName} - ${categoryName} - ${today} ${currentTime}`;
    }
    return '';
  }, [customers, categories, formData.customerid, formData.servicecategoryid]);
  
  // Update subject when customer or category changes
  useEffect(() => {
    if (formData.customerid && formData.servicecategoryid && !initialData?.serviceticketsubject) {
      const subject = generateSubject();
      if (subject) {
        setFormData(prev => ({
          ...prev,
          serviceticketsubject: subject
        }));
      }
    }
  }, [formData.customerid, formData.servicecategoryid, generateSubject, initialData?.serviceticketsubject]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersData, categoriesData, agentsData] = await Promise.all([
          customerApi.getCustomers(),
          serviceCategoryApi.getServiceCategories(),
          serviceAgentApi.getServiceAgents(),
        ]);

        if (customersData && Array.isArray(customersData.results)) {
          setCustomers(customersData.results);
        }
        if (categoriesData && Array.isArray(categoriesData.results)) {
          setCategories(categoriesData.results);
        }
        if (agentsData && Array.isArray(agentsData.results)) {
          setAgents(agentsData.results);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setErrorMessage('Failed to load required data');
      }
    };

    fetchData();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    if (!formData.customerid) {
      newErrors.customerid = 'Customer is required';
    }

    if (!formData.servicecategoryid) {
      newErrors.servicecategoryid = 'Service category is required';
    }

    if (!formData.serviceagentid) {
      newErrors.serviceagentid = 'Service agent is required';
    }

    if (!formData.serviceticketsubject.trim()) {
      newErrors.serviceticketsubject = 'Subject is required';
    }

    // Description is now optional

    if (!formData.creationdate) {
      newErrors.creationdate = 'Creation date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      // Create the data object with the correct fields for the API
      const ticketFormData: ServiceTicketFormData = {
        customerid: Number(formData.customerid),
        servicecategoryid: Number(formData.servicecategoryid),
        serviceagentid: Number(formData.serviceagentid),
        serviceticketsubject: formData.serviceticketsubject,
        serviceticketdesc: formData.serviceticketdesc,
        targetclosuredate: formData.targetclosuredate || dayjs().format('YYYY-MM-DD'),
        status: formData.status || 'New',
      };
      
      let ticketData: ServiceTicket;
      
      if (initialData?.serviceticketid) {
        // Update existing ticket
        ticketData = await serviceTicketApi.updateServiceTicket(initialData.serviceticketid, ticketFormData);
      } else {
        // Create new ticket
        ticketData = await serviceTicketApi.createServiceTicket(ticketFormData);
      }

      await onSave(ticketData);
      onClose();
    } catch (error) {
      console.error('Error saving service ticket:', error);
      setErrorMessage('Failed to save service ticket');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectChange = (field: keyof FormData) => (event: SelectChangeEvent<number | '' | string>) => {
    const value = event.target.value;
    
    // Update form data with the selected value
    setFormData((prev) => {
      const updatedData = {
        ...prev,
        [field]: value,
      };
      
      // If the field is serviceagentid, update the status if needed
      if (field === 'serviceagentid') {
        // If an agent is selected (value is not empty) and status is New, set to 'Assigned'
        if (value && prev.status === 'New') {
          updatedData.status = 'Assigned';
        }
        // If no agent is selected and we're not in edit mode, reset to 'New'
        else if (!value && !initialData) {
          updatedData.status = 'New';
        }
      }
      
      // If the field is status and trying to set it to New while an agent is assigned, prevent it
      if (field === 'status' && value === 'New' && prev.serviceagentid) {
        // Keep the previous status instead of changing to New
        updatedData.status = prev.status;
      }
      
      return updatedData;
    });
    
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleTextChange = (field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleDateChange = (field: keyof FormData) => (value: Dayjs | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value ? value.format('YYYY-MM-DD') : null,
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleClose = () => {
    // Reset form and close dialog
    setFormData(initialFormData);
    setErrors({});
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
    >
      <DialogTitle>{initialData ? 'Edit Service Ticket' : 'Create Service Ticket'}</DialogTitle>
      <DialogContent>
        <Box
          sx={{
            width: 500,
            maxWidth: '100%',
          }}
        >
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <FormControl fullWidth error={!!errors.customerid} sx={{ mb: 2 } as SxProps<Theme>}>
            <InputLabel id="customer-label">Customer</InputLabel>
            <Select
              labelId="customer-label"
              id="customer"
              value={formData.customerid}
              onChange={handleSelectChange('customerid')}
              label="Customer"
              disabled={!!initialData} // Disable in edit mode
            >
              {customers.map((customer) => (
                <MenuItem key={customer.CustomerID} value={customer.CustomerID}>
                  {customer.FirstName} {customer.LastName}
                </MenuItem>
              ))}
            </Select>
            {errors.customerid && (
              <FormHelperText>{errors.customerid}</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth error={!!errors.servicecategoryid} sx={{ mb: 2 } as SxProps<Theme>}>
            <InputLabel id="service-category-label">Service Category</InputLabel>
            <Select
              labelId="service-category-label"
              id="service-category"
              value={formData.servicecategoryid}
              onChange={handleSelectChange('servicecategoryid')}
              label="Service Category"
            >
              {categories.map((category) => (
                <MenuItem key={category.servicecategoryid} value={category.servicecategoryid}>
                  {category.servicecategoryname}
                </MenuItem>
              ))}
            </Select>
            {errors.servicecategoryid && (
              <FormHelperText>{errors.servicecategoryid}</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth error={!!errors.serviceagentid} sx={{ mb: 2 } as SxProps<Theme>}>
            <InputLabel id="service-agent-label">Service Agent</InputLabel>
            <Select
              labelId="service-agent-label"
              id="service-agent"
              value={formData.serviceagentid}
              onChange={handleSelectChange('serviceagentid')}
              label="Service Agent"
            >
              {agents.map((agent) => (
                <MenuItem key={agent.serviceagentid} value={agent.serviceagentid}>
                  {agent.serviceagentname}
                </MenuItem>
              ))}
            </Select>
            {errors.serviceagentid && (
              <FormHelperText>{errors.serviceagentid}</FormHelperText>
            )}
          </FormControl>

          <TextField
            fullWidth
            label="Subject"
            value={formData.serviceticketsubject}
            onChange={handleTextChange('serviceticketsubject')}
            error={!!errors.serviceticketsubject}
            helperText={errors.serviceticketsubject}
            sx={{ mb: 2 } as SxProps<Theme>}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <DatePicker
              label="Creation Date"
              value={formData.creationdate ? dayjs(formData.creationdate) : null}
              onChange={handleDateChange('creationdate')}
              sx={{ flex: 1 }}
              format="DD/MM/YYYY"
              readOnly={!!initialData} // Make read-only in edit mode
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.creationdate,
                  helperText: errors.creationdate,
                  InputProps: {
                    readOnly: !!initialData, // Make read-only in edit mode
                  },
                },
              }}
            />

            <DatePicker
              label="Target Closure Date"
              value={formData.targetclosuredate ? dayjs(formData.targetclosuredate) : null}
              onChange={handleDateChange('targetclosuredate')}
              sx={{ flex: 1 }}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  error: !!errors.targetclosuredate,
                  helperText: errors.targetclosuredate,
                },
              }}
            />
          </Box>

          <FormControl fullWidth sx={{ mb: 2 } as SxProps<Theme>}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              id="status"
              value={formData.status}
              onChange={handleSelectChange('status')}
              label="Status"
            >
              {/* Only show New status if no agent is assigned or it's not edit mode */}
              {(!formData.serviceagentid || !initialData) && (
                <MenuItem value="New">New</MenuItem>
              )}
              <MenuItem value="Assigned">Assigned</MenuItem>
              <MenuItem value="In Process">In Process</MenuItem>
              <MenuItem value="Closed">Closed</MenuItem>
              <MenuItem value="Discard">Discard</MenuItem>
              <MenuItem value="Reassigned 1">Reassigned 1</MenuItem>
              <MenuItem value="Reassigned 2">Reassigned 2</MenuItem>
              <MenuItem value="Reassigned 3">Reassigned 3</MenuItem>
              <MenuItem value="Reassigned 4">Reassigned 4</MenuItem>
              <MenuItem value="Reassigned 5">Reassigned 5</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={formData.serviceticketdesc}
            onChange={handleTextChange('serviceticketdesc')}
            error={!!errors.serviceticketdesc}
            helperText={errors.serviceticketdesc}
            sx={{ mb: 2 } as SxProps<Theme>}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ServiceTicketDialog;
