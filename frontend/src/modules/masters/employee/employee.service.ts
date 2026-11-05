import { apiService } from '@/shared/services/api.service';
import { createCrudService } from '@/shared/services/crud.service';
import type { Employee, EmployeePayload, EmployeeQuery, OrganizationEmployees } from './employee.types';

const BASE = '/masters/employees';

export const employeeService = {
  ...createCrudService<Employee, EmployeePayload, EmployeeQuery>(BASE),
  /** Each organization with its employees in role-priority order. */
  byOrganization: () => apiService.get<OrganizationEmployees>(`${BASE}/by-organization`),
};
