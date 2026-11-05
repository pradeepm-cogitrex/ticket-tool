/** super_admin sees everything and manages masters; admin sees their client products; employee works their own tickets. */
export type UserRole = 'super_admin' | 'admin' | 'employee';

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super admin',
  admin: 'Admin',
  employee: 'Employee',
};

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: SessionUser;
}
