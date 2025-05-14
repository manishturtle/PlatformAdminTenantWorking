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
    FormControlLabel,
    Switch,
    Box,
    SelectChangeEvent,
    CircularProgress,
    Alert
} from '@mui/material';
import { ServiceAgent } from '@/types/serviceagent';

interface ServiceCategory {
    id: number; // Maps to servicecategoryid from API
    name: string; // Maps to servicecategoryname from API
}

interface ServiceAgentFormProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (serviceAgent: ServiceAgent) => Promise<void>;
    initialData?: ServiceAgent;
    serviceCategories: ServiceCategory[];
}

const defaultServiceAgent: ServiceAgent = {
    clientid: 1,
    companyid: 1,
    serviceagentname: '',
    expertat: [],
    status: 'Active',
    emailid: '',
    allowportalaccess: false,
};

export default function ServiceAgentForm({
    open,
    onClose,
    onSubmit,
    initialData,
    serviceCategories
}: ServiceAgentFormProps) {
    const [formData, setFormData] = useState<ServiceAgent>(defaultServiceAgent);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (initialData) {
            // When editing, populate the form with initialData
            // Ensure password is empty string so it's not required for edit
            // Make sure expertat is preserved properly as it's required for form submission
            setFormData({
                ...initialData,
                password: '',  // Clear password field for edits
                expertat: initialData.expertat || [] // Ensure expertat is properly initialized
            });
        } else {
            // When creating new, use default values
            setFormData(defaultServiceAgent);
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e: SelectChangeEvent<number[]>) => {
        setFormData(prev => ({
            ...prev,
            expertat: e.target.value as number[]
        }));
    };

    const handleStatusChange = (e: SelectChangeEvent) => {
        const newStatus = e.target.value as 'Active' | 'Inactive';
        
        setFormData(prev => ({
            ...prev,
            status: newStatus,
            // If status is changed to 'Inactive', automatically turn off portal access
            // and set password to undefined since it won't be needed
            ...(newStatus === 'Inactive' ? { 
                allowportalaccess: false,
                password: undefined 
            } : {})
        }));
    };

    const handlePortalAccessChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            allowportalaccess: e.target.checked,
            // If turning on portal access and editing an existing record (password is null),
            // keep password as null so it won't be required
            // If turning on portal access for a new record, set empty string to make it required
            password: e.target.checked ? 
                (initialData ? prev.password : '') : 
                undefined
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Create a submission-ready copy of formData
            // Extract the IDs from expertat if it's an array of objects
            const expertAtIds = Array.isArray(formData.expertat) 
                ? formData.expertat.map(item => {
                    if (typeof item === 'object' && item !== null) {
                        // If it's a ServiceCategory object with servicecategoryid
                        if ('servicecategoryid' in item) {
                            return item.servicecategoryid;
                        }
                        // If it's a ServiceCategory object with id
                        if ('id' in item) {
                            return item.id;
                        }
                    }
                    // If it's already a number
                    return item;
                })
                : [];
            
            console.log('Extracted expertat IDs:', expertAtIds);
                
            const dataToSubmit: ServiceAgent & { expertat_ids?: number[] } = {
                ...formData,  // This ensures expertat is included to satisfy the ServiceAgent type
                expertat_ids: expertAtIds // Use the extracted IDs
            };
            
            // Password handling for edits
            // If password is empty string in an edit operation, remove it to keep existing password
            if (dataToSubmit.password === '') {
                delete dataToSubmit.password;
            }
            
            // Ensure ID fields are properly set for updates
            if (initialData && initialData.id) {
                dataToSubmit.id = initialData.id;
                dataToSubmit.serviceagentid = initialData.serviceagentid || initialData.id;
            }
            
            // Detailed logging before submitting the form data
            console.log('Form submission - Service Agent data:', {
                original: formData,
                modified: dataToSubmit,
                isUpdate: !!initialData,
                agentId: initialData?.id || 'N/A (Creating new)',
                serviceagentid: initialData?.serviceagentid || 'N/A (Creating new)',
                passwordIncluded: !!dataToSubmit.password
            });
            
            // Log specific focus on expertat fields
            console.log('expertat field conversion:', {
                original: {
                    value: formData.expertat,
                    type: Array.isArray(formData.expertat) ? 'Array' : typeof formData.expertat,
                    length: Array.isArray(formData.expertat) ? formData.expertat.length : 'N/A',
                },
                converted: {
                    value: dataToSubmit.expertat_ids,
                    type: Array.isArray(dataToSubmit.expertat_ids) ? 'Array' : typeof dataToSubmit.expertat_ids,
                    length: Array.isArray(dataToSubmit.expertat_ids) ? dataToSubmit.expertat_ids.length : 'N/A',
                }
            });
            
            // Log available service categories for reference
            console.log('Available service categories:', serviceCategories.map(cat => ({ id: cat.id, name: cat.name })));
            
            await onSubmit(dataToSubmit);
            onClose();
        } catch (err) {
            console.error('Error submitting service agent form:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {initialData ? 'Edit Service Agent' : 'Create Service Agent'}
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}

                        <TextField
                            required
                            fullWidth
                            label="Service Agent Name"
                            name="serviceagentname"
                            value={formData.serviceagentname}
                            onChange={handleChange}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Expert At</InputLabel>
                            <Select
                                multiple
                                value={formData.expertat}
                                onChange={handleSelectChange}
                                label="Expert At"
                            >
                                {serviceCategories.map((category) => (
                                    <MenuItem key={category.id} value={category.id}>
                                        {category.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={formData.status}
                                onChange={handleStatusChange}
                                label="Status"
                            >
                                <MenuItem value="Active">Active</MenuItem>
                                <MenuItem value="Inactive">Inactive</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            required
                            fullWidth
                            label="Email"
                            name="emailid"
                            type="email"
                            value={formData.emailid}
                            onChange={handleChange}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={formData.allowportalaccess}
                                    onChange={handlePortalAccessChange}
                                    name="allowportalaccess"
                                    disabled={formData.status === 'Inactive'}
                                />
                            }
                            label="Allow Portal Access"
                        />

                        {formData.allowportalaccess && (
                            <TextField
                                required={initialData ? false : true} 
                                fullWidth
                                label="Password"
                                name="password"
                                type="password"
                                value={formData.password !== undefined ? formData.password : ''}
                                placeholder="Enter new password"
                                onChange={handleChange}
                                helperText={initialData ? "Leave empty to keep existing password" : "Password is required for new service agents"}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading && <CircularProgress size={20} />}
                    >
                        {initialData ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
