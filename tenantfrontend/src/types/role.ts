/**
 * Role type definition
 */
export interface Role {
  id: number;
  name: string;
  description: string;
}

/**
 * API response format for roles
 */
export interface RolesResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Role[];
}
