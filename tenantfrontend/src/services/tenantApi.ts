import { getTenantApiBaseUrl } from '@/utils/tenantUtils';

interface CompanyInfo {
  company_name: string;
  registered_address: {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
  };
  primary_contact_email: string;
  primary_contact_phone: string;
  gstin?: string;
  tax_id?: string; // Alias for gstin for form compatibility
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
  default_theme_mode?: string;
}

interface LocalizationConfig {
  default_language: string;
}

export interface TenantConfigData {
  company_info: Partial<CompanyInfo>;
  branding_config?: Partial<BrandingConfig>;
  localization_config?: Partial<LocalizationConfig>;
}

export const saveTenantConfig = async (data: Partial<TenantConfigData>): Promise<void> => {
  const url = `${getTenantApiBaseUrl()}/tenant-admin/tenant-config/`;
  
  // Transform data to match API format
  const requestData: any = { ...data };
  
  // Map form fields to API fields
  if (data.company_info) {
    // Ensure registered_address exists
    requestData.company_info = {
      ...data.company_info,
      registered_address: data.company_info.registered_address || {
        street: data.company_info.addressLine1 || '',
        city: data.company_info.city || '',
        state: data.company_info.state || '',
        postal_code: data.company_info.postalCode || '',
        country: data.company_info.country || '',
      },
      // Map taxId to gstin if provided
      ...(data.company_info.taxId && { gstin: data.company_info.taxId })
    };
    
    // Remove form-specific fields
    const { addressLine1, addressLine2, postalCode, taxId, ...restCompanyInfo } = requestData.company_info;
    requestData.company_info = restCompanyInfo;
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
