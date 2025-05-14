import { ServiceTicket } from './serviceticket';
import { ServiceAgent } from './serviceagent';
import { SOPStep } from './sop';

export interface ServiceTicketTask {
  ServiceTicketTaskId: number;
  Client_Id: number;
  Company_Id: number;
  ServiceTicketId: number | ServiceTicket;
  SOPStepID: number | SOPStep | null;
  Sequence: number;
  TaskName: string;
  TaskServiceAgent: number | ServiceAgent | null;
  TaskStartDate: string | null;
  TaskClosureDate: string | null;
  TaskStatus: 'New' | 'Assigned' | 'InProgress' | 'Closed';
  Createdat: string;
  Createdby: string;
  Updatedat: string;
  Updatedby: string | null;
  
  // Nested data from serializer
  agent_details?: ServiceAgent;
  agent_name?: string;
  sop_step_details?: SOPStep;
  step_name?: string;
}

export interface ServiceTicketTaskListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ServiceTicketTask[];
}

export interface ServiceTicketTaskFormData {
  ServiceTicketId: number;
  SOPStepID?: number | null;
  Sequence?: number;
  TaskName: string;
  TaskServiceAgent?: number | null;
  TaskStartDate?: string | null;
  TaskClosureDate?: string | null;
  TaskStatus?: 'New' | 'Assigned' | 'InProgress' | 'Closed';
}
