import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Box, Container, Paper } from '@mui/material';
import EditCustomerScreen from '../../../components/customers/EditCustomerScreen';
import { GetStaticProps, GetStaticPaths } from 'next';

interface EditCustomerPageProps {
  id: string;
}

const EditCustomerPage: React.FC<EditCustomerPageProps> = ({ id }) => {
  const router = useRouter();

  // Handle fallback
  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Edit Customer | Software4CA</title>
        <meta name="description" content="Edit customer details" />
      </Head>
      <Container maxWidth="lg">
        <Box sx={{ my: 4 }}>
          <Paper elevation={0} sx={{ p: 0 }}>
            <EditCustomerScreen customerId={Number(id)} />
          </Paper>
        </Box>
      </Container>
    </>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [], // Don't pre-render any paths
    fallback: true, // Generate pages on-demand
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params?.id as string; // Safely assert that params.id is a string

  if (!id) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      id,
    },
    revalidate: 1, // Regenerate page when a request comes in
  };
};

export default EditCustomerPage;