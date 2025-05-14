import React from 'react';
import Head from 'next/head';
import CustomerListScreen from '../../components/customers/CustomerListScreen';
import withModuleAccess from '../../components/common/withModuleAccess';

const CustomersPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Customer Management</title>
        <meta name="description" content="Customer management system" />
      </Head>
      <CustomerListScreen />
    </>
  );
};

export default withModuleAccess(CustomersPage, 'customers');
