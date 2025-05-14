import "../styles/globals.css";
import type { AppProps } from "next/app";
import FontConfig from "../styles/font-config";
import Layout from "../components/layout/Layout";
import { useRouter } from "next/router";
import { ConfirmProvider } from "material-ui-confirm";
import { useEffect } from "react";
import axios from "axios";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();


  const handleAuth = async () => {
    try {
      const currentUrl = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const tenant_slug = urlParams.get('tenant_slug');
      const hasCheckedTenant = sessionStorage.getItem('hasCheckedTenant');
      const app_id = urlParams.get('app_id');


      // If we have a token in URL, we just logged in - store it and skip tenant check
      if (token) {
        localStorage.setItem('token', token);
        localStorage.setItem('tenant_slug', tenant_slug || '');
        localStorage.setItem('app_id', app_id || '');
        // Remove token from URL without refreshing page
        const newUrl = window.location.pathname +
          window.location.search.replace(/[?&]token=[^&]+/, '') +
          window.location.hash;
        window.history.replaceState({}, document.title, newUrl);
        return;
      }

      // Only skip tenant check if we have both a token and have checked tenant before
      const storedToken = localStorage.getItem('token');
      const storedTenantSlug = localStorage.getItem('tenant_slug');
      if (storedToken && hasCheckedTenant && storedTenantSlug) {
        return;
      }

      // Mark that we've checked tenant in this session
      sessionStorage.setItem('hasCheckedTenant', 'true');

      // Only check tenant if we have no token
      const checkTenantResponse = await axios.post(
        "http://localhost:8000/api/platform-admin/subscription/check-tenant-exist/",
        {
          application_url: currentUrl,
        }
      );

      const tenantData = checkTenantResponse.data;
      console.log("tenant check response:", tenantData);

      if (tenantData?.redirect_to_iam) {
        console.log("Redirecting to IAM:", tenantData.redirect_to_iam);
        window.location.href = tenantData.redirect_to_iam;
      }
    } catch (error) {
      console.error("Error in auth flow:", error);
      if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status || 0)) {
        localStorage.removeItem('token');
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for token in URL or initiate tenant check
    handleAuth();
  }, []);

  useEffect(() => {
    // Clean up any reload count when component unmounts
    return () => {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('reloadCount');
      }
    };
  }, []);

  // Check if the current page should bypass the admin layout
  
  const isStandalonePage =
    router.pathname === "/login" || router.pathname.startsWith("/portal");

  return (
    <>
      <FontConfig />
      <ConfirmProvider>
        {isStandalonePage ? (
          <Component {...pageProps} />
        ) : (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        )}
      </ConfirmProvider>
    </>
  );
}