import React from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import CredentialTypesScreen from '../../components/credentials/CredentialTypesScreen';

const CredentialTypesPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Credential Types | ITR App</title>
        <meta name="description" content="Manage credential types" />
      </Head>
      <Layout>
        <CredentialTypesScreen />
      </Layout>
    </>
  );
};

export default CredentialTypesPage;
