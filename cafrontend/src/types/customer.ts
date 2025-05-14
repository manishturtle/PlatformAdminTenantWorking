export interface ServiceAgent {
  serviceagentid: number;
  serviceagentname: string;
  emailid: string;
  expertat?: number[];
  expert_categories?: Array<{
    servicecategoryid: number;
    servicecategoryname: string;
  }>;
}

export interface Customer {
  CustomerID: number;
  ClientId: number;
  CompanyId: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Phone: string;
  AadharCard: string;
  PANCard: string;
  Password?: string;
  AllowPortalAccess: boolean;
  EmailVerified: boolean;
  MobileVerified: boolean;
  Source: string;
  CustomerType: string;
  ReferredBy?: string;
  ChannelPartner?: string;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
  account_owner?: ServiceAgent;
  account_owner_id?: number;
}

export interface CustomerListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Customer[];
}

export interface CustomerFilters {
  search?: string;
  customer_type?: string;
  source?: string;
  page?: number;
  page_size?: number;
}

export const CUSTOMER_TYPE_OPTIONS = [
  { value: 'Lead', label: 'Lead' },
  { value: 'Disqualified Lead', label: 'Disqualified Lead' },
  { value: 'New', label: 'New' },
  { value: 'Active', label: 'Active' },
  { value: 'Dormant', label: 'Dormant' },
];

export const SOURCE_OPTIONS = [
  { value: 'Existing', label: 'Existing' },
  { value: 'Referral', label: 'Referral' },
  { value: 'Google Ads', label: 'Google Ads' },
  { value: 'Website', label: 'Website' },
  { value: 'Online Portal', label: 'Online Portal' },
  { value: 'Channel Partner/Relative', label: 'Channel Partner/Relative' },
  { value: 'Others', label: 'Others' },
];
