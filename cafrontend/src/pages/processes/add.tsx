import React from 'react';
import Layout from '../../components/layout/Layout';
import AddEditProcessScreen from '../../components/processes/AddEditProcessScreen';

const AddProcessPage: React.FC = () => {
  return (
    <Layout>
      <AddEditProcessScreen />
    </Layout>
  );
};

export default AddProcessPage;
