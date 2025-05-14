import React from 'react';
import { Box } from '@mui/material';
import ServiceTicketsListComponent from '../../components/service-tickets/ServiceTicketsListComponent';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import withModuleAccess from '../../components/common/withModuleAccess';

const ServiceTicketsPage = () => {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <h1>Service Tickets</h1>
        <ServiceTicketsListComponent />
      </Box>
    </LocalizationProvider>
  );
};

export default withModuleAccess(ServiceTicketsPage, 'servicetickets');
