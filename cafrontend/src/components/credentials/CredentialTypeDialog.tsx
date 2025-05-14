import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  CircularProgress
} from '@mui/material';
import { CredentialType, CredentialTypeFormData } from '../../types/credential';
import { credentialTypeApi } from '../../services/api';

interface CredentialTypeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  credentialType?: CredentialType;
}

const CredentialTypeDialog: React.FC<CredentialTypeDialogProps> = ({
  open,
  onClose,
  onSuccess,
  credentialType
}) => {
  const isEditMode = Boolean(credentialType);
  const [formData, setFormData] = useState<CredentialTypeFormData>({
    CredentialTypeName: '',
    URL: '',
    Status: 'Active'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<boolean>(false);

  // Initialize form data when editing an existing credential type
  useEffect(() => {
    if (credentialType) {
      setFormData({
        CredentialTypeName: credentialType.CredentialTypeName,
        URL: credentialType.URL || '',
        Status: credentialType.Status
      });
    } else {
      // Reset form when adding a new credential type
      setFormData({
        CredentialTypeName: '',
        URL: '',
        Status: 'Active'
      });
    }
    setErrors({});
  }, [credentialType, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.CredentialTypeName.trim()) {
      newErrors.CredentialTypeName = 'Credential Type Name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    try {
      if (isEditMode && credentialType) {
        await credentialTypeApi.updateCredentialType(credentialType.CredentialTypeId, formData);
      } else {
        await credentialTypeApi.createCredentialType(formData);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving credential type:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? 'Edit Credential Type' : 'Add Credential Type'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          name="CredentialTypeName"
          label="Credential Type Name"
          type="text"
          fullWidth
          variant="outlined"
          value={formData.CredentialTypeName}
          onChange={handleChange}
          error={Boolean(errors.CredentialTypeName)}
          helperText={errors.CredentialTypeName}
          sx={{ mb: 2, mt: 1 }}
          required
        />
        <TextField
          margin="dense"
          name="URL"
          label="URL (Optional)"
          type="url"
          fullWidth
          variant="outlined"
          value={formData.URL || ''}
          onChange={handleChange}
          sx={{ mb: 2 }}
          placeholder="https://example.com"
        />
        <FormControl component="fieldset">
          <RadioGroup
            row
            name="Status"
            value={formData.Status}
            onChange={handleChange}
          >
            <FormControlLabel value="Active" control={<Radio />} label="Active" />
            <FormControlLabel value="Inactive" control={<Radio />} label="Inactive" />
          </RadioGroup>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : null}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CredentialTypeDialog;
