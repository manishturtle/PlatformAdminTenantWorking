import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  IconButton, 
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Link as LinkIcon,
  NewReleases as NewReleasesIcon,
  AssignmentInd as AssignmentIndIcon,
  Build as BuildIcon,
  CheckCircle as CheckCircleIcon,
  Help as HelpIcon,
  CalendarToday as CalendarTodayIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ServiceTicketTask } from '@/types/serviceTicketTask';
import { serviceTicketTaskApi } from '@/services/api/serviceTicketTaskApi';
import SOPStepDetailsDialog from './SOPStepDetailsDialog';
import TaskEditDialog from './TaskEditDialog';
import { useConfirm } from '@/hooks/useConfirm';

interface ServiceTicketTasksComponentProps {
  serviceTicketId: number;
  onTasksUpdated?: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'New':
      return 'info';
    case 'Assigned':
      return 'warning';
    case 'InProgress':
      return 'primary';
    case 'Closed':
      return 'success';
    default:
      return 'default';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'New':
      return <NewReleasesIcon fontSize="small" />;
    case 'Assigned':
      return <AssignmentIndIcon fontSize="small" />;
    case 'InProgress':
      return <BuildIcon fontSize="small" />;
    case 'Closed':
      return <CheckCircleIcon fontSize="small" />;
    default:
      return <HelpIcon fontSize="small" />;
  }
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Not set';
  try {
    return format(new Date(dateString), 'dd/MM/yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

const ServiceTicketTasksComponent: React.FC<ServiceTicketTasksComponentProps> = ({ 
  serviceTicketId, 
  onTasksUpdated 
}) => {
  const [tasks, setTasks] = useState<ServiceTicketTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<ServiceTicketTask | null>(null);
  const [sopStepDialogOpen, setSopStepDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addingTask, setAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState<Partial<ServiceTicketTask>>({
    ServiceTicketId: serviceTicketId,
    TaskName: '',
    TaskStatus: 'New',
    Sequence: tasks.length + 1,
    TaskStartDate: '',
    TaskClosureDate: '',
    TaskServiceAgent: undefined,
  });
  const { ConfirmDialog, confirm } = useConfirm();

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const tasksData = await serviceTicketTaskApi.getTasksByServiceTicket(serviceTicketId);
      setTasks(tasksData);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError('Failed to load service ticket tasks. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (serviceTicketId) {
      fetchTasks();
    }
  }, [serviceTicketId]);

  const handleTaskNameClick = (task: ServiceTicketTask) => {
    setSelectedTask(task);
    setSopStepDialogOpen(true);
  };

  const handleEditClick = (task: ServiceTicketTask) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = async (taskId: number) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      confirmColor: 'error',
    });

    if (confirmed) {
      try {
        await serviceTicketTaskApi.deleteServiceTicketTask(taskId);
        fetchTasks();
        if (onTasksUpdated) {
          onTasksUpdated();
        }
      } catch (err) {
        console.error('Error deleting task:', err);
        setError('Failed to delete task. Please try again later.');
      }
    }
  };

  const handleTaskSaved = () => {
    fetchTasks();
    setEditDialogOpen(false);
    if (onTasksUpdated) {
      onTasksUpdated();
    }
  };

  if (loading && tasks.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (tasks.length === 0 && !loading) {
    return (
      <Box p={2}>
        <Alert severity="info">No tasks found for this service ticket.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Service Ticket Tasks
      </Typography>
      <Button
        variant="contained"
        color="primary"
        sx={{ mb: 2 }}
        onClick={() => setAddingTask(true)}
        disabled={addingTask}
      >
        Add Task
      </Button>
      {addingTask && (
        <Card sx={{ mb: 2, boxShadow: 2, borderRadius: 2 }}>
          <CardContent>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Task Name"
                value={newTaskData.TaskName || ''}
                onChange={e => setNewTaskData({ ...newTaskData, TaskName: e.target.value })}
                fullWidth
              />
              <TextField
                label="Sequence"
                type="number"
                value={newTaskData.Sequence || tasks.length + 1}
                onChange={e => setNewTaskData({ ...newTaskData, Sequence: Number(e.target.value) })}
                fullWidth
              />
              <TextField
                label="Status"
                value={newTaskData.TaskStatus || 'New'}
                onChange={e => setNewTaskData({ ...newTaskData, TaskStatus: e.target.value })}
                fullWidth
              />
              <TextField
                label="Start Date"
                type="date"
                value={newTaskData.TaskStartDate || ''}
                onChange={e => setNewTaskData({ ...newTaskData, TaskStartDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Closure Date"
                type="date"
                value={newTaskData.TaskClosureDate || ''}
                onChange={e => setNewTaskData({ ...newTaskData, TaskClosureDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Agent ID"
                type="number"
                value={newTaskData.TaskServiceAgent || ''}
                onChange={e => setNewTaskData({ ...newTaskData, TaskServiceAgent: Number(e.target.value) })}
                fullWidth
              />
            </Box>
          </CardContent>
          <CardActions>
            <Button
              variant="contained"
              color="success"
              onClick={async () => {
                try {
                  await serviceTicketTaskApi.createServiceTicketTask({ ...newTaskData, ServiceTicketId: serviceTicketId });
                  setAddingTask(false);
                  setNewTaskData({ ServiceTicketId: serviceTicketId, TaskName: '', TaskStatus: 'New', Sequence: tasks.length + 1, TaskStartDate: '', TaskClosureDate: '', TaskServiceAgent: undefined });
                  fetchTasks();
                  if (onTasksUpdated) onTasksUpdated();
                } catch (err) {
                  setError('Failed to create new task. Please try again.');
                }
              }}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setAddingTask(false);
                setNewTaskData({ ServiceTicketId: serviceTicketId, TaskName: '', TaskStatus: 'New', Sequence: tasks.length + 1, TaskStartDate: '', TaskClosureDate: '', TaskServiceAgent: undefined });
              }}
            >
              Cancel
            </Button>
          </CardActions>
        </Card>
      )}

      <Grid container spacing={2}>
        {tasks.map((task) => (
          <Grid item xs={12} sm={6} md={4} key={task.ServiceTicketTaskId}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                boxShadow: 2,
                borderRadius: 2,
                overflow: 'hidden',
                '&:hover': {
                  boxShadow: 4,
                },
                borderTop: `4px solid ${{
                  New: '#2196f3',
                  Assigned: '#ff9800',
                  InProgress: '#3f51b5',
                  Closed: '#4caf50'
                }[task.TaskStatus] || '#9e9e9e'}`
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Chip 
                    label={`Sequence: ${task.Sequence}`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  <Chip 
                    icon={getStatusIcon(task.TaskStatus)}
                    label={task.TaskStatus} 
                    size="small" 
                    color={getStatusColor(task.TaskStatus) as any}
                  />
                </Box>
                
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    color: 'primary.main',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                  onClick={() => handleTaskNameClick(task)}
                >
                  <LinkIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="subtitle1" component="div">
                    {task.TaskName}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1.5 }} />
                
                <Box display="flex" alignItems="center" mt={1} mb={1}>
                  <PersonIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    <strong>Agent:</strong> {task.agent_name || (task.agent_details?.serviceagentname || 'Not assigned')}
                  </Typography>
                </Box>
                
                <Divider sx={{ my: 1 }} />
                
                <Box mt={1}>
                  <Box display="flex" alignItems="center" mb={0.5}>
                    <CalendarTodayIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>Start:</strong> {formatDate(task.TaskStartDate)}
                    </Typography>
                  </Box>
                  <Box display="flex" alignItems="center">
                    <CalendarTodayIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      <strong>Closure:</strong> {formatDate(task.TaskClosureDate)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'flex-end', p: 1, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => handleEditClick(task)}
                  aria-label="Edit task"
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDeleteClick(task.ServiceTicketTaskId)}
                  aria-label="Delete task"
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {selectedTask && (
        <>
          <SOPStepDetailsDialog
            open={sopStepDialogOpen}
            onClose={() => setSopStepDialogOpen(false)}
            sopStep={selectedTask.sop_step_details || (selectedTask.SOPStepID as any)}
            taskName={selectedTask.TaskName}
          />
          
          <TaskEditDialog
            open={editDialogOpen}
            onClose={() => setEditDialogOpen(false)}
            task={selectedTask}
            serviceTicketId={serviceTicketId}
            onSave={handleTaskSaved}
          />
        </>
      )}

      <ConfirmDialog />
    </Box>
  );
};

export default ServiceTicketTasksComponent;
