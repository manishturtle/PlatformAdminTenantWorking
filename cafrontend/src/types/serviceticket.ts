export interface ServiceTicketFormData {
  customerid: number;
  servicecategoryid: number;
  serviceagentid?: number | null;
  serviceticketsubject: string;
  serviceticketdesc: string;
  targetclosuredate: string;
  status?: string;
}

export interface ServiceTicket {
  serviceticketid: number;
  clientid: number;
  companyid: number;
  customerid: number;
  servicecategoryid: number;
  serviceagentid: number | null;
  serviceticketdesc: string;
  serviceticketsubject: string;
  targetclosuredate: string;
  creationdate: string;
  status: string;
  customer?: {
    CustomerID: number;
    FirstName: string;
    LastName: string;
  };
  servicecategory?: {
    servicecategoryid: number;
    servicecategoryname: string;
  };
  serviceagent?: {
    serviceagentid: number;
    firstname: string;
    lastname: string;
  };
  tasks?: Array<{
    ServiceTicketTaskId: number;
    TaskName: string;
    Sequence: number;
    TaskStatus: string;
    TaskServiceAgent: number | null;
    agent_name?: string;
    step_name?: string;
  }>;
  createdby: string;
  createdat: string;
  updatedat: string;
  updatedby: string;
}

export interface ServiceTicketFilters {
  search?: string;
  customerid?: number;
  servicecategoryid?: number;
  serviceagentid?: number;
  creation_date_start?: string;
  creation_date_end?: string;
  target_date_start?: string;
  target_date_end?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface ServiceTicketListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceTicket[];
}
