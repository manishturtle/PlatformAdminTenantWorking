import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/layout/Layout';
import AddEditProcessScreen from '../../../components/processes/AddEditProcessScreen';
import { GetStaticProps } from 'next';

interface EditProcessPageProps {
  id: string;
}

const EditProcessPage: React.FC<EditProcessPageProps> = ({ id }) => {
  const router = useRouter();

  if (router.isFallback) {
    return <div>Loading...</div>;
  }

  return (
    <Layout>
      <AddEditProcessScreen processId={Number(id)} />
    </Layout>
  );
};

export const getStaticPaths = async () => {
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

export default EditProcessPage;
