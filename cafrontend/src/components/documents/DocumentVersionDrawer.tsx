import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { documentApi } from '../../services/api';
import { Document } from '../../types/document';

interface DocumentVersionDrawerProps {
  open: boolean;
  onClose: () => void;
  documentId: number | null;
}

const DocumentVersionDrawer: React.FC<DocumentVersionDrawerProps> = ({
  open,
  onClose,
  documentId
}) => {
  const [versions, setVersions] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [documentTypeName, setDocumentTypeName] = useState<string>('');

  useEffect(() => {
    if (open && documentId) {
      fetchVersions();
    } else {
      // Reset state when drawer closes
      setVersions([]);
      setDocumentTypeName('');
    }
  }, [open, documentId]);

  const fetchVersions = async () => {
    if (!documentId) return;
    
    setLoading(true);
    try {
      const response = await documentApi.getDocumentVersions(documentId);
      setVersions(response);
      
      // Set document type name from the first version
      if (response.length > 0) {
        setDocumentTypeName(response[0].document_type_name || 'Document');
      }
    } catch (error) {
      console.error('Error fetching document versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (versionId: number) => {
    setDownloadingId(versionId);
    try {
      const blob = await documentApi.downloadDocument(versionId);
      
      // Get the document details from the versions list
      const version = versions.find(v => v.DocumentId === versionId);
      // Use the exact DocumentName from the database for the download
      const fileName = version ? version.DocumentName : `document-${versionId}`;
      
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
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 500 },
          padding: 0,
          marginTop: '64px', // Add margin to account for App Bar height
          height: 'calc(100% - 64px)', // Adjust height to account for App Bar
          maxHeight: 'calc(100% - 64px)', // Ensure content doesn't overflow
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          p: 2, 
          bgcolor: 'primary.main', 
          color: 'primary.contrastText' 
        }}>
          <Typography variant="h6">
            {documentTypeName ? `All Versions of ${documentTypeName}` : 'Document Versions'}
          </Typography>
          <IconButton onClick={onClose} size="small" sx={{ color: 'inherit' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider />

        {/* Content */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
              <CircularProgress />
            </Box>
          ) : versions.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%', 
              py: 8 
            }}>
              <FileDownloadIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No versions found for this document.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Version</TableCell>
                    <TableCell>Original Filename</TableCell>
                    <TableCell>Document Name</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Version Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {versions.map((version) => (
                    <TableRow key={version.DocumentId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          v{version.Version}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '150px' }}>
                          {version.OriginalName || version.DocumentName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: '150px' }}>
                          {version.UserDocuName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {version.DocumentStatus === 'Latest' ? (
                            <span style={{ color: 'green', fontWeight: 'bold' }}>{version.DocumentStatus}</span>
                          ) : (
                            version.DocumentStatus
                          )}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {formatDate(version.VersionDate || version.CreatedAt)}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Download">
                          <IconButton
                            color="primary"
                            onClick={() => handleDownload(version.DocumentId)}
                            disabled={downloadingId === version.DocumentId}
                            size="small"
                          >
                            {downloadingId === version.DocumentId ? (
                              <CircularProgress size={20} />
                            ) : (
                              <DownloadIcon />
                            )}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default DocumentVersionDrawer;
