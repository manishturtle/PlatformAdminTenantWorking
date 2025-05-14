import type { NextPage } from 'next';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

const CustomerOTPScreen = dynamic(
  () => import('@/components/externalcustomer/CustomerOTPScreen'),
  { ssr: false }
);

const OTPPage: NextPage = () => {
  const router = useRouter();
  const { mode } = router.query;

  return <CustomerOTPScreen mode={mode as 'signup' | 'login'} />;
};

export default OTPPage;
