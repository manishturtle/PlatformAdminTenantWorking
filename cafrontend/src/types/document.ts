export interface DocumentType {
  DocumentTypeId: number;
  DocumentTypeName: string;
  DocumentType: string;
  Status: 'Active' | 'Inactive';
  CreatedAt?: string;
  CreatedBy?: string;
  UpdatedAt?: string;
  UpdatedBy?: string;
}

export interface DocumentTypeListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DocumentType[];
}

export interface DocumentTypeFilters {
  page?: number;
  page_size?: number;
  include_inactive?: boolean;
  search?: string;
}

export interface Document {
  DocumentId: number;
  CustomerId: number;
  DocumentTypeId: number;
  DocumentTypeName?: string;
  document_type_name?: string; // From API response
  DocumentName: string;
  UserDocuName?: string; // User-friendly document name
  OriginalName: string;
  FilePath: string;
  DocumentStatus: string;
  VisibleToCust: boolean;
  Version: number;
  VersionDate: string;
  CreatedAt: string;
  CreatedBy: string;
  UpdatedAt: string;
  UpdatedBy: string;
}

export interface DocumentListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Document[];
}

export interface DocumentFilters {
  customer_id?: number;
  page?: number;
  page_size?: number;
}
