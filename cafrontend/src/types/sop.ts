import { Process } from './process';

export interface SOP {
  SOPId: number;
  SOPName: string;
  SOPDescription?: string;
  Status: 'active' | 'inactive';
  ClientId: number;
  CompanyId: number;
  CreatedAt?: string;
  UpdatedAt?: string;
  CreatedBy?: string;
  UpdatedBy?: string;
}

export interface SOPFormData {
  SOPName: string;
  Description: string;
  VersionEffectiveDate: string | null;
  Status: 'Active' | 'Inactive';
  ProcessId?: number; // Optional for updates, required for creation
}

export interface SOPListResponse {
  count: number;
  next: boolean;
  previous: boolean;
  results: SOP[];
}

export interface SOPStep {
  StepId: number;
  SOPId: number;
  sop: SOP;
  Sequence: number; // Added Sequence field
  StepName: string;
  Comments: string | null;
  Prerequisites: string | null;
  Postrequisites: string | null;
  DocumentPath: string | null;
  OriginalFileName: string | null;
  FileName: string | null;
  URL: string | null;
  Duration: number;
  CreatedAt: string;
  CreatedBy: string | null;
  UpdatedAt: string;
  UpdatedBy: string | null;
}

export interface SOPStepFormData {
  Sequence: number; // Added Sequence field
  StepName: string;
  Comments: string;
  Prerequisites: string;
  Postrequisites: string;
  Duration: number;
  URL: string;
  document?: File;
  SOPId?: number; // Added SOPId field for updates
}

export interface SOPStepListResponse {
  count: number;
  next: boolean;
  previous: boolean;
  results: SOPStep[];
}
