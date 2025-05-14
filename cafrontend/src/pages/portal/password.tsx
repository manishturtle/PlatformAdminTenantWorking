import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

const CustomerLoginScreen2 = dynamic(
  () => import('@/components/externalcustomer/CustomerLoginScreen2'),
  { ssr: false }
);

const PasswordPage: NextPage = () => {
  return <CustomerLoginScreen2 />;
};

export default PasswordPage;
