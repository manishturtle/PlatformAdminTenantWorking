import React, { useState, useEffect, forwardRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Box,
  SelectChangeEvent
} from '@mui/material';
import { sopApi } from '@/services/api';



interface Sop {
  sopid: number;
  sopname: string;
}

interface SopApiResponse {
  results: Array<{
    SOPId: number;
    SOPName: string;
  }>;
}

interface ServiceCategoryFormData {
  servicecategoryname?: string;
  sopid?: number;
  status?: 'active' | 'inactive';
}

interface ServiceCategoryErrors {
  servicecategoryname?: string;
  sopid?: string;
  status?: string;
}

interface ServiceCategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ServiceCategoryFormData) => void;
  initialData?: ServiceCategoryFormData;
  textFieldProps?: React.ComponentProps<typeof TextField>;
  selectProps?: React.ComponentProps<typeof Select>;
  formControlProps?: React.ComponentProps<typeof FormControl>;
}

const ServiceCategoryDialog = forwardRef<HTMLDivElement, ServiceCategoryDialogProps>(({ 
    open, 
    onClose, 
    onSave, 
    initialData = {}, 
    textFieldProps = {},
    selectProps = {},
    formControlProps = {},
    ...dialogProps 
}, ref) => {
  const [formData, setFormData] = useState<ServiceCategoryFormData>({ status: 'active' });
  const [errors, setErrors] = useState<ServiceCategoryErrors>({});
  const [sops, setSops] = useState<Sop[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reset form and fetch SOPs when dialog opens
  useEffect(() => {
    if (open) {
      fetchSops();
      // Only reset form data if we're adding a new category (no initialData)
      if (!initialData || Object.keys(initialData).length === 0) {
        console.log('Resetting form data to default');
        setFormData({ status: 'active' });
      } else {
        console.log('Dialog opened with initialData:', initialData);
      }
    }
  }, [open]);

  // Update form data when initialData changes (for editing)
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('Updating form data with initialData:', initialData);
      setFormData({
        ...initialData,
        status: initialData.status || 'active'
      });
    }
  }, [initialData]);

  const fetchSops = async () => {
    try {
      // Get all SOPs with a larger page size to load all at once for the dropdown
      const response = await sopApi.getSOPs({
        page: 1,
        page_size: 100,
        include_inactive: false
      });
      if (response && response.results) {
        const formattedSops = response.results.map((sop) => ({
          sopid: sop.SOPId,
          sopname: sop.SOPName,
        }));
        setSops(formattedSops);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching SOPs:', error);
      setErrorMessage('Failed to load SOPs');
    }
  };

  const handleChange = (field: keyof ServiceCategoryFormData, value: string | number) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      console.log('Form data updated:', newData); // Debug log
      return newData;
    });
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = () => {
    const newErrors: ServiceCategoryErrors = {};
    if (!formData.servicecategoryname) {
      newErrors.servicecategoryname = 'Service Category Name is required';
    }
    if (!formData.sopid) {
      newErrors.sopid = 'SOP is required';
    }
    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      onSave(formData);
      onClose();
    } else {
      setErrorMessage('Please fill in all required fields');
    }
  };

  return (
    <Dialog
      ref={ref}
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      {...dialogProps}
    >
      <DialogTitle>
        {Object.keys(initialData || {}).length > 0 ? 'Edit Service Category' : 'Add Service Category'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}
          <FormControl
            fullWidth
            error={!!errors.servicecategoryname}
            {...formControlProps}
            sx={{ mb: 2 }}
          >
            <TextField
              label="Service Category Name"
              value={formData.servicecategoryname || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('servicecategoryname', e.target.value)}
              error={!!errors.servicecategoryname}
              helperText={errors.servicecategoryname}
              fullWidth
              {...textFieldProps}
            />
          </FormControl>

          <FormControl
            fullWidth
            error={!!errors.sopid}
            {...formControlProps}
            sx={{ mb: 2 }}
          >
            <InputLabel>SOP</InputLabel>
            <Select
              value={formData.sopid || ''}
              onChange={(e: SelectChangeEvent<number>) => handleChange('sopid', e.target.value as number)}
              label="SOP"
              error={!!errors.sopid}
              {...selectProps}
            >
              {sops.map((sop) => (
                <MenuItem key={sop.sopid} value={sop.sopid}>
                  {sop.sopname}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl
            fullWidth
            error={!!errors.status}
            {...formControlProps}
            sx={{ mb: 2 }}
          >
            <InputLabel>Status</InputLabel>
            <Select
              value={formData.status || 'active'}
              onChange={(e: SelectChangeEvent<string>) => handleChange('status', e.target.value)}
              label="Status"
              error={!!errors.status}
              {...selectProps}
            >
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {Object.keys(initialData || {}).length > 0 ? 'Update' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  );
});

ServiceCategoryDialog.displayName = 'ServiceCategoryDialog';

export default ServiceCategoryDialog;
