/**
 * API Constants
 * This file contains all API related constants used throughout the application
 */

// Base URL for API requests
export const API_BASE_URL = "http://localhost:8000";

// Platform Admin API endpoints
export const PLATFORM_ADMIN_API = {
  TENANTS: `${API_BASE_URL}/platform-admin/api/tenants/`,
  CRM_CLIENTS: `${API_BASE_URL}/platform-admin/api/crmclients/`,
  USERS: `${API_BASE_URL}/platform-admin/api/users/`,
  SETTINGS: `${API_BASE_URL}/platform-admin/api/settings/`,
};

// Tenant Admin API endpoints
export const TENANT_ADMIN_API = {
  USERS: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/tenant-admin/api/users/`,
  SETTINGS: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/tenant-admin/api/settings/`,
  DASHBOARD: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/tenant-admin/api/dashboard/`,
};

// User API endpoints
export const USER_API = {
  PROFILE: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/api/user/profile/`,
  DASHBOARD: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/api/user/dashboard/`,
};

// Authentication API endpoints
export const AUTH_API = {
  LOGIN: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/api/auth/login/`,
  LOGOUT: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/api/auth/logout/`,
  PLATFORM_LOGIN: `${API_BASE_URL}/platform-admin/api/auth/login/`,
  PLATFORM_LOGOUT: `${API_BASE_URL}/platform-admin/api/auth/logout/`,
  CHECK_USER: (tenantSlug: string) =>
    `${API_BASE_URL}/${tenantSlug}/api/auth/check-user/`,
};
