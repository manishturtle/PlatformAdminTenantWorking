import type { NextPage } from 'next';
import dynamic from 'next/dynamic';

const CustomerSignupScreen = dynamic(
  () => import('@/components/externalcustomer/CustomerSignupScreen'),
  { ssr: false }
);

const SignupPage: NextPage = () => {
  return <CustomerSignupScreen />;
};

export default SignupPage;
