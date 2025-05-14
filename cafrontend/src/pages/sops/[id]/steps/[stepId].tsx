import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import AddEditStepScreen from '../../../../components/sops/AddEditStepScreen';
import withAuth from '../../../../components/auth/withAuth';
import { GetStaticProps, GetStaticPaths } from 'next';

interface EditStepPageProps {
  id: string;
  stepId: string;
}

const EditStepPage: React.FC<EditStepPageProps> = ({ id, stepId }) => {
  const router = useRouter();
  const sopId = Number(id);
  const stepIdNum = Number(stepId);

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>{stepIdNum ? 'Edit' : 'Add'} SOP Step | ITR App</title>
        <meta name="description" content={`${stepIdNum ? 'Edit' : 'Add'} a step for SOP`} />
      </Head>
      
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs aria-label="breadcrumb">
            <Link href="/" passHref>
              <MuiLink underline="hover" color="inherit">
                Home
              </MuiLink>
            </Link>
            <Link href="/sops" passHref>
              <MuiLink underline="hover" color="inherit">
                SOPs
              </MuiLink>
            </Link>
            {sopId && (
              <Link href={`/sops/${sopId}/steps`} passHref>
                <MuiLink underline="hover" color="inherit">
                  Steps
                </MuiLink>
              </Link>
            )}
            <Typography color="text.primary">
              {stepIdNum ? 'Edit Step' : 'Add Step'}
            </Typography>
          </Breadcrumbs>
        </Box>
        
        <AddEditStepScreen 
          sopId={sopId} 
          stepId={stepIdNum}
        />
      </Container>
    </>
  );
};

export const getStaticPaths = async () => {
  return {
    paths: [],
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { id, stepId } = params || {};

  if (!id || !stepId || Array.isArray(id) || Array.isArray(stepId)) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      id,
      stepId
    },
    revalidate: 1
  };
};

export default withAuth(EditStepPage);
