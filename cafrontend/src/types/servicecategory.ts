import { SOP } from './sop';

// Base interface for service category data
export interface ServiceCategoryBase {
  servicecategoryid: number;
  servicecategoryname: string;
  Status?: string;
}

// Extended interface with optional fields for full model
export interface ServiceCategory extends ServiceCategoryBase {
  sopid?: number;
  status?: string;
  clientid?: number;
  companyid?: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  sop_details?: SOP;
}

export interface ServiceCategoryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceCategory[];
}
