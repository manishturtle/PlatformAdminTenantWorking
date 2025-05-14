import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import AddEditCredentialTypeScreen from '../../components/credentials/AddEditCredentialTypeScreen';

const AddCredentialTypePage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Add Credential Type | ITR App</title>
        <meta name="description" content="Add a new credential type" />
      </Head>
      <Layout>
        <AddEditCredentialTypeScreen />
      </Layout>
    </>
  );
};

export default AddCredentialTypePage;
