import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Customer, SOURCE_OPTIONS, CUSTOMER_TYPE_OPTIONS } from '../../types/customer';

interface CustomerFormProps {
  initialData?: Partial<Customer>;
  isLoading?: boolean;
  isEdit?: boolean;
  onSubmit: (data: Partial<Customer>) => void;
  onCancel: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData = {},
  isLoading = false,
  isEdit = false,
  onSubmit,
  onCancel,
}) => {
  // Set default value for AllowPortalAccess to true if not provided in initialData
  const defaultData = {
    ...initialData,
    AllowPortalAccess: initialData.AllowPortalAccess !== undefined ? initialData.AllowPortalAccess : true
  };
  const [formData, setFormData] = useState<Partial<Customer>>(defaultData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: value,
      });
      
      // Clear error when field is changed
      if (errors[name]) {
        setErrors({
          ...errors,
          [name]: '',
        });
      }
    }
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    if (name) {
      const updatedData = {
        ...formData,
        [name]: value,
      };
      
      // If CustomerType is changed to Lead, set AllowPortalAccess to false
      // unless Source is 'Online Portal'
      if (name === 'CustomerType' && value === 'Lead') {
        updatedData.AllowPortalAccess = formData.Source === 'Online Portal';
      }
      
      // If Source is changed to 'Online Portal' and CustomerType is 'Lead',
      // set AllowPortalAccess to true
      if (name === 'Source' && value === 'Online Portal' && formData.CustomerType === 'Lead') {
        updatedData.AllowPortalAccess = true;
      }
      
      // If Source is changed from 'Online Portal' to something else and CustomerType is 'Lead',
      // set AllowPortalAccess to false
      if (name === 'Source' && value !== 'Online Portal' && formData.CustomerType === 'Lead') {
        updatedData.AllowPortalAccess = false;
      }
      
      setFormData(updatedData);
      
      // Clear error when field is changed
      if (errors[name]) {
        setErrors({
          ...errors,
          [name]: '',
        });
      }
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name) {
      setFormData({
        ...formData,
        [name]: checked,
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    const requiredFields = ['FirstName', 'LastName', 'Email', 'Phone', 'AadharCard', 'PANCard', 'Source', 'CustomerType'];
    requiredFields.forEach(field => {
      if (!formData[field as keyof Partial<Customer>]) {
        newErrors[field] = 'This field is required';
      }
    });
    
    // Email validation
    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      newErrors.Email = 'Please enter a valid email address';
    }
    
    // Phone validation - 10 digits
    if (formData.Phone && !/^\d{10}$/.test(formData.Phone)) {
      newErrors.Phone = 'Phone number must be 10 digits';
    }
    
    // Aadhar validation - 12 digits
    if (formData.AadharCard && !/^\d{12}$/.test(formData.AadharCard)) {
      newErrors.AadharCard = 'Aadhar card number must be 12 digits';
    }
    
    // PAN validation - Format ABCDE1234F
    if (formData.PANCard && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.PANCard)) {
      newErrors.PANCard = 'PAN card must be in format ABCDE1234F';
    }
    
    // Name validation - only letters and spaces
    if (formData.FirstName && !/^[A-Za-z\s]{2,100}$/.test(formData.FirstName)) {
      newErrors.FirstName = 'First name must contain only letters and spaces (2-100 characters)';
    }
    
    if (formData.LastName && !/^[A-Za-z\s]{2,100}$/.test(formData.LastName)) {
      newErrors.LastName = 'Last name must contain only letters and spaces (2-100 characters)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      // Always set ClientId and CompanyId to 1 regardless of form input
      const dataToSubmit = {
        ...formData,
        ClientId: 1,
        CompanyId: 1
      };
      onSubmit(dataToSubmit);
    }
  };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: 4 }}>
      {!isEdit && (
        <Typography variant="h6" gutterBottom>
          Add New Customer
        </Typography>
      )}
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* ClientId and CompanyId are hidden and set to 1 by default */}
        
        {/* Personal Information */}
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <TextField
            required
            fullWidth
            label="First Name"
            name="FirstName"
            value={formData.FirstName || ''}
            onChange={handleTextChange}
            error={!!errors.FirstName}
            helperText={errors.FirstName}
          />
        </Box>
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <TextField
            required
            fullWidth
            label="Last Name"
            name="LastName"
            value={formData.LastName || ''}
            onChange={handleTextChange}
            error={!!errors.LastName}
            helperText={errors.LastName}
          />
        </Box>
        
        {/* Contact Information */}
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <TextField
            required
            fullWidth
            label="Email"
            name="Email"
            type="email"
            value={formData.Email || ''}
            onChange={handleTextChange}
            error={!!errors.Email}
            helperText={errors.Email}
          />
        </Box>
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <TextField
            required
            fullWidth
            label="Phone"
            name="Phone"
            value={formData.Phone || ''}
            onChange={handleTextChange}
            error={!!errors.Phone}
            helperText={errors.Phone}
          />
        </Box>
        
        {/* ID Documents */}
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <TextField
            required
            fullWidth
            label="Aadhar Card"
            name="AadharCard"
            value={formData.AadharCard || ''}
            onChange={handleTextChange}
            error={!!errors.AadharCard}
            helperText={errors.AadharCard}
          />
        </Box>
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <TextField
            required
            fullWidth
            label="PAN Card"
            name="PANCard"
            value={formData.PANCard || ''}
            onChange={handleTextChange}
            error={!!errors.PANCard}
            helperText={errors.PANCard}
          />
        </Box>
        
        {/* Classification */}
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <FormControl fullWidth error={!!errors.Source}>
            <InputLabel>Source *</InputLabel>
            <Select
              required
              name="Source"
              value={formData.Source || ''}
              label="Source *"
              onChange={handleSelectChange}
            >
              {SOURCE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {errors.Source && <FormHelperText>{errors.Source}</FormHelperText>}
          </FormControl>
        </Box>
        
        {/* ReferredBy field - only visible when Source is Referral */}
        {formData.Source === 'Referral' && (
          <Box sx={{ width: { xs: '100%', md: '100%' } }}>
            <TextField
              fullWidth
              label="Referred By"
              name="ReferredBy"
              value={formData.ReferredBy || ''}
              onChange={handleTextChange}
              error={!!errors.ReferredBy}
              helperText={errors.ReferredBy || 'Name or ID of the person who referred this customer'}
              margin="normal"
            />
          </Box>
        )}
        <Box sx={{ width: { xs: '100%', md: 'calc(50% - 1.5rem)' } }}>
          <FormControl fullWidth error={!!errors.CustomerType}>
            <InputLabel>Customer Type *</InputLabel>
            <Select
              required
              name="CustomerType"
              value={formData.CustomerType || ''}
              label="Customer Type *"
              onChange={handleSelectChange}
            >
              {CUSTOMER_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {errors.CustomerType && <FormHelperText>{errors.CustomerType}</FormHelperText>}
          </FormControl>
        </Box>
      </Box>

      {/* Allow Portal Access */}
      <Box sx={{ mt: 2 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={!!formData.AllowPortalAccess}
              onChange={handleCheckboxChange}
              name="AllowPortalAccess"
              color="primary"
              disabled={formData.CustomerType === 'Lead' && formData.Source !== 'Online Portal'}
            />
          }
          label="Allow Portal Access"
        />
      </Box>
      
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button variant="outlined" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          {isLoading ? 'Saving...' : 'Save'}
        </Button>
      </Box>
    </Paper>
  );
};

export default CustomerForm;
