import type { UserRole } from '@/modules/auth/auth.types';
import type { BaseRecord, MasterListQuery } from '@/shared/types/common.types';

export const MAX_ROLE_PRIORITY = 9;

/** A client product the employee works on (e.g. HRMS for Sakku), with their role priority there. 1 = most senior. */
export interface EmployeeAssignment {
  id: number;
  clientId: number;
  client: { id: number; name: string; code: string; isActive: boolean };
  productId: number;
  product: { id: number; name: string; code: string; isActive: boolean };
  rolePriority: number;
}

export interface Employee extends BaseRecord {
  name: string;
  email: string;
  mobile: string | null;
  role: UserRole;
  assignments: EmployeeAssignment[];
  isActive: boolean;
  lastLoginAt: string | null;
  openTickets?: number;
}

export interface AssignmentInput {
  clientId: number;
  productId: number;
  rolePriority: number;
}

export interface EmployeePayload {
  name: string;
  email: string;
  mobile: string | null;
  /** required on create; leave out on edit to keep the current password */
  password?: string;
  role: UserRole;
  assignments: AssignmentInput[];
  isActive: boolean;
}

export interface EmployeeQuery extends MasterListQuery {
  role?: UserRole;
  clientId?: number;
  productId?: number;
}

export interface OrganizationMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  rolePriority: number;
  openTickets: number;
}

/** One client product with the employees working on it. */
export interface OrganizationGroup {
  /** client product id */
  id: number;
  clientId: number;
  productId: number;
  client: { id: number; code: string; name: string };
  product: { id: number; code: string; name: string };
  isActive: boolean;
  employees: OrganizationMember[];
}

export interface OrganizationEmployees {
  organizations: OrganizationGroup[];
  unmapped: Omit<OrganizationMember, 'rolePriority'>[];
}
