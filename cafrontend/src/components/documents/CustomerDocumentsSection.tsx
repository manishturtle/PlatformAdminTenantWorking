import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Pagination,
  Chip,
  Tooltip,
  CircularProgress,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Add as AddIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { documentApi } from '../../services/api';
import { Document, DocumentListResponse } from '../../types/document';
import DocumentUploadDrawer from './DocumentUploadDrawer';
import DocumentEditDrawer from './DocumentEditDrawer';
import DocumentVersionDrawer from './DocumentVersionDrawer';

interface CustomerDocumentsSectionProps {
  customerId: number;
}

const PAGE_SIZE = 10;

const CustomerDocumentsSection: React.FC<CustomerDocumentsSectionProps> = ({ customerId }) => {
  // State for documents
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  
  // State for drawers
  const [uploadDrawerOpen, setUploadDrawerOpen] = useState<boolean>(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState<boolean>(false);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState<boolean>(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  
  // State for download
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  
  // State for menu
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuDocumentId, setMenuDocumentId] = useState<number | null>(null);
  
  // State for drawers and actions

  // Load documents on component mount and when customerId or page changes
  useEffect(() => {
    if (customerId) {
      fetchDocuments();
    }
  }, [customerId, page]);

  const fetchDocuments = async () => {
    if (!customerId) return;
    
    setLoading(true);
    try {
      const response = await documentApi.getDocuments({
        customer_id: customerId,
        page,
        page_size: PAGE_SIZE
      });
      
      setDocuments(response.results);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleOpenUploadDrawer = () => {
    setUploadDrawerOpen(true);
  };

  const handleCloseUploadDrawer = () => {
    setUploadDrawerOpen(false);
  };

  const handleUploadSuccess = () => {
    // Refresh the documents list after successful upload
    fetchDocuments();
  };

  const handleEditSuccess = () => {
    // Refresh the documents list after successful edit
    fetchDocuments();
    setEditDrawerOpen(false);
  };
  
  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>, documentId: number) => {
    setAnchorEl(event.currentTarget);
    setMenuDocumentId(documentId);
  };
  
  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuDocumentId(null);
  };
  
  const handleEdit = () => {
    setSelectedDocumentId(menuDocumentId);
    setEditDrawerOpen(true);
    handleCloseMenu();
  };
  
  const handleViewVersions = () => {
    setSelectedDocumentId(menuDocumentId);
    setVersionDrawerOpen(true);
    handleCloseMenu();
  };
  
  // No delete functionality as per requirements

  const handleDownload = async (documentId: number) => {
    setDownloadingId(documentId);
    try {
      const blob = await documentApi.downloadDocument(documentId);
      
      // Get the document name from the list
      const doc = documents.find(doc => doc.DocumentId === documentId);
      const fileName = doc ? doc.DocumentName : `document-${documentId}`;
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      window.document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Error downloading document. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleToggleVisibility = async (documentId: number, currentVisibility: boolean) => {
    try {
      await documentApi.updateDocument(documentId, {
        VisibleToCust: !currentVisibility
      });
      
      // Update the local state to reflect the change
      setDocuments(documents.map(doc => 
        doc.DocumentId === documentId 
          ? { ...doc, VisibleToCust: !currentVisibility }
          : doc
      ));
    } catch (error) {
      console.error('Error updating document visibility:', error);
      alert('Error updating document visibility. Please try again.');
    }
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 3
        }}>
          <Typography variant="h6" component="h2">
            Customer Documents
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenUploadDrawer}
          >
            Upload Document
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Document Name</TableCell>
                <TableCell>Document Type</TableCell>
                <TableCell>Version</TableCell>
                <TableCell>Upload Date</TableCell>
                <TableCell>Visibility</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={24} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No documents found
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((document) => (
                  <TableRow key={document.DocumentId}>
                    <TableCell>
                      <Typography variant="body2">{document.UserDocuName || '-'}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {document.OriginalName || document.DocumentName}
                      </Typography>
                    </TableCell>
                    <TableCell>{document.document_type_name}</TableCell>
                    <TableCell>{document.Version}</TableCell>
                    <TableCell>
                      {new Date(document.CreatedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={document.VisibleToCust ? 'Visible' : 'Hidden'}
                        color={document.VisibleToCust ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Download">
                        <IconButton
                          color="primary"
                          onClick={() => handleDownload(document.DocumentId)}
                          disabled={downloadingId === document.DocumentId}
                          size="small"
                        >
                          {downloadingId === document.DocumentId ? (
                            <CircularProgress size={20} />
                          ) : (
                            <DownloadIcon />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={document.VisibleToCust ? 'Hide from customer' : 'Show to customer'}>
                        <IconButton
                          color={document.VisibleToCust ? 'success' : 'default'}
                          onClick={() => handleToggleVisibility(document.DocumentId, document.VisibleToCust)}
                          size="small"
                        >
                          {document.VisibleToCust ? <VisibilityIcon /> : <VisibilityOffIcon />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="More actions">
                        <IconButton
                          onClick={(e) => handleOpenMenu(e, document.DocumentId)}
                          size="small"
                        >
                          <MoreVertIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {totalCount > PAGE_SIZE && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={Math.ceil(totalCount / PAGE_SIZE)}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </CardContent>

      {/* Document Upload Drawer */}
      <DocumentUploadDrawer
        open={uploadDrawerOpen}
        onClose={handleCloseUploadDrawer}
        customerId={customerId}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Document Edit Drawer */}
      <DocumentEditDrawer
        open={editDrawerOpen}
        onClose={() => setEditDrawerOpen(false)}
        documentId={selectedDocumentId}
        onUpdateSuccess={handleEditSuccess}
      />

      {/* Document Version Drawer */}
      <DocumentVersionDrawer
        open={versionDrawerOpen}
        onClose={() => setVersionDrawerOpen(false)}
        documentId={selectedDocumentId}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleViewVersions}>
          <HistoryIcon fontSize="small" sx={{ mr: 1 }} />
          Versions
        </MenuItem>
      </Menu>

      {/* No delete dialog as per requirements */}
    </Card>
  );
};

export default CustomerDocumentsSection;
