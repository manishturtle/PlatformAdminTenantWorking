import { getTenantApiBaseUrl } from '@/utils/tenantUtils';

interface CompanyInfo {
  company_name: string;
  registered_address: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    postal_code: string;
    country: string | number;
  };
  primary_contact_email: string;
  primary_contact_phone: string;
  tax_id?: string;
}

interface BrandingConfig {
  company_logo_light?: {
    url: string;
    filename: string;
  } | null;
  company_logo_dark?: {
    url: string;
    filename: string;
  } | null;
  favicon?: {
    url: string;
    filename: string;
  } | null;
  primary_brand_color?: string;
  secondary_brand_color?: string;
  default_font_style?: string;
  default_theme_mode?: 'light' | 'dark' | 'system';
  custom_css?: string;
}

interface LocalizationConfig {
  default_language: string;
  default_timezone?: string;
  date_format?: string;
  time_format?: string;
  currency?: string;
}

export interface TenantConfigData {
  company_info: Partial<CompanyInfo>;
  branding_config?: Partial<BrandingConfig>;
  localization_config?: Partial<LocalizationConfig>;
}

export const getTenantConfig = async (): Promise<TenantConfigData> => {
  const url = `${getTenantApiBaseUrl()}/tenant-admin/tenant-config/`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken') || '',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch tenant configuration');
    }

    const responseData = await response.json();
    console.log('Tenant config fetched:', responseData);
    return responseData;
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    throw error;
  }
};

export const saveTenantConfig = async (data: Partial<TenantConfigData>): Promise<void> => {
  const url = `${getTenantApiBaseUrl()}/tenant-admin/tenant-config/`;
  
  // Transform data to match API format
  const requestData: any = { ...data };
  
  // For consistency and to avoid errors, we now directly use the API format
  // rather than trying to transform form fields
  if (data.company_info) {
    requestData.company_info = {
      ...data.company_info
    };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add CSRF token if needed
        'X-CSRFToken': getCookie('csrftoken') || '',
      },
      credentials: 'include',
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to save tenant configuration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving tenant config:', error);
    throw error;
  }
};

// Helper function to get cookie value
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}
