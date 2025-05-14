import React from 'react';
import { NextPage, GetStaticProps, GetStaticPaths } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../../components/layout/Layout';
import AddEditCredentialTypeScreen from '../../../components/credentials/AddEditCredentialTypeScreen';

interface EditCredentialTypePageProps {
  id: string;
}

const EditCredentialTypePage: NextPage<EditCredentialTypePageProps> = ({ id }) => {
  const router = useRouter();
  const credentialTypeId = id ? parseInt(id, 10) : undefined;

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Edit Credential Type | ITR App</title>
        <meta name="description" content="Edit credential type" />
      </Head>
      <Layout>
        {credentialTypeId ? (
          <AddEditCredentialTypeScreen credentialTypeId={credentialTypeId} />
        ) : (
          <div>Loading...</div>
        )}
      </Layout>
    </>
  );
};

export const getStaticPaths = async () => {
  return {
    paths: [],
    fallback: true
  };
};

// export { getStaticPaths as default };

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

export default EditCredentialTypePage;
