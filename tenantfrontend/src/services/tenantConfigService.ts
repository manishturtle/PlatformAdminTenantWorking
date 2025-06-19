import axios from 'axios';
import { getTenantFromUrl } from '@/utils/tenantUtils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface TenantConfig {
  branding_config: {
    company_logo_light?: { url: string; filename: string } | null;
    company_logo_dark?: { url: string; filename: string } | null;
    favicon?: { url: string; filename: string } | null;
    primary_brand_color?: string;
    secondary_brand_color?: string;
    default_font_style?: string;
    default_theme_mode?: string;
  };
  company_info: {
    company_name?: string;
    registered_address?: {
      street?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
    primary_contact_email?: string;
    primary_contact_phone?: string;
    gstin?: string;
  };
  localization_config: {
    default_language?: string;
    default_time_zone?: string;
    default_date_format?: string;
    default_time_format?: '12h' | '24h';
  };
}

export const getTenantConfig = async (): Promise<TenantConfig> => {
  try {
    const tenant = getTenantFromUrl();
    const response = await axios.get(`${API_BASE_URL}/api/${tenant}/tenant-admin/tenant-config/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    // Return default empty config if not found
    return {
      branding_config: {},
      company_info: {},
      localization_config: {}
    };
  }
};

export const saveTenantConfig = async (config: Partial<TenantConfig>): Promise<TenantConfig> => {
  try {
    const tenant = getTenantFromUrl();
    const response = await axios.post(
      `${API_BASE_URL}/api/${tenant}/tenant-admin/tenant-config/`,
      config
    );
    return response.data;
  } catch (error) {
    console.error('Error saving tenant config:', error);
    throw error;
  }
};

// Helper function to map frontend format to API format
export const mapToApiFormat = (formData: any): Partial<TenantConfig> => {
  return {
    branding_config: {
      primary_brand_color: formData.primaryColor,
      secondary_brand_color: formData.secondaryColor,
      default_font_style: formData.selectedFont?.code,
      default_theme_mode: formData.themeMode,
      company_logo_light: formData.logoLight || null,
      company_logo_dark: formData.logoDark || null,
      favicon: formData.favicon || null,
    },
    company_info: {
      company_name: formData.companyName,
      primary_contact_email: formData.contactEmail,
      primary_contact_phone: formData.contactPhone,
      gstin: formData.taxId,
      registered_address: {
        street: formData.addressLine1,
        city: formData.city,
        state: formData.state,
        postal_code: formData.postalCode,
        country: formData.country,
      },
    },
    localization_config: {
      default_language: formData.language,
      default_time_zone: formData.timezone,
      default_date_format: formData.dateFormat,
      default_time_format: formData.timeFormat,
    },
  };
};

// Helper function to map API format to frontend format
export const mapFromApiFormat = (config: TenantConfig): any => {
  return {
    primaryColor: config.branding_config?.primary_brand_color || '',
    secondaryColor: config.branding_config?.secondary_brand_color || '',
    selectedFont: { code: config.branding_config?.default_font_style || '', name: '' },
    themeMode: config.branding_config?.default_theme_mode || 'light',
    logoLight: config.branding_config?.company_logo_light,
    logoDark: config.branding_config?.company_logo_dark,
    favicon: config.branding_config?.favicon,
    companyName: config.company_info?.company_name || '',
    contactEmail: config.company_info?.primary_contact_email || '',
    contactPhone: config.company_info?.primary_contact_phone || '',
    taxId: config.company_info?.gstin || '',
    addressLine1: config.company_info?.registered_address?.street || '',
    city: config.company_info?.registered_address?.city || '',
    state: config.company_info?.registered_address?.state || '',
    postalCode: config.company_info?.registered_address?.postal_code || '',
    country: config.company_info?.registered_address?.country || '',
    language: config.localization_config?.default_language || '',
    timezone: config.localization_config?.default_time_zone || '',
    dateFormat: config.localization_config?.default_date_format || '',
    timeFormat: config.localization_config?.default_time_format || '12h',
  };
};
