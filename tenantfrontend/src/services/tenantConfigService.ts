import axios from 'axios';
import { getTenantApiBaseUrl } from '../utils/tenantUtils';

// Helper function to get auth headers
const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'X-CSRFToken': getCsrfToken(),
  // Add any other required headers here (e.g., Authorization)
});


// Interfaces for the API response
export interface Address {
  street_address: string;
  street_address2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface CompanyInfo {
  name: string;
  legal_name?: string;
  tax_id?: string;
  registration_number?: string;
  vat_number?: string;
  contact_email: string;
  contact_phone: string;
  website?: string;
  description?: string;
  industry?: string;
  founded_year?: number;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h' | '24-hour';
  first_day_of_week: 'sunday' | 'monday';
  currency: string;
  locale: string;
  registered_address: Address;
  billing_address?: Address;
  shipping_address?: Address;
}

export interface Logo {
  url: string;
  filename?: string;
}

export interface BrandingConfig {
  theme_mode: 'light' | 'dark' | 'system';
  primary_color: string;
  secondary_color: string;
  company_logo_light?: Logo;
  company_logo_dark?: Logo;
  favicon?: Logo;
  default_font_style: string;
  custom_css?: string;
}

export interface LocalizationConfig {
  default_language: string;
  supported_languages: string[];
  default_timezone: string;
  date_format: string;
  time_format: '12h' | '24h' | '24-hour';
  first_day_of_week: 'sunday' | 'monday';
  number_format: string;
  currency: string;
  measurement_system: 'metric' | 'imperial';
}

export interface TenantConfig {
  company_info: CompanyInfo;
  branding_config: BrandingConfig;
  localization_config: LocalizationConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Frontend form data interfaces
export interface GeneralFormData {
  companyName: string;
  contactEmail: string;
  contactPhone: string;
  taxId?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h' | '24-hour';
  firstDayOfWeek: 'sunday' | 'monday';
  currency: string;
  language: string;
}

export interface BrandingFormData {
  default_theme_mode: 'light' | 'dark' | 'system';
  primary_brand_color: string;
  secondary_brand_color: string;
  default_font_style: string;
  company_logo_light?: Logo;
  company_logo_dark?: Logo;
  favicon?: Logo;
}

// Helper function to get CSRF token from cookies
const getCsrfToken = (): string => {
  if (typeof document === 'undefined') return '';
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
  return cookieValue || '';
};

// Base API configuration
const api = axios.create({
  baseURL: getTenantApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'X-CSRFToken': getCsrfToken(),
  },
  withCredentials: true,
});

// Add a request interceptor to include the CSRF token
api.interceptors.request.use(config => {
  const token = getCsrfToken();
  if (token) {
    config.headers['X-CSRFToken'] = token;
  }
  return config;
});

// Map API response to frontend form data
export const mapFromApiFormat = (data: TenantConfig): GeneralFormData & BrandingFormData => {
  if (!data) {
    throw new Error('No data provided');
  }

  const { company_info, branding_config, localization_config } = data;
  
  return {
    // General Settings
    companyName: company_info?.name || '',
    contactEmail: company_info?.contact_email || '',
    contactPhone: company_info?.contact_phone || '',
    taxId: company_info?.tax_id || '',
    addressLine1: company_info?.registered_address?.street_address || '',
    addressLine2: company_info?.registered_address?.street_address2 || '',
    city: company_info?.registered_address?.city || '',
    state: company_info?.registered_address?.state || '',
    postalCode: company_info?.registered_address?.postal_code || '',
    country: company_info?.registered_address?.country || '',
    timezone: company_info?.timezone || 'UTC',
    dateFormat: company_info?.date_format || 'yyyy-MM-dd',
    timeFormat: company_info?.time_format === '24-hour' ? '24h' : company_info?.time_format || '12h',
    firstDayOfWeek: company_info?.first_day_of_week || 'sunday',
    currency: company_info?.currency || 'USD',
    language: localization_config?.default_language || 'en',
    
    // Branding
    default_theme_mode: branding_config?.theme_mode || 'light',
    primary_brand_color: branding_config?.primary_color || '#1976d2',
    secondary_brand_color: branding_config?.secondary_color || '#9c27b0',
    default_font_style: branding_config?.default_font_style || 'Roboto',
    company_logo_light: branding_config?.company_logo_light,
    company_logo_dark: branding_config?.company_logo_dark,
    favicon: branding_config?.favicon,
  };
};

// Map frontend form data to API format
export const mapToApiFormat = (data: Partial<GeneralFormData & BrandingFormData>): Partial<TenantConfig> => {
  // Ensure we have non-null values for required fields
  const companyName = data.companyName || '';
  const contactEmail = data.contactEmail || '';
  const contactPhone = data.contactPhone || '';
  const timezone = data.timezone || 'UTC';
  const dateFormat = data.dateFormat || 'yyyy-MM-dd';
  const timeFormat = data.timeFormat === '24h' ? '24-hour' : data.timeFormat || '12h';
  const firstDayOfWeek = data.firstDayOfWeek || 'sunday';
  const currency = data.currency || 'USD';
  const language = data.language || 'en';
  
  return {
    company_info: {
      name: companyName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      tax_id: data.taxId,
      timezone,
      date_format: dateFormat,
      time_format: timeFormat,
      first_day_of_week: firstDayOfWeek,
      currency,
      locale: language,
      registered_address: {
        street_address: data.addressLine1 || '',
        street_address2: data.addressLine2,
        city: data.city || '',
        state: data.state || '',
        postal_code: data.postalCode || '',
        country: data.country || '',
      },
    },
    branding_config: {
      theme_mode: data.default_theme_mode || 'light',
      primary_color: data.primary_brand_color || '#1976d2',
      secondary_color: data.secondary_brand_color || '#9c27b0',
      default_font_style: data.default_font_style || 'Roboto',
      company_logo_light: data.company_logo_light,
      company_logo_dark: data.company_logo_dark,
      favicon: data.favicon,
    },
    localization_config: {
      default_language: language,
      supported_languages: [language],
      default_timezone: timezone,
      date_format: dateFormat,
      time_format: timeFormat,
      first_day_of_week: firstDayOfWeek,
      currency,
      number_format: '1,234.56',
      measurement_system: 'metric',
    },
  };
};

// Fetch tenant configuration
export const getTenantConfig = async (): Promise<TenantConfig> => {
  try {
    const response = await api.get<TenantConfig>('/tenant-admin/tenant-config/');
    return response.data;
  } catch (error) {
    console.error('Error fetching tenant config:', error);
    // Return default config if API fails
    return {
      company_info: {
        name: '',
        contact_email: '',
        contact_phone: '',
        timezone: 'UTC',
        date_format: 'yyyy-MM-dd',
        time_format: '12h',
        first_day_of_week: 'sunday',
        currency: 'USD',
        locale: 'en',
        registered_address: {
          street_address: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
        },
      },
      branding_config: {
        theme_mode: 'light',
        primary_color: '#1976d2',
        secondary_color: '#9c27b0',
        default_font_style: 'Roboto',
      },
      localization_config: {
        default_language: 'en',
        supported_languages: ['en'],
        default_timezone: 'UTC',
        date_format: 'yyyy-MM-dd',
        time_format: '12h',
        first_day_of_week: 'sunday',
        currency: 'USD',
        number_format: '1,234.56',
        measurement_system: 'metric',
      },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
};


// Save tenant configuration
export const saveTenantConfig = async (data: Partial<TenantConfig>): Promise<void> => {
  try {
    console.log('Saving tenant config with data:', data);
    const response = await api.post('/tenant-admin/tenant-config/', data, {
      headers: getAuthHeaders()
    });
    console.log('Save successful:', response.data);
  } catch (error) {
    console.error('Error saving tenant config:', error);
    if (axios.isAxiosError(error)) {
      console.error('Error response:', error.response?.data);
    }
    throw error;
  }
};
export default {
  getTenantConfig,
  saveTenantConfig,
  mapFromApiFormat,
  mapToApiFormat
};
