// Type definitions for credential-related data

export interface CredentialType {
  CredentialTypeId: number;
  ClientId: number;
  CompanyId: number;
  CredentialTypeName: string;
  URL?: string | null;
  Status: 'Active' | 'Inactive';
  CreatedAt: string;
  CreatedBy: string | null;
  UpdatedAt: string;
  UpdatedBy: string | null;
}

export interface CredentialTypeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: CredentialType[];
}

export interface CredentialTypeFormData {
  CredentialTypeName: string;
  URL?: string | null;
  Status: 'Active' | 'Inactive';
}

export interface Credential {
  CredentialId: number;
  ClientId: number;
  CompanyId: number;
  CustomerId: number;
  CredentialTypeId: number;
  credential_type_name: string;
  credential_type_url?: string | null;
  UserName: string;
  Password: string;
  EmailOTP?: string | null;
  MobileOTP?: string | null;
  CreatedAt: string;
  CreatedBy: string | null;
  UpdatedAt: string;
  UpdatedBy: string | null;
}

export interface CredentialListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Credential[];
}

export interface CredentialFormData {
  ClientId: number;
  CompanyId: number;
  CredentialTypeId: number | string; // Can be a number or string from form input
  UserName: string;
  Password: string;
  EmailOTP?: string;
  MobileOTP?: string;
  //CustomerId: number;
}
