import React from 'react';
import { Box } from '@mui/material';
import ServiceTicketDetailsComponent from '../../../components/service-tickets/ServiceTicketDetailsComponent';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useRouter } from 'next/router';
import { GetStaticProps, GetStaticPaths } from 'next';

interface ServiceTicketDetailsPageProps {
  id: string;
}

const ServiceTicketDetailsPage: React.FC<ServiceTicketDetailsPageProps> = ({ id }) => {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <ServiceTicketDetailsComponent />
      </Box>
    </LocalizationProvider>
  );
};

export const getStaticPaths: GetStaticPaths = async () => {
  return {
    paths: [],
    fallback: true
  };
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const id = params?.id;

  if (!id || Array.isArray(id)) {
    return {
      notFound: true
    };
  }

  return {
    props: {
      id
    },
    revalidate: 1
  };
};

export default ServiceTicketDetailsPage;
