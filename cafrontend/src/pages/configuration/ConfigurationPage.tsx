import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import { 
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import type { SxProps } from '@mui/system';
import axios from 'axios';

// Import icons
import { 
  Description as DocumentIcon,
  VpnKey as CredentialIcon,
  Settings as ProcessIcon,
  Assignment as SOPIcon,
  Category as CategoryIcon,
  Person as AgentIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Import components
import DocumentMasterScreen from '../../components/documents/DocumentMasterScreen';
import CredentialMasterScreen from '../../components/credentials/CredentialTypesScreen';
import ProcessMasterScreen from '../../components/processes/ProcessMasterScreen';
import SOPMasterScreen from '../../components/sops/SOPMasterScreen';
import ServiceCategoriesListComponent from '../../components/servicecategory/ServiceCategoriesListComponent';
import ServiceAgentList from '../../components/serviceagent/ServiceAgentList';
import { serviceCategoryApi } from '@/services/api';

// Type definitions
interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
}

interface ServiceAgent {
  id: number;
  name: string;
  email: string;
  status: string;
  expertAt: number[];
  allowPortalAccess: boolean;
  clientId: number;
  companyId: number;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType;
  ref: React.RefObject<HTMLDivElement>;
}

interface NavItemProps {
  item: {
    icon: React.ComponentType;
    label: string;
  };
  active: boolean;
  onClick: () => void;
  sx?: SxProps<Theme>;
}

interface DialogState {
  open: boolean;
  mode: 'add' | 'edit';
}

interface CategoryDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  initialName?: string;
  mode: 'add' | 'edit';
}

interface SelectedCategory {
  id: string;
  name: string;
  description: string;
}

/**
 * CategoryDialog component for adding or editing categories
 */
const CategoryDialog: React.FC<CategoryDialogProps> = ({ 
  open, 
  onClose, 
  onSave, 
  initialName = '', 
  mode 
}) => {
  const [name, setName] = useState<string>(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(name);
    setName('');
  };

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>{mode === 'add' ? 'Add Category' : 'Edit Category'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" color="primary">
            {mode === 'add' ? 'Add' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

/**
 * NavItem component for navigation menu items
 */
const NavItem: React.FC<NavItemProps> = React.memo(({ 
  item, 
  active, 
  onClick, 
  sx = {} 
}) => {
  const theme = useTheme();

  return (
    <ListItemButton
      onClick={onClick}
      selected={active}
      sx={{
        borderRadius: 1,
        mb: 0.5,
        ...sx,
      }}
    >
      <ListItemIcon>
        {React.createElement(item.icon, {
          sx: { color: active ? theme.palette.primary.main : 'inherit' },
        })}
      </ListItemIcon>
      <ListItemText
        primary={item.label}
        sx={{
          '& .MuiListItemText-primary': {
            color: active ? theme.palette.primary.main : 'inherit',
            fontWeight: active ? 600 : 400,
          },
        }}
      />
    </ListItemButton>
  );
});

// Add display name for React.memo component
NavItem.displayName = 'NavItem';

/**
 * ConfigurationPage component for managing various configuration settings
 */
const ConfigurationPage: React.FC = () => {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Refs for sections
  const documentSectionRef = useRef<HTMLDivElement | null>(null);
  const credentialSectionRef = useRef<HTMLDivElement | null>(null);
  const processSectionRef = useRef<HTMLDivElement | null>(null);
  const sopSectionRef = useRef<HTMLDivElement | null>(null);
  const categorySectionRef = useRef<HTMLDivElement | null>(null);
  const agentSectionRef = useRef<HTMLDivElement | null>(null);

  // State
  const [activeSection, setActiveSection] = useState<string>('documents');
  const [dialogState, setDialogState] = useState<DialogState>({ open: false, mode: 'add' });
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);

  // Menu items for navigation
  const menuItems: MenuItem[] = useMemo(
    () => [
      { id: 'documents', label: 'Document Types', icon: DocumentIcon, ref: documentSectionRef },
      { id: 'credentials', label: 'Credential Types', icon: CredentialIcon, ref: credentialSectionRef },
      { id: 'processes', label: 'Process Types', icon: ProcessIcon, ref: processSectionRef },
      { id: 'sops', label: 'SOP Types', icon: SOPIcon, ref: sopSectionRef },
      { id: 'categories', label: 'Service Categories', icon: CategoryIcon, ref: categorySectionRef },
      { id: 'agents', label: 'Service Agents', icon: AgentIcon, ref: agentSectionRef },
    ],
    []
  );

  // Fetch service categories
  const fetchServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await serviceCategoryApi.getServiceCategories({ page_size: 100 });
      console.log('Service categories response:', response);
      
      const formattedCategories = response.results.map(category => ({
        id: category.servicecategoryid,
        name: category.servicecategoryname,
        description: category.description
      }));
      
      console.log('Formatted service categories:', formattedCategories);
      setServiceCategories(formattedCategories);
    } catch (error) {
      console.error('Error fetching service categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchServiceCategories();
  }, []);

  // Scroll to section handler
  const scrollToSection = useCallback((sectionId: string) => {
    const menuItem = menuItems.find((item) => item.id === sectionId);
    if (menuItem && menuItem.ref.current) {
      menuItem.ref.current.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  }, [menuItems]);

  // Handle section change
  const handleSectionChange = useCallback((sectionId: string) => {
    scrollToSection(sectionId);
  }, [scrollToSection]);

  // Category dialog handlers
  const handleOpenCategoryDialog = useCallback((mode: 'add' | 'edit', category?: SelectedCategory) => {
    setDialogState({ open: true, mode });
    if (mode === 'edit' && category) {
      setSelectedCategory(category);
      setNewCategoryName(category.name);
    } else {
      setSelectedCategory(null);
      setNewCategoryName('');
    }
  }, []);

  const handleCloseCategoryDialog = useCallback(() => {
    setDialogState({ open: false, mode: 'add' });
    setNewCategoryName('');
    setSelectedCategory(null);
  }, []);

  // Save category handler
  const handleSaveCategory = useCallback(async (name: string) => {
    try {
      if (dialogState.mode === 'add') {
        // API call to add new category
        // await axios.post('/api/categories', { name });
        console.log('Adding new category:', name);
      } else if (dialogState.mode === 'edit' && selectedCategory) {
        // API call to update category
        // await axios.put(`/api/categories/${selectedCategory.id}`, { name });
        console.log('Updating category:', selectedCategory.id, 'with name:', name);
      }
      handleCloseCategoryDialog();
    } catch (error) {
      console.error('Error saving category:', error);
    }
  }, [dialogState.mode, selectedCategory, handleCloseCategoryDialog]);

  // Intersection Observer for active section detection
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.id;
          if (sectionId) {
            setActiveSection(sectionId);
          }
        }
      });
    }, options);

    menuItems.forEach((item) => {
      if (item.ref.current) {
        observer.observe(item.ref.current);
      }
    });

    return () => {
      menuItems.forEach((item) => {
        if (item.ref.current) {
          observer.unobserve(item.ref.current);
        }
      });
    };
  }, [menuItems]);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Navigation Sidebar */}
      <Paper 
        elevation={4} 
        sx={{ 
          width: 240, 
          position: 'fixed', 
          height: '100vh', 
          overflow: 'auto', 
          zIndex: 1 
        }}
      >
        <List component="nav">
          {menuItems.map((item: MenuItem) => (
            <NavItem
              key={item.id}
              item={item}
              active={activeSection === item.id}
              onClick={() => handleSectionChange(item.id)}
            />
          ))}
        </List>
      </Paper>

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          ml: { xs: 0, sm: '240px' }, 
          width: { xs: '100%', sm: 'calc(100% - 240px)' } 
        }}
      >
        <Container maxWidth="lg">
          {/* Document Types Section */}
          <Box 
            ref={documentSectionRef} 
            id="documents" 
            sx={{ mb: 6, scrollMarginTop: '1rem' }}
          >
            <DocumentMasterScreen />
          </Box>

          {/* Credential Types Section */}
          <Box 
            ref={credentialSectionRef} 
            id="credentials" 
            sx={{ mb: 6, scrollMarginTop: '1rem' }}
          >
            <CredentialMasterScreen />
          </Box>

          {/* Process Types Section */}
          <Box 
            ref={processSectionRef} 
            id="processes" 
            sx={{ mb: 6, scrollMarginTop: '1rem' }}
          >
            <ProcessMasterScreen />
          </Box>

          {/* SOP Types Section */}
          <Box 
            ref={sopSectionRef} 
            id="sops" 
            sx={{ mb: 6, scrollMarginTop: '1rem' }}
          >
            <SOPMasterScreen />
          </Box>

          {/* Service Categories Section */}
          <Box 
            ref={categorySectionRef} 
            id="categories" 
            sx={{ mb: 6, scrollMarginTop: '1rem' }}
          >
            <ServiceCategoriesListComponent 
              onEditCategory={(category) => handleOpenCategoryDialog('edit', category)}
            />
          </Box>

          {/* Service Agents Section */}
          <Box 
            ref={agentSectionRef} 
            id="agents" 
            sx={{ mb: 6, scrollMarginTop: '1rem' }}
          >
            <ServiceAgentList serviceCategories={serviceCategories} />
          </Box>
        </Container>
      </Box>

      {/* Category Dialog */}
      <CategoryDialog
        open={dialogState.open}
        onClose={handleCloseCategoryDialog}
        onSave={handleSaveCategory}
        initialName={newCategoryName}
        mode={dialogState.mode}
      />
    </Box>
  );
};

export default ConfigurationPage;
