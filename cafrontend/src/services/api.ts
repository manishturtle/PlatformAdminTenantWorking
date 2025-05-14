// Re-export API services from their dedicated files
export { customerApi } from './api/customerApi';
export { serviceCategoryApi } from './api/serviceCategoryApi';
export { serviceAgentApi } from './api/serviceAgentApi';
export { serviceTicketApi } from './api/serviceTicketApi';
export { documentTypeApi } from './api/documentTypeApi';
export { credentialTypeApi } from './api/credentialTypeApi';
export { processApi } from './api/processApi';
export { sopApi } from './api/sopApi';
export { default as documentApi } from './api/documentApi';

// Export the axios instance for direct use if needed
export { default as apiClient } from './api/axiosInstance';
