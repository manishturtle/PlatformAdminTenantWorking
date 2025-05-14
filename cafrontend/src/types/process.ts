export type ProcessAudience = 'Individual' | 'Company';
export type ProcessStatus = 'Active' | 'Inactive';

export interface Process {
  ProcessId: number;
  ClientId: number;
  CompanyId: number;
  ProcessName: string;
  Description: string | null;
  ProcessAudience: ProcessAudience;
  Status: ProcessStatus;
  CreatedAt: string;
  CreatedBy: string | null;
  UpdatedAt: string;
  UpdatedBy: string | null;
}

export interface ProcessFormData {
  ProcessName: string;
  Description: string;
  ProcessAudience: ProcessAudience;
  Status: ProcessStatus;
}

export interface ProcessListResponse {
  count: number;
  next: boolean;
  previous: boolean;
  results: Process[];
}
