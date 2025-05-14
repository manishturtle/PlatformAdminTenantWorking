import { ServiceCategory } from './servicecategory';

export type ServiceAgent = {
  serviceagentid: number;
  clientid: number;
  companyid: number;
  serviceagentname: string;
  emailid?: string;
  password?: string;
  allowportalaccess: boolean;
  status: 'Active' | 'Inactive';
  created_at?: string;
  updated_at?: string;
  created_by: string;
  updated_by?: string;
  expertat: Array<ServiceCategory | number>;
  expert_at_names?: string[];
}

export interface ServiceAgentFormData {
  serviceagentname: string;
  emailid: string;
  password: string;
  allowportalaccess: boolean;
  expertat: number[];
  status: 'Active' | 'Inactive';
}

export interface ServiceAgentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceAgent[];
}
