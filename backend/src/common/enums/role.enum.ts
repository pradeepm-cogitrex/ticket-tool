/**
 * super_admin: sees every client and product, manages the masters.
 * admin:       sees every ticket of the client-products they are mapped to, and can reopen closed tickets.
 * employee:    works on the tickets of the client-products they are mapped to; their dashboard shows their own work.
 */
export enum Role {
  SuperAdmin = 'super_admin',
  Admin = 'admin',
  Employee = 'employee',
}

/** admin or super admin */
export const isAdminRole = (role: Role): boolean => role === Role.SuperAdmin || role === Role.Admin;
