import React from 'react';
import Head from 'next/head';
import DocumentListScreen from '../../components/documents/DocumentListScreen';
import { Box } from '@mui/material';
import withModuleAccess from '../../components/common/withModuleAccess';

const DocumentsListPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Document Management | Software4CA</title>
        <meta name="description" content="Manage all documents in the system" />
      </Head>
      <Box component="main">
        <DocumentListScreen />
      </Box>
    </>
  );
};

export default withModuleAccess(DocumentsListPage, 'documents');
