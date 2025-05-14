import { useRouter } from 'next/router';
import CustomerOTPScreen from '@/components/externalcustomer/CustomerOTPScreen';
import { useEffect, useState } from 'react';

type VerifyMode = 'login' | 'signup';

const CustomerVerifyPage = () => {
    const router = useRouter();
    const [mode, setMode] = useState<VerifyMode>('login');

    useEffect(() => {
        // Access sessionStorage only on client side
        const verifyEmail = sessionStorage.getItem('verifyEmail');
        setMode(verifyEmail ? 'signup' : 'login');
    }, []);

    return <CustomerOTPScreen mode={mode} />;
};

export default CustomerVerifyPage;
