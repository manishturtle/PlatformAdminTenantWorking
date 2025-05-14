import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Typography,
    Chip,
    Alert,
    CircularProgress
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { serviceAgentApi } from '@/services/api';
import { ServiceAgent } from '@/types/serviceagent';
import ServiceAgentForm from './ServiceAgentForm';
import { useConfirm } from 'material-ui-confirm';

interface ServiceCategory {
    id: number; // Maps to servicecategoryid from API
    name: string; // Maps to servicecategoryname from API
}

interface ServiceAgentListProps {
    serviceCategories: ServiceCategory[];
}

export default function ServiceAgentList({ serviceCategories }: ServiceAgentListProps) {
    const [serviceAgents, setServiceAgents] = useState<ServiceAgent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [openForm, setOpenForm] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<ServiceAgent | undefined>();
    const confirm = useConfirm();

    const fetchServiceAgents = async () => {
        try {
            const response = await serviceAgentApi.getServiceAgents();
            setServiceAgents(response.results || []);
            setError(null);
        } catch (err) {
            setError('Failed to fetch service agents');
            console.error('Error fetching service agents:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServiceAgents();
    }, []);

    const handleCreate = async (data: ServiceAgent) => {
        try {
            // Ensure expertat is always an array before creating
            const createData = { ...data };
            if (!Array.isArray(createData.expertat)) {
                createData.expertat = createData.expertat ? [createData.expertat as unknown as number] : [];
            }
            
            // Log the data being sent to the API for debugging
            console.log('Creating service agent with data:', createData);
            console.log('expertat field in create:', {
                value: createData.expertat,
                type: Array.isArray(createData.expertat) ? 'Array' : typeof createData.expertat,
                length: Array.isArray(createData.expertat) ? createData.expertat.length : 'N/A'
            });
            
            await serviceAgentApi.createServiceAgent(createData);
            fetchServiceAgents();
        } catch (err) {
            console.error('Error creating service agent:', err);
            throw new Error('Failed to create service agent');
        }
    };

    const handleUpdate = async (data: ServiceAgent) => {
        // Check for either serviceagentid or id
        if (!data.serviceagentid && !data.id) {
            console.error('Cannot update service agent: No ID available');
            return;
        }
        
        try {
            // The data object already contains the properly formatted data with expertat_ids
            // from the ServiceAgentForm component's handleSubmit method
            // We don't need to modify it further here
            
            // Log the data being sent to the API for debugging
            console.log('Updating service agent with data:', data);
            console.log('expertat field in update:', {
                expertat: data.expertat,
                expertat_ids: (data as any).expertat_ids,
                id: data.id,
                serviceagentid: data.serviceagentid || data.id
            });
            
            // Prefer serviceagentid if available, fall back to id
            const agentId = data.serviceagentid || data.id;
            
            // Ensure we have a numeric ID
            const numericAgentId = typeof agentId === 'number' ? agentId : parseInt(agentId as string, 10);
            await serviceAgentApi.updateServiceAgent(numericAgentId, data);
            fetchServiceAgents();
        } catch (err) {
            console.error('Error updating service agent:', err);
            throw new Error('Failed to update service agent');
        }
    };

    const handleDelete = async (id: number) => {
        if (id === undefined || id === null) {
            console.error('Cannot delete service agent: ID is undefined');
            setError('Cannot delete service agent: ID is missing');
            return;
        }

        try {
            await confirm({
                title: 'Delete Service Agent',
                description: 'Are you sure you want to delete this service agent?'
            });
            
            await serviceAgentApi.deleteServiceAgent(id);
            fetchServiceAgents();
        } catch (err) {
            if (err instanceof Error && err.message !== 'Confirmation cancelled') {
                setError('Failed to delete service agent');
                console.error('Error deleting service agent:', err);
            }
            // User cancelled the confirmation
        }
    };

    const handleEdit = (agent: ServiceAgent) => {
        setSelectedAgent(agent);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setSelectedAgent(undefined);
        setOpenForm(false);
    };

    const getCategoryNames = (categoryIds: number[] | undefined): string => {
        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            return '';
        }
        if (!serviceCategories || !Array.isArray(serviceCategories) || serviceCategories.length === 0) {
            return '';
        }
        return categoryIds
            .map(id => serviceCategories.find(cat => cat.id === id)?.name)
            .filter((name): name is string => Boolean(name))
            .join(', ');
    };

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6">Service Agents</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenForm(true)}
                >
                    Add Service Agent
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Expert At</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Portal Access</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {serviceAgents.map((agent) => (
                            <TableRow key={agent.serviceagentid || `agent-${agent.emailid}`}>
                                <TableCell>{agent.serviceagentname}</TableCell>
                                <TableCell>{agent.emailid}</TableCell>
                                <TableCell>{getCategoryNames(agent.expertat)}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={agent.status}
                                        color={agent.status === 'Active' ? 'success' : 'error'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={agent.allowportalaccess ? 'Yes' : 'No'}
                                        color={agent.allowportalaccess ? 'primary' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleEdit(agent)}
                                        color="primary"
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    {/* <IconButton
                                        size="small"
                                        onClick={() => agent.id !== undefined ? handleDelete(agent.id) : null}
                                        color="error"
                                    >
                                        <DeleteIcon />
                                    </IconButton> */}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <ServiceAgentForm
                open={openForm}
                onClose={handleCloseForm}
                onSubmit={selectedAgent ? handleUpdate : handleCreate}
                initialData={selectedAgent}
                serviceCategories={serviceCategories}
            />
        </Box>
    );
}
